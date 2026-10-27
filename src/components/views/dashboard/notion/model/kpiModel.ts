// ─── kpiModel — the number, its format and its provenance for a KPI tile ─────
// Pure: StatKpi feeds it the view's values and the database's record total,
// so the tile and its tests share one rule set.

import type { DashboardStatConfig, Filter, SchemaProperty } from '../../../../../types/database';
import type { StatKind } from '../../dashboardAggregates';
import { formatNumber } from '../../../../../utils/format';

type StatFn = DashboardStatConfig['fn'];

export const STAT_FN_LABEL: Record<StatFn, string> = {
  count: 'Count',
  sum: 'Sum',
  avg: 'Average',
  min: 'Min',
  max: 'Max',
  distinct: 'Distinct',
};

/** The legacy tile look is keyed by what the tile measures. */
export const STAT_FN_KIND: Record<StatFn, StatKind> = {
  count: 'count', sum: 'sum', avg: 'average', min: 'min', max: 'max', distinct: 'distinct',
};

/** Cell values → finite numbers; an empty cell is not a zero. */
export function numericValues(values: readonly unknown[]): number[] {
  return values
    // Number('') and Number(null) are 0 — an empty cell must not count as one.
    .filter(v => v !== null && v !== undefined && v !== '' && typeof v !== 'boolean')
    .map(Number)
    .filter(n => Number.isFinite(n));
}

/** sum/avg/min/max over numbers; 0 when there is nothing to aggregate. */
export function aggregate(fn: Exclude<StatFn, 'count'>, numbers: readonly number[]): number {
  if (numbers.length === 0) return 0;
  if (fn === 'sum') return numbers.reduce((a, b) => a + b, 0);
  if (fn === 'avg') return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  return fn === 'min' ? Math.min(...numbers) : Math.max(...numbers);
}

/** Distinct (non-empty) values in a list. */
export function distinctCount(values: readonly unknown[]): number {
  const set = new Set(values.filter(v => v !== null && v !== undefined && v !== ''));
  return set.size;
}

/** Compact from 10K up (12.4K, 1.4M); below that at most two decimals. */
export function formatKpi(value: number): string {
  if (Math.abs(value) >= 10_000) return formatNumber(value);
  return (Math.round(value * 100) / 100).toLocaleString();
}

/** The line under the label: where the number comes from. */
export function kpiProvenance({ fn, matched, total, propertyName, whereLabel }: Readonly<{
  fn: StatFn; matched: number; total: number; propertyName?: string; whereLabel?: string;
}>): string {
  const records = (n: number) => `${n.toLocaleString()} ${n === 1 ? 'record' : 'records'}`;
  if (whereLabel) return `${STAT_FN_LABEL[fn]} where ${whereLabel} · ${matched} of ${total}`;
  if (fn !== 'count') return `${STAT_FN_LABEL[fn]} of ${propertyName ?? '—'} · ${records(matched)}`;
  if (total <= 0 || matched >= total) return `All ${records(total > 0 ? total : matched)}`;
  return `${Math.round((matched / total) * 100)}% of ${records(total)}`;
}

/** A stat's where-filters as words. A select reads its option's label whichever
 *  form the filter stores (option id from the picker, text from older saves). */
export function whereFilterLabel(filters: readonly Filter[], properties: Readonly<Record<string, SchemaProperty>>): string | undefined {
  if (filters.length === 0) return undefined;
  return filters.map(filter => {
    const property = properties[filter.propertyId];
    const name = property?.name ?? filter.propertyId;
    if (filter.operator === 'is_checked') return `${name} is checked`;
    if (filter.operator === 'is_not_checked') return `${name} is not checked`;
    const option = property?.options?.find(o => o.id === filter.value || o.value === filter.value);
    if (filter.operator === 'equals' && option) return `${name} is ${option.value}`;
    return `${name} ${filter.operator} ${String(filter.value ?? '')}`.trim();
  }).join(' and ');
}
