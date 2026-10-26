/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   filterHelpers.ts                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/18 21:19:17 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/18 21:19:17 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── filterHelpers — private helper functions for filter evaluation ──────────

import type { Filter, FilterOperator } from '../../types/database';
import { safeString } from '../../utils/safeString';

/** Operators that test the cell alone and take no comparison value. */
export const VALUELESS_OPERATORS: ReadonlySet<FilterOperator> = new Set<FilterOperator>([
  'is_empty', 'is_not_empty', 'is_checked', 'is_not_checked', 'is_relative_to_today',
]);

/**
 * Check if a value contains another value (string includes or array includes).
 * An array needle (a multi-option pick) matches when ANY of its items is
 * contained: `[a].includes([a, b])` never held, so the filter matched nothing.
 * Text items match by substring like a text cell, so a rollup listing related
 * titles answers `contains "pars"`; option ids (`opt-<ms>`, fixed width) are
 * never substrings of one another, so a picked id still matches exactly.
 */
export function containsValue(val: unknown, fv: unknown): boolean {
  if (Array.isArray(fv)) return fv.some(item => containsValue(val, item));
  if (typeof val === 'string') return val.toLowerCase().includes(safeString(fv).toLowerCase());
  if (Array.isArray(val)) return val.some(item => item === fv || (typeof item === 'string' && containsValue(item, fv)));
  return false;
}

/**
 * Check if a value is empty (null, undefined, empty string, empty array).
 */
export function isEmpty(val: unknown): boolean {
  return val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0);
}

/**
 * A filter whose operator needs a value the user has not picked yet. A view
 * skips it (Notion behaviour) instead of hiding every row while the editor
 * is still open; a conditional-color rule simply never matches it.
 */
export function isIncompleteFilter(filter: Pick<Filter, 'operator' | 'value'>): boolean {
  if (VALUELESS_OPERATORS.has(filter.operator)) return false;
  const fv = filter.value;
  if (fv !== null && typeof fv === 'object' && !Array.isArray(fv)) {
    const range = fv as { start?: unknown; end?: unknown };
    return isEmpty(range.start) && isEmpty(range.end);
  }
  return isEmpty(fv);
}
