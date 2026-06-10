/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   chartAssemble.ts                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/10 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── chartAssemble — order, cap, hide, accumulate a pre-aggregated matrix ───
// Shared by the client engine and the server (op=aggregate) path so both
// produce byte-identical ChartResults for the same matrix.

import type {
  AggregatedMatrix, AssembleOptions, ChartCategory, ChartResult, ChartSeriesDef,
} from './chartTypes';
import {
  MAX_GROUPS, MAX_SUBGROUPS, OVERFLOW_KEY, OVERFLOW_LABEL, VALUE_SERIES_KEY,
} from './chartTypes';

/** Materializes matrix categories into plain objects with totals. */
function toCategoryArray(matrix: AggregatedMatrix): ChartCategory[] {
  const out: ChartCategory[] = [];
  for (const cat of matrix.categories.values()) {
    const values: Record<string, number> = {};
    const pageIds: Record<string, string[]> = {};
    let total = 0;
    for (const [k, v] of cat.values) {
      values[k] = v;
      total += v;
    }
    for (const [k, ids] of cat.pageIds) pageIds[k] = ids;
    out.push({ key: cat.key, label: cat.label, color: cat.color, values, pageIds, total });
  }
  return out;
}

/**
 * Orders categories: 'manual' follows manualGroupOrder (unlisted keep
 * insertion order at the end); asc/desc compare numerically when both labels
 * are numbers, by key for date axes (chronological), else locale-aware.
 */
function orderCategories(
  cats: ChartCategory[],
  opts: AssembleOptions,
  isDateAxis: boolean,
): ChartCategory[] {
  const sort = opts.sort ?? 'manual';
  if (sort === 'manual') {
    const order = opts.manualGroupOrder ?? [];
    if (order.length === 0) return cats;
    const rank = new Map(order.map((k, i) => [k, i]));
    return [...cats].sort((a, b) =>
      (rank.get(a.key) ?? rank.size) - (rank.get(b.key) ?? rank.size));
  }
  const dir = sort === 'descending' ? -1 : 1;
  return [...cats].sort((a, b) => {
    if (isDateAxis) return a.key < b.key ? -dir : a.key > b.key ? dir : 0;
    const na = Number(a.label);
    const nb = Number(b.label);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return (na - nb) * dir;
    return a.label.localeCompare(b.label) * dir;
  });
}

/**
 * Enforces the Notion caps (200 groups / 50 subgroups): keeps the most
 * significant entries by total, folds the rest into a trailing "Other".
 */
function applyCaps(cats: ChartCategory[], series: ChartSeriesDef[]): {
  cats: ChartCategory[]; series: ChartSeriesDef[];
  truncatedGroups: boolean; truncatedSeries: boolean;
} {
  let truncatedGroups = false;
  let truncatedSeries = false;
  if (series.length > MAX_SUBGROUPS) {
    truncatedSeries = true;
    const totals = new Map(series.map(s => [s.key,
      cats.reduce((sum, c) => sum + (c.values[s.key] ?? 0), 0)]));
    const kept = [...series].sort((a, b) => (totals.get(b.key)! - totals.get(a.key)!))
      .slice(0, MAX_SUBGROUPS - 1);
    const keptKeys = new Set(kept.map(s => s.key));
    for (const cat of cats) {
      let other = 0;
      const otherIds: string[] = [];
      for (const s of series) {
        if (keptKeys.has(s.key)) continue;
        other += cat.values[s.key] ?? 0;
        otherIds.push(...(cat.pageIds[s.key] ?? []));
        delete cat.values[s.key];
        delete cat.pageIds[s.key];
      }
      if (other !== 0 || otherIds.length > 0) {
        cat.values[OVERFLOW_KEY] = (cat.values[OVERFLOW_KEY] ?? 0) + other;
        cat.pageIds[OVERFLOW_KEY] = [...(cat.pageIds[OVERFLOW_KEY] ?? []), ...otherIds];
      }
    }
    series = series.filter(s => keptKeys.has(s.key));
    series.push({ key: OVERFLOW_KEY, label: OVERFLOW_LABEL, color: '' });
  }
  if (cats.length > MAX_GROUPS) {
    truncatedGroups = true;
    const ranked = [...cats].sort((a, b) => b.total - a.total).slice(0, MAX_GROUPS - 1);
    const keptKeys = new Set(ranked.map(c => c.key));
    const overflow: ChartCategory = {
      key: OVERFLOW_KEY, label: OVERFLOW_LABEL, color: '',
      values: {}, pageIds: {}, total: 0,
    };
    for (const cat of cats) {
      if (keptKeys.has(cat.key)) continue;
      for (const [k, v] of Object.entries(cat.values)) {
        overflow.values[k] = (overflow.values[k] ?? 0) + v;
      }
      for (const [k, ids] of Object.entries(cat.pageIds)) {
        overflow.pageIds[k] = [...(overflow.pageIds[k] ?? []), ...ids];
      }
      overflow.total += cat.total;
    }
    cats = cats.filter(c => keptKeys.has(c.key));
    cats.push(overflow);
  }
  return { cats, series, truncatedGroups, truncatedSeries };
}

/** Replaces per-series values with running totals across ordered categories. */
function applyCumulative(cats: ChartCategory[], series: ChartSeriesDef[]): void {
  for (const s of series) {
    let running = 0;
    for (const cat of cats) {
      running += cat.values[s.key] ?? 0;
      cat.values[s.key] = running;
    }
  }
  for (const cat of cats) {
    cat.total = series.reduce((sum, s) => sum + (cat.values[s.key] ?? 0), 0);
  }
}

/**
 * Full assemble pipeline: order → omit-zero → caps → visibility → cumulative.
 * Visibility (legend toggles) hides series when there is a breakdown and
 * whole categories otherwise — Notion's legend semantics.
 */
export function assembleChartResult(
  matrix: AggregatedMatrix,
  opts: AssembleOptions,
): ChartResult {
  let cats = orderCategories(toCategoryArray(matrix), opts, matrix.isDateAxis);
  if (opts.omitZero) cats = cats.filter(c => c.total !== 0);
  let series: ChartSeriesDef[] = [...matrix.seriesMeta.entries()]
    .map(([key, m]) => ({ key, label: m.label, color: m.color }));
  const capped = applyCaps(cats, series);
  ({ cats, series } = capped);

  const hidden = new Set(opts.hiddenGroups ?? []);
  if (hidden.size > 0) {
    const isBreakdown = !(series.length === 1 && series[0].key === VALUE_SERIES_KEY);
    if (isBreakdown) {
      series = series.filter(s => !hidden.has(s.key) && !hidden.has(s.label));
      for (const cat of cats) {
        cat.total = series.reduce((sum, s) => sum + (cat.values[s.key] ?? 0), 0);
      }
    } else {
      cats = cats.filter(c => !hidden.has(c.key) && !hidden.has(c.label));
    }
  }

  const total = cats.reduce((sum, c) => sum + c.total, 0);
  if (opts.cumulative) applyCumulative(cats, series);
  return {
    categories: cats, series, total,
    truncatedGroups: capped.truncatedGroups,
    truncatedSeries: capped.truncatedSeries,
  };
}
