// ─── kpiModel — the number, its format and its provenance for a KPI tile ─────
// Pure: StatKpi feeds it the view's values and the database's record total,
// so the tile and its tests share one rule set.

import type { DashboardStatConfig } from '../../../../../types/database';
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
  const share = total <= 0 || matched >= total
    ? `All ${records(total > 0 ? total : matched)}`
    : `${Math.round((matched / total) * 100)}% of ${records(total)}`;
  if (whereLabel) return `${STAT_FN_LABEL[fn]} where ${whereLabel} · ${share}`;
  if (fn !== 'count') return `${STAT_FN_LABEL[fn]} of ${propertyName ?? '—'} · ${records(matched)}`;
  return share;
}
