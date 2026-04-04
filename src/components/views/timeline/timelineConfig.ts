/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   timelineConfig.ts                                  :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/05 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/05 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { format, startOfMonth, getMonth } from 'date-fns';
import type { SchemaProperty } from '../../../types/database';
import type { TimelineConfig, MonthGroup } from './timelineHelperTypes';

const ROW_HEIGHT = 40;

/** Returns the timeline grid configuration for a given zoom level. */
export function getTimelineConfig(zoomLevel: string): TimelineConfig {
  switch (zoomLevel) {
    case 'day':
      return {
        cellWidth: 80,
        daysToShow: 28,
        rowHeight: ROW_HEIGHT,
        label: (d: Date) => format(d, 'EEE d'),
        headerLabel: (d: Date) => format(d, 'MMM yyyy'),
      };
    case 'month':
      return {
        cellWidth: 18,
        daysToShow: 180,
        rowHeight: ROW_HEIGHT,
        label: (d: Date) => format(d, 'd'),
        headerLabel: (d: Date) => format(d, 'MMM yyyy'),
      };
    case 'week':
    default:
      return {
        cellWidth: 48,
        daysToShow: 42,
        rowHeight: ROW_HEIGHT,
        label: (d: Date) => format(d, 'd'),
        headerLabel: (d: Date) => format(d, 'MMM yyyy'),
      };
  }
}

/** Groups consecutive days into month spans for the timeline header. */
export function getMonthGroups(days: Date[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  let currentGroup: MonthGroup | null = null;
  for (const d of days) {
    const m = getMonth(d);
    const y = d.getFullYear();
    if (currentGroup?.month !== m || currentGroup?.year !== y) {
      currentGroup = {
        label: format(startOfMonth(d), 'MMM yyyy'),
        colSpan: 1,
        month: m,
        year: y,
      };
      groups.push(currentGroup);
    } else {
      currentGroup.colSpan += 1;
    }
  }
  return groups;
}

/**
 * Find the best start / end date property pair from a database schema.
 *
 * Strategy:
 *  1. Collect all date-like properties (type 'date' or 'due_date').
 *  2. Find the END prop first with strict end-only keywords, to avoid
 *     ambiguity (e.g. "Due Date" contains both "date" and "due").
 *  3. Find the START prop from the remaining props.
 *  4. Fallbacks ensure at least startProp is filled.
 */
export function findDateProperties(
  properties: Record<string, SchemaProperty>,
): { startProp: SchemaProperty | null; endProp: SchemaProperty | null } {
  const dateLike = Object.values(properties).filter(
    p => p.type === 'date' || p.type === 'due_date',
  );
  if (dateLike.length === 0) return { startProp: null, endProp: null };
  if (dateLike.length === 1) return { startProp: dateLike[0], endProp: null };

  // Strict end-only keywords (NOT "due" — "Due Date" is typically a start/single date)
  const strictEndNames = ['end', 'finish', 'complete', 'deadline'];
  // Broader start keywords
  const startNames = ['start', 'begin', 'date', 'created', 'due'];

  // 1. Find end prop FIRST with strict keywords
  let endProp = dateLike.find(p =>
    strictEndNames.some(n => p.name.toLowerCase().includes(n)),
  ) ?? null;

  // 2. Find start prop from remaining
  const remaining = endProp ? dateLike.filter(p => p.id !== endProp?.id) : dateLike;
  let startProp = remaining.find(p =>
    startNames.some(n => p.name.toLowerCase().includes(n)),
  ) ?? remaining[0] ?? null;

  // 3. If no explicit end was found, use the second date prop as end
  if (!endProp && dateLike.length >= 2) {
    endProp = dateLike.find(p => p.id !== startProp?.id) ?? null;
  }

  // 4. Safety: ensure start and end are different
  if (endProp?.id === startProp?.id) endProp = null;

  return { startProp, endProp };
}
