// ─── columnCalculation — the footer row's per-column summary ─────────────────
// Input is each row's semantic cell value (cellValues.semanticValue): option
// labels, Dates, booleans, computed formulas. One pass per column; only the
// median sorts.
// Caveat: numbers render with the locale's plain format, not the column's
// number format (currency, percent); a formula or rollup offers the numeric
// calculations and ignores rows whose result is not a finite number.

import type { SchemaProperty } from '../../../types/database';
import { aggregateNumbers } from '../../../utils/aggregation';

export type ColumnCalculation =
  | 'count_all' | 'count_values' | 'count_unique' | 'count_empty' | 'count_not_empty'
  | 'percent_empty' | 'percent_not_empty'
  | 'sum' | 'average' | 'median' | 'min' | 'max' | 'range'
  | 'earliest' | 'latest' | 'date_range'
  | 'checked' | 'unchecked' | 'percent_checked' | 'percent_unchecked';

export const CALCULATION_LABELS: Readonly<Record<ColumnCalculation, string>> = {
  count_all: 'Count all', count_values: 'Count values', count_unique: 'Count unique values',
  count_empty: 'Count empty', count_not_empty: 'Count not empty',
  percent_empty: 'Percent empty', percent_not_empty: 'Percent not empty',
  sum: 'Sum', average: 'Average', median: 'Median', min: 'Min', max: 'Max', range: 'Range',
  earliest: 'Earliest date', latest: 'Latest date', date_range: 'Date range',
  checked: 'Checked', unchecked: 'Unchecked',
  percent_checked: 'Percent checked', percent_unchecked: 'Percent unchecked',
};

/** Short label shown before the value in the footer cell. */
export const CALCULATION_SHORT: Readonly<Record<ColumnCalculation, string>> = {
  count_all: 'Count', count_values: 'Values', count_unique: 'Unique',
  count_empty: 'Empty', count_not_empty: 'Not empty',
  percent_empty: 'Empty', percent_not_empty: 'Not empty',
  sum: 'Sum', average: 'Average', median: 'Median', min: 'Min', max: 'Max', range: 'Range',
  earliest: 'Earliest', latest: 'Latest', date_range: 'Range',
  checked: 'Checked', unchecked: 'Unchecked',
  percent_checked: 'Checked', percent_unchecked: 'Unchecked',
};

const COUNTS: readonly ColumnCalculation[] = [
  'count_all', 'count_values', 'count_unique', 'count_empty', 'count_not_empty',
  'percent_empty', 'percent_not_empty',
];
const NUMERIC: readonly ColumnCalculation[] = ['sum', 'average', 'median', 'min', 'max', 'range'];
const DATES: readonly ColumnCalculation[] = ['earliest', 'latest', 'date_range'];
const CHECKS: readonly ColumnCalculation[] = [
  'count_all', 'checked', 'unchecked', 'percent_checked', 'percent_unchecked',
];
const NUMERIC_TYPES = new Set(['number', 'formula', 'rollup']);
const DATE_TYPES = new Set(['date', 'due_date', 'created_time', 'last_edited_time']);

/** The calculations a column of this type offers, in menu order. */
export function calculationsFor(prop: SchemaProperty): readonly ColumnCalculation[] {
  if (prop.type === 'checkbox') return CHECKS;
  if (NUMERIC_TYPES.has(prop.type)) return [...COUNTS, ...NUMERIC];
  if (DATE_TYPES.has(prop.type)) return [...COUNTS, ...DATES];
  return COUNTS;
}

const isEmpty = (v: unknown) =>
  v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0);

const numberFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
const percentFormat = new Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits: 1 });
const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
const DAY_MS = 86_400_000;

const percent = (part: number, total: number) => percentFormat.format(total ? part / total : 0);
const uniqueKey = (v: unknown) => (v instanceof Date ? `d${v.getTime()}` : String(v));

function countCalculation(fn: ColumnCalculation, values: readonly unknown[]): string {
  let empty = 0;
  let items = 0;
  const unique = new Set<string>();
  for (const v of values) {
    if (isEmpty(v)) { empty++; continue; }
    for (const item of Array.isArray(v) ? v : [v]) {
      if (isEmpty(item)) continue;
      items++;
      if (fn === 'count_unique') unique.add(uniqueKey(item));
    }
  }
  const filled = values.length - empty;
  switch (fn) {
    case 'count_values': return numberFormat.format(items);
    case 'count_unique': return numberFormat.format(unique.size);
    case 'count_empty': return numberFormat.format(empty);
    case 'count_not_empty': return numberFormat.format(filled);
    case 'percent_empty': return percent(empty, values.length);
    case 'percent_not_empty': return percent(filled, values.length);
    default: return numberFormat.format(values.length);
  }
}

function numericCalculation(fn: ColumnCalculation, values: readonly unknown[]): string {
  const numbers = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  if (fn === 'sum') return numberFormat.format(numbers.reduce((s, n) => s + n, 0));
  if (numbers.length === 0) return '—';
  const agg = aggregateNumbers(numbers);
  const value = fn === 'range' ? agg.max - agg.min : agg[fn as 'average' | 'median' | 'min' | 'max'];
  return numberFormat.format(value);
}

function dateCalculation(fn: ColumnCalculation, values: readonly unknown[]): string {
  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    const t = v instanceof Date ? v.getTime() : Number.NaN;
    if (Number.isNaN(t)) continue;
    if (t < min) min = t;
    if (t > max) max = t;
  }
  if (min === Infinity) return '—';
  if (fn === 'earliest') return dateFormat.format(min);
  if (fn === 'latest') return dateFormat.format(max);
  const days = Math.round((max - min) / DAY_MS);
  return `${numberFormat.format(days)} ${days === 1 ? 'day' : 'days'}`;
}

function checkCalculation(fn: ColumnCalculation, values: readonly unknown[]): string {
  let checked = 0;
  for (const v of values) if (v === true) checked++;
  const unchecked = values.length - checked;
  switch (fn) {
    case 'checked': return numberFormat.format(checked);
    case 'unchecked': return numberFormat.format(unchecked);
    case 'percent_checked': return percent(checked, values.length);
    default: return percent(unchecked, values.length);
  }
}

/** The footer text for `fn` over one column's values. */
export function calculateColumn(fn: ColumnCalculation, values: readonly unknown[]): string {
  if (NUMERIC.includes(fn)) return numericCalculation(fn, values);
  if (DATES.includes(fn)) return dateCalculation(fn, values);
  if (CHECKS.includes(fn) && fn !== 'count_all') return checkCalculation(fn, values);
  return countCalculation(fn, values);
}

/** A stored setting is only trusted if the column's type still offers it
 *  (a column retyped from number to text keeps a stale "sum"). */
export function activeCalculation(prop: SchemaProperty, stored: unknown): ColumnCalculation | null {
  return calculationsFor(prop).includes(stored as ColumnCalculation) ? (stored as ColumnCalculation) : null;
}
