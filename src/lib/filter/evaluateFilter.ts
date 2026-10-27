/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   evaluateFilter.ts                                  :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/18 21:19:17 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/18 21:19:17 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── evaluateFilter — test a single filter against a page ───────────────────

import type { Page, Filter, SchemaProperty } from '../../types/database';
import { containsValue, isEmpty } from './filterHelpers';
import { safeString } from '../../utils/safeString';

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Local-midnight epoch of a date-ish value, or null. Date filters compare
 *  whole days: a stored `2026-10-19T22:00:00.000Z` (local midnight in UTC+2)
 *  and a picked `2026-10-20` are the same day, which a raw `new Date()`
 *  comparison (UTC vs local) or `===` on strings got wrong. */
export function localDay(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  let date: Date;
  const only = typeof val === 'string' ? DATE_ONLY.exec(val) : null;
  if (only) date = new Date(Number(only[1]), Number(only[2]) - 1, Number(only[3]));
  else if (val instanceof Date) date = new Date(val.getTime());
  else if (typeof val === 'string' || typeof val === 'number') date = new Date(val);
  else return null;
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/** A finite number, or a numeric string read as one (CSV / API imports keep
 *  numbers as text). Anything else is null. */
function toNumber(val: unknown): number | null {
  if (typeof val === 'number') return Number.isFinite(val) ? val : null;
  if (typeof val === 'string' && val.trim() !== '') {
    const n = Number(val);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** `equals` across the shapes a filter value can take: a number filter holds
 *  a number while a formula cell may hold text, a checkbox formula holds a
 *  boolean while the editor typed "true", a multi-value cell holds an array. */
function looseEquals(val: unknown, fv: unknown): boolean {
  if (Array.isArray(fv)) return fv.some(item => looseEquals(val, item));
  if (Array.isArray(val)) return val.some(item => looseEquals(item, fv));
  if (val === fv) return true;
  if (typeof val === 'boolean' || typeof fv === 'boolean') return safeString(val) === safeString(fv);
  const a = toNumber(val);
  const b = toNumber(fv);
  if (a !== null && b !== null) return a === b;
  return typeof val === 'string' && typeof fv === 'string' && val.toLowerCase() === fv.toLowerCase();
}

function compareNumber(val: unknown, fv: unknown, test: (a: number, b: number) => boolean): boolean {
  const a = toNumber(val);
  const b = toNumber(fv);
  return a !== null && b !== null && test(a, b);
}

function compareDay(val: unknown, fv: unknown, test: (a: number, b: number) => boolean): boolean {
  const a = localDay(val);
  const b = localDay(fv);
  return a !== null && b !== null && test(a, b);
}

/** `is_between` bounds: the editor stores `{ start, end }`; older views
 *  stored `[start, end]`. A missing bound leaves that side open. */
function isBetween(val: unknown, fv: unknown): boolean {
  const day = localDay(val);
  if (day === null) return false;
  const [start, end] = Array.isArray(fv)
    ? [fv[0], fv[1]]
    : [(fv as { start?: unknown } | null)?.start, (fv as { end?: unknown } | null)?.end];
  const lo = localDay(start);
  const hi = localDay(end);
  if (lo === null && hi === null) return false;
  return (lo === null || day >= lo) && (hi === null || day <= hi);
}

function isDateValue(val: unknown): boolean {
  return val instanceof Date || (typeof val === 'string' && localDay(val) !== null && /^\d{4}-/.test(val));
}

/**
 * Evaluate a filter against an already-resolved cell value. Views pass the
 * computed value of formula / rollup / created-time columns here, which a
 * raw `page.properties` read never held.
 */
export function matchesFilterValue(val: unknown, filter: Pick<Filter, 'operator' | 'value'>): boolean {
  const fv = filter.value;

  switch (filter.operator) {
    case 'equals':
      return isDateValue(val) && localDay(fv) !== null ? compareDay(val, fv, (a, b) => a === b) : looseEquals(val, fv);
    case 'not_equals':
      return isDateValue(val) && localDay(fv) !== null ? !compareDay(val, fv, (a, b) => a === b) : !looseEquals(val, fv);
    case 'contains':
      return containsValue(val, fv);
    case 'not_contains':
      return !containsValue(val, fv);
    case 'starts_with':
      return typeof val === 'string' && val.toLowerCase().startsWith(safeString(fv).toLowerCase());
    case 'ends_with':
      return typeof val === 'string' && val.toLowerCase().endsWith(safeString(fv).toLowerCase());
    case 'is_empty':
      return isEmpty(val);
    case 'is_not_empty':
      return !isEmpty(val);
    case 'greater_than':
      return compareNumber(val, fv, (a, b) => a > b);
    case 'less_than':
      return compareNumber(val, fv, (a, b) => a < b);
    case 'greater_than_or_equal':
      return compareNumber(val, fv, (a, b) => a >= b);
    case 'less_than_or_equal':
      return compareNumber(val, fv, (a, b) => a <= b);
    case 'is_before':
      return compareDay(val, fv, (a, b) => a < b);
    case 'is_after':
      return compareDay(val, fv, (a, b) => a > b);
    case 'is_on_or_before':
      return compareDay(val, fv, (a, b) => a <= b);
    case 'is_on_or_after':
      return compareDay(val, fv, (a, b) => a >= b);
    case 'is_between':
      return isBetween(val, fv);
    case 'is_relative_to_today':
      return compareDay(val, new Date(), (a, b) => a === b);
    case 'is_checked':
      return val === true;
    case 'is_not_checked':
      return val !== true;
    default:
      return true;
  }
}

/**
 * Evaluate a single filter against a page's stored value.
 *
 * @example
 * evaluateFilter(page, { id: '1', propertyId: 'p1', operator: 'equals', value: 'Done' }, prop)
 * // → true if page.properties.p1 is 'Done'
 */
export function evaluateFilter(
  page: Page,
  filter: Filter,
  property: SchemaProperty | undefined,
): boolean {
  return matchesPropertyFilter(page.properties[filter.propertyId], filter, property);
}

const OPTION_TYPES: ReadonlySet<string> = new Set(['select', 'status', 'multi_select']);

/** A select-like value as its option id. Seeded databases store option ids, while
 *  `sys:` and workspace databases store the option's text; the filter UI stores ids. */
function toOptionId(value: unknown, property: SchemaProperty): unknown {
  if (Array.isArray(value)) return value.map(item => toOptionId(item, property));
  const option = property.options?.find(o => o.id === value || o.value === value);
  return option ? option.id : value;
}

/**
 * `matchesFilterValue` for a known column: a select-like cell and the filter value
 * are both compared as option ids, so either side may carry the id or the text.
 */
export function matchesPropertyFilter(
  value: unknown,
  filter: Pick<Filter, 'operator' | 'value'>,
  property: SchemaProperty | undefined,
): boolean {
  if (!property || !OPTION_TYPES.has(property.type) || !property.options?.length) {
    return matchesFilterValue(value, filter);
  }
  return matchesFilterValue(toOptionId(value, property), { ...filter, value: toOptionId(filter.value, property) as Filter['value'] });
}
