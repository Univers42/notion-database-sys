/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   dashboardAggregates.ts                             :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/10/26 08:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/10/26 08:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * What the preset and auto-detect dashboards show, computed in one pass over
 * the records and kept per property. Free of React so it unit-tests.
 * Checkbox totals used to be summed across every checkbox column, and a count
 * over a checkbox returned every record: a "Featured" tile read 300 for 60.
 */

import type { DashboardWidget, SchemaProperty } from '../../../types/database';

export interface CheckboxCount {
  checked: number;
  unchecked: number;
}

export interface ComputedData {
  numberAggs: Record<string, { sum: number; count: number; min: number; max: number }>;
  selectCounts: Record<string, Record<string, { count: number; color: string; label: string }>>;
  checkboxCounts: Record<string, CheckboxCount>;
  recentCount: number;
}

export type AggProperty = { id: string; type: string; name: string; options?: { id: string; value: string; color: string }[] };

/** What a stat tile measures; picks its icon and colour. */
export type StatKind = 'count' | 'checked' | 'sum' | 'average' | 'min' | 'max' | 'distinct';

function addNumber(aggs: ComputedData['numberAggs'], id: string, value: number): void {
  const agg = aggs[id] ?? (aggs[id] = { sum: 0, count: 0, min: Infinity, max: -Infinity });
  agg.sum += value;
  agg.count++;
  agg.min = Math.min(agg.min, value);
  agg.max = Math.max(agg.max, value);
}

function addOption(counts: ComputedData['selectCounts'], prop: AggProperty, value: unknown): void {
  const byLabel = counts[prop.id] ?? (counts[prop.id] = {});
  const option = prop.options?.find(o => o.id === value);
  const label = option?.value || String(value);
  const entry = byLabel[label] ?? (byLabel[label] = { count: 0, color: option?.color || '', label });
  entry.count++;
}

export function aggregatePages(
  pages: { properties: Record<string, unknown> }[],
  allProps: AggProperty[],
): Omit<ComputedData, 'recentCount'> {
  const numberAggs: ComputedData['numberAggs'] = {};
  const selectCounts: ComputedData['selectCounts'] = {};
  const checkboxCounts: ComputedData['checkboxCounts'] = {};
  for (const prop of allProps) {
    if (prop.type === 'checkbox') checkboxCounts[prop.id] = { checked: 0, unchecked: 0 };
  }
  for (const page of pages) {
    for (const prop of allProps) {
      const value = page.properties[prop.id];
      if (prop.type === 'checkbox') {
        if (value) checkboxCounts[prop.id].checked++;
        else checkboxCounts[prop.id].unchecked++;
      } else if (prop.type === 'number' && typeof value === 'number' && Number.isFinite(value)) {
        addNumber(numberAggs, prop.id, value);
      } else if ((prop.type === 'select' || prop.type === 'status') && value) {
        addOption(selectCounts, prop, value);
      }
    }
  }
  return { numberAggs, selectCounts, checkboxCounts };
}

export function statKind(prop: SchemaProperty | null, widget: DashboardWidget): StatKind {
  if (prop?.type === 'checkbox') return 'checked';
  if (!widget.propertyId || widget.aggregation === 'count') return 'count';
  if (prop?.type === 'select' || prop?.type === 'status') return 'distinct';
  return widget.aggregation ?? 'sum';
}

function percentOf(part: number, total: number): string {
  return `${total > 0 ? Math.round((part / total) * 100) : 0}% of ${total} records`;
}

/** The value and subline of a stat widget over `total` records. */
export function resolveStatValue(prop: SchemaProperty | null, data: ComputedData, widget: DashboardWidget, total: number) {
  const kind = statKind(prop, widget);
  if (kind === 'checked' && prop) {
    const counts = data.checkboxCounts[prop.id] ?? { checked: 0, unchecked: 0 };
    return { value: counts.checked, subtext: percentOf(counts.checked, total) };
  }
  if (kind === 'count') return { value: total, subtext: '' };
  if (kind === 'distinct' && prop) {
    return { value: Object.keys(data.selectCounts[prop.id] ?? {}).length, subtext: 'distinct values' };
  }
  const agg = prop ? data.numberAggs[prop.id] : undefined;
  if (!agg) return { value: 0, subtext: '' };
  switch (kind) {
    case 'average': return { value: Number((agg.sum / agg.count).toFixed(1)), subtext: `from ${agg.count} records` };
    case 'min': return { value: agg.min, subtext: '' };
    case 'max': return { value: agg.max, subtext: '' };
    default: return { value: agg.sum, subtext: '' };
  }
}
