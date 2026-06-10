/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useServerChartData.ts                              :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/10 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── useServerChartData — server-truth chart numbers for live mounts ────────
// Charts over `baas:` mounts aggregate ONLY the adapter's first 200 loaded
// rows when computed client-side — silently wrong on big tables. When the
// engine supports op=aggregate (capability-gated, postgres today), this hook
// computes the real numbers server-side and runs the SAME assemble stage as
// the client engine, so sorting/caps/visibility behave identically.
// Falls back to the client result for: local DBs, engines without aggregate,
// date bucketing (no server date_trunc), median, filtered views, and errors.

import { useEffect, useMemo, useState } from 'react';
import type { SchemaProperty, ViewConfig, ViewSettings } from '../../../types/database';
import { useChartData } from './useChartData';
import { assembleChartResult } from '../../../lib/chart/chartAssemble';
import type {
  AggregatedMatrix, ChartPageLike, ChartResult, ChartSortMode, GroupKey,
} from '../../../lib/chart/chartTypes';
import { NONE_KEY, VALUE_SERIES_KEY } from '../../../lib/chart/chartTypes';
import { parseLiveDatabaseId } from '../../../store/live/liveTypes';
import { getLiveSchema } from '../../../store/live/liveMountClient';
import { aggregateMatrix } from '../../../store/live/liveAggregateClient';
import type { AggregateMatrixCell, LiveAggregateFunc } from '../../../store/live/liveAggregateClient';

const SERVER_AGG: Record<string, LiveAggregateFunc> = {
  count: 'count', sum: 'sum', average: 'avg', min: 'min', max: 'max',
};
/** Scalar column types safe to GROUP BY server-side (no arrays, no dates). */
const SCALAR_GROUP_TYPES = ['select', 'status', 'checkbox', 'text', 'number', 'url', 'email', 'phone', 'id'];

interface ServerPlan {
  func: LiveAggregateFunc;
  valueColumn?: string;
  xColumn: string;
  subColumn?: string;
}

/** Decides whether the chart can be served by op=aggregate (sync checks). */
function buildServerPlan(
  view: ViewConfig | null,
  database: { properties: Record<string, SchemaProperty> } | null,
  settings: ViewSettings,
): ServerPlan | null {
  if (!view || !database || !parseLiveDatabaseId(view.databaseId)) return null;
  if ((view.filters?.length ?? 0) > 0) return null; // filter push-down: future work
  const xProp = settings.xAxisProperty ? database.properties[settings.xAxisProperty] : undefined;
  if (!xProp || !SCALAR_GROUP_TYPES.includes(xProp.type)) return null;
  const yProp = settings.yAxisProperty ? database.properties[settings.yAxisProperty] : undefined;
  const aggregation = yProp ? (settings.yAxisAggregation ?? 'sum') : 'count';
  const func = SERVER_AGG[aggregation];
  if (!func) return null; // median and friends stay client-side
  if (func !== 'count' && yProp?.type !== 'number') return null;
  const groupByProp = settings.yAxisGroupBy ? database.properties[settings.yAxisGroupBy] : undefined;
  if (settings.yAxisGroupBy && (!groupByProp || !SCALAR_GROUP_TYPES.includes(groupByProp.type))) return null;
  return {
    func,
    valueColumn: func === 'count' ? undefined : yProp?.id,
    xColumn: xProp.id,
    subColumn: groupByProp?.id,
  };
}

/** Maps a raw grouped column value to the engine's GroupKey conventions. */
function cellGroupKey(raw: string | null, prop: SchemaProperty | undefined): GroupKey {
  if (!prop) return { key: VALUE_SERIES_KEY, label: 'Value', color: '' };
  if (raw === null) return { key: NONE_KEY, label: `No ${prop.name}`, color: '' };
  if (prop.type === 'checkbox') {
    const checked = raw === 'true' || raw === '1' || raw === 't';
    return checked
      ? { key: 'checked', label: 'Checked', color: '' }
      : { key: 'unchecked', label: 'Unchecked', color: '' };
  }
  const opt = prop.options?.find(o => o.id === raw || o.value === raw);
  return opt
    ? { key: opt.id, label: opt.value, color: opt.color }
    : { key: raw, label: raw, color: '' };
}

