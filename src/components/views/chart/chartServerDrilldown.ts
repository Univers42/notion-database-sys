/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   chartServerDrilldown.ts                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/10 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── chartServerDrilldown — fetches a clicked group's rows from the mount ───
// Server-truth charts have no client page ids; clicking a bar lists the
// underlying rows via op=list with an equality filter on the grouped columns.

import type { SchemaProperty, ViewConfig, ViewSettings, Page } from '../../../types/database';
import type { ChartResult } from '../../../lib/chart/chartTypes';
import { NONE_KEY, OVERFLOW_KEY, VALUE_SERIES_KEY } from '../../../lib/chart/chartTypes';
import { getLiveSchema, listLiveRows } from '../../../store/live/liveMountClient';
import { parseLiveDatabaseId, formatLivePageId } from '../../../store/live/liveTypes';
import type { DrilldownTarget, DrilldownPage } from './ChartDrilldown';

/** Raw column value for an engine group key (checkbox keys → booleans). */
function rawValueForKey(key: string, prop: SchemaProperty | undefined): unknown {
  if (prop?.type === 'checkbox') return key === 'checked';
  const opt = prop?.options?.find(o => o.id === key);
  return opt ? opt.id : key;
}

/**
 * Lists up to `limit` rows behind one chart cell. Rows already loaded in the
 * store stay openable (their live page id resolves); the rest are read-only.
 */
export async function fetchServerDrilldownRows(args: {
  view: ViewConfig;
  database: { properties: Record<string, SchemaProperty> };
  settings: ViewSettings;
  result: ChartResult;
  target: DrilldownTarget;
  storePages: Record<string, Page>;
  limit?: number;
}): Promise<DrilldownPage[]> {
  const { view, database, settings, result, target, storePages } = args;
  const ref = parseLiveDatabaseId(view.databaseId);
  const category = result.categories[target.categoryIndex];
  if (!ref || !category) return [];
  if (category.key === NONE_KEY || category.key === OVERFLOW_KEY) return [];
  if (!settings.xAxisProperty) return [];

  const xProp = database.properties[settings.xAxisProperty];
  const filter: Record<string, unknown> = {
    [settings.xAxisProperty]: rawValueForKey(category.key, xProp),
  };
  if (settings.yAxisGroupBy
    && target.seriesKey !== VALUE_SERIES_KEY && target.seriesKey !== OVERFLOW_KEY
    && target.seriesKey !== NONE_KEY) {
    filter[settings.yAxisGroupBy] = rawValueForKey(target.seriesKey, database.properties[settings.yAxisGroupBy]);
  }

  const [schema, response] = await Promise.all([
    getLiveSchema(ref.dbId),
    listLiveRows(ref.dbId, ref.table, { filter, limit: args.limit ?? 50 }),
  ]);
  const pkColumn = schema.tables.find(t => t.name === ref.table)?.primary_key[0];
  const titleColumn = Object.values(database.properties).find(p => p.type === 'title')?.id;

  return response.rows.map((row, i) => {
    const pk = pkColumn != null ? row[pkColumn] : undefined;
    const id = pk !== undefined && pk !== null
      ? formatLivePageId(ref, String(pk))
      : `live-row:${i}`;
    const title = titleColumn != null && row[titleColumn] != null
      ? String(row[titleColumn])
      : (pk !== undefined && pk !== null ? `#${String(pk)}` : 'Row');
    return { id, title, openable: Boolean(storePages[id]) };
  });
}
