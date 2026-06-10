/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   chartAggregate.ts                                  :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/10 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── chartAggregate — collects pages into a pre-aggregated value matrix ─────

import { aggregateNumbers } from '../../utils/aggregation';
import { resolveGroupKeys, seedGroups, noneGroup } from './chartKeys';
import { bucketDateKey, bucketLabel, resolveGranularity, toMs } from './chartBuckets';
import type {
  AggregatedMatrix, ChartAggregation, ChartCell, ChartEngineInput, GroupKey,
} from './chartTypes';
import { DATE_PROP_TYPES, VALUE_SERIES_KEY } from './chartTypes';

/** Intermediate collection: cells of raw samples, before aggregation. */
interface CollectedCells {
  categories: Map<string, { label: string; color: string; cells: Map<string, ChartCell> }>;
  seriesMeta: Map<string, { label: string; color: string }>;
  isDateAxis: boolean;
}

const VALUE_SERIES: GroupKey = { key: VALUE_SERIES_KEY, label: 'Value', color: '' };

/** Coerces a y-axis value to a number; strings parse, everything else skips. */
function numericValue(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && raw.trim() !== '' && !Number.isNaN(Number(raw))) {
    return Number(raw);
  }
  return null;
}

/** Date x-axis: one bucketed group per page value (or the None group). */
function dateGroups(
  input: ChartEngineInput,
  page: { properties: Record<string, unknown> },
  granularity: ReturnType<typeof resolveGranularity>,
): GroupKey[] {
  const ms = toMs(page.properties[input.xProp.id]);
  if (ms === null) return [noneGroup(input.xProp)];
  const key = bucketDateKey(ms, granularity);
  return [{ key, label: bucketLabel(key, granularity), color: '' }];
}

/**
 * Walks the pages once, distributing each into (x group × series) cells.
 * Select/status/checkbox x-axes are pre-seeded with all options so that
 * zero-valued groups exist (the "omit zero" toggle then has meaning).
 */
export function collectCells(input: ChartEngineInput): CollectedCells {
  const isDateAxis = DATE_PROP_TYPES.includes(input.xProp.type);
  const granularity = isDateAxis
    ? resolveGranularity(input.pages, input.xProp.id, input.dateBucket)
    : 'month';
  const categories: CollectedCells['categories'] = new Map();
  const seriesMeta: CollectedCells['seriesMeta'] = new Map();

  const ensureCategory = (g: GroupKey) => {
    let cat = categories.get(g.key);
    if (!cat) {
      cat = { label: g.label, color: g.color, cells: new Map() };
      categories.set(g.key, cat);
    }
    return cat;
  };

  if (!isDateAxis) seedGroups(input.xProp).forEach(ensureCategory);
  if (!input.groupByProp) seriesMeta.set(VALUE_SERIES.key, { label: VALUE_SERIES.label, color: '' });

  for (const page of input.pages) {
    const xGroups = isDateAxis
      ? dateGroups(input, page, granularity)
      : resolveGroupKeys(page, input.xProp, input.labelResolver);
    const sGroups = input.groupByProp
      ? resolveGroupKeys(page, input.groupByProp, input.labelResolver)
      : [VALUE_SERIES];
    const yNum = input.yProp ? numericValue(page.properties[input.yProp.id]) : null;

    for (const sg of sGroups) {
      if (!seriesMeta.has(sg.key)) seriesMeta.set(sg.key, { label: sg.label, color: sg.color });
    }
    for (const xg of xGroups) {
      const cat = ensureCategory(xg);
      for (const sg of sGroups) {
        let cell = cat.cells.get(sg.key);
        if (!cell) {
          cell = { nums: [], pageIds: [] };
          cat.cells.set(sg.key, cell);
        }
        cell.pageIds.push(page.id);
        if (yNum !== null) cell.nums.push(yNum);
      }
    }
  }

  return { categories, seriesMeta, isDateAxis };
}

/** Aggregates one cell: count counts pages, the rest run on numeric samples. */
export function applyAggregation(cell: ChartCell, aggregation: ChartAggregation): number {
  if (aggregation === 'count') return cell.pageIds.length;
  const stats = aggregateNumbers(cell.nums);
  return stats[aggregation];
}

/** Converts collected raw cells into the aggregated value matrix. */
export function aggregateCells(
  collected: CollectedCells,
  aggregation: ChartAggregation,
): AggregatedMatrix {
  const categories: AggregatedMatrix['categories'] = new Map();
  for (const [key, cat] of collected.categories) {
    const values = new Map<string, number>();
    const pageIds = new Map<string, string[]>();
    for (const [seriesKey, cell] of cat.cells) {
      values.set(seriesKey, applyAggregation(cell, aggregation));
      pageIds.set(seriesKey, cell.pageIds);
    }
    categories.set(key, { key, label: cat.label, color: cat.color, values, pageIds });
  }
  return { categories, seriesMeta: collected.seriesMeta, isDateAxis: collected.isDateAxis };
}