/** Builds the shared AggregatedMatrix from server matrix cells. */
function matrixFromCells(
  cells: AggregateMatrixCell[],
  xProp: SchemaProperty | undefined,
  groupByProp: SchemaProperty | undefined,
): AggregatedMatrix {
  const categories: AggregatedMatrix['categories'] = new Map();
  const seriesMeta: AggregatedMatrix['seriesMeta'] = new Map();
  if (!groupByProp) seriesMeta.set(VALUE_SERIES_KEY, { label: 'Value', color: '' });
  for (const cell of cells) {
    const xg = cellGroupKey(cell.x, xProp);
    const sg = groupByProp
      ? cellGroupKey(cell.sub, groupByProp)
      : { key: VALUE_SERIES_KEY, label: 'Value', color: '' };
    if (!seriesMeta.has(sg.key)) seriesMeta.set(sg.key, { label: sg.label, color: sg.color });
    let cat = categories.get(xg.key);
    if (!cat) {
      cat = { key: xg.key, label: xg.label, color: xg.color, values: new Map(), pageIds: new Map() };
      categories.set(xg.key, cat);
    }
    cat.values.set(sg.key, (cat.values.get(sg.key) ?? 0) + cell.value);
  }
  return { categories, seriesMeta, isDateAxis: false };
}

/**
 * Chart data with the server-truth fast path. `pages` doubles as the refresh
 * signal: the live adapter replaces it on realtime events and 15s polls, so
 * aggregates re-run when the underlying table changes.
 */
export function useServerChartData(
  view: ViewConfig | null,
  database: { properties: Record<string, SchemaProperty> } | null,
  pages: readonly ChartPageLike[],
  settings: ViewSettings,
  labelResolver?: (propId: string, key: string) => string | undefined,
): { result: ChartResult; isServerTruth: boolean } {
  const clientResult = useChartData(database, pages, settings, labelResolver);
  const plan = useMemo(
    () => buildServerPlan(view, database, settings),
    [view, database, settings],
  );
  const requestKey = plan && view
    ? JSON.stringify({ id: view.databaseId, ...plan })
    : '';
  const [server, setServer] = useState<{ key: string; cells: AggregateMatrixCell[] } | null>(null);

  useEffect(() => {
    if (!requestKey || !view) { setServer(null); return; }
    const ref = parseLiveDatabaseId(view.databaseId);
    if (!ref || !plan) { setServer(null); return; }
    let alive = true;
    const timer = setTimeout(async () => {
      try {
        const schema = await getLiveSchema(ref.dbId);
        if (schema.capabilities?.aggregate !== true) { if (alive) setServer(null); return; }
        const cells = await aggregateMatrix({ dbId: ref.dbId, table: ref.table, ...plan });
        if (alive) setServer({ key: requestKey, cells });
      } catch {
        if (alive) setServer(null); // silent fallback to the client engine
      }
    }, 150); // coalesce realtime bursts
    return () => { alive = false; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey, pages]);

  const serverResult = useMemo(() => {
    if (!server || server.key !== requestKey || !database) return null;
    const xProp = settings.xAxisProperty ? database.properties[settings.xAxisProperty] : undefined;
    const groupByProp = settings.yAxisGroupBy ? database.properties[settings.yAxisGroupBy] : undefined;
    const matrix = matrixFromCells(server.cells, xProp, groupByProp);
    return assembleChartResult(matrix, {
      sort: settings.xAxisSort as ChartSortMode | undefined,
      omitZero: settings.xAxisOmitZero,
      cumulative: settings.yAxisCumulative,
      hiddenGroups: settings.hiddenGroups,
      manualGroupOrder: settings.manualGroupOrder,
    });
  }, [server, requestKey, database, settings]);

  return {
    result: serverResult ?? clientResult,
    isServerTruth: serverResult !== null,
  };
}
