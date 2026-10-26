/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   compareValues.ts                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/18 21:19:17 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/18 21:19:17 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── compareValues — pure sort comparator for property values ────────────────

import { safeString } from '../../utils/safeString';
import { isEmpty } from './filterHelpers';

/**
 * Compare two property values for sorting. Empty values sort last in both
 * directions and tie with each other — returning 1 for an empty `a`
 * regardless of `b` made two empty rows each "greater" than the other.
 *
 * @param a - First value
 * @param b - Second value
 * @param direction - Sort direction ('asc' or 'desc')
 * @returns negative if a < b, 0 if equal, positive if a > b (adjusted for direction)
 */
export function compareValues(a: unknown, b: unknown, direction: 'asc' | 'desc'): number {
  const mult = direction === 'asc' ? 1 : -1;
  const aEmpty = isEmpty(a);
  const bEmpty = isEmpty(b);
  if (aEmpty || bEmpty) return Number(aEmpty) - Number(bEmpty);
  if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b, undefined, { numeric: true }) * mult;
  if (typeof a === 'number' && typeof b === 'number') return (a - b) * mult;
  if (typeof a === 'boolean' && typeof b === 'boolean') return ((a ? 1 : 0) - (b ? 1 : 0)) * mult;
  if (a instanceof Date && b instanceof Date) return (a.getTime() - b.getTime()) * mult;
  return safeString(a).localeCompare(safeString(b), undefined, { numeric: true }) * mult;
}
