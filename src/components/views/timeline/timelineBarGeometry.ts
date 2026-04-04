/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   timelineBarGeometry.ts                             :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/05 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/05 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { differenceInDays } from 'date-fns';
import type { Page } from '../../../types/database';
import type { TimelineConfig, BarGeometry } from './timelineHelperTypes';

/**
 * NEW logic:
 *   - If the page only has a start date (no end date) → the bar is exactly
 *     1 cell wide (a "point" marker), not a multi-cell span.
 *   - If the page has both start AND end date → the bar stretches from
 *     start to end (range mode).
 *   - When the user drags an edge, the parent component sets the end-date
 *     property automatically and the bar becomes ranged.
 */
export function getBarGeometry(
  page: Page,
  startPropId: string,
  endPropId: string | null,
  timelineStart: Date,
  config: TimelineConfig,
  _zoomLevel: string,
): BarGeometry | null {
  const startVal = page.properties[startPropId];
  if (!startVal) return null;

  const pageStart = new Date(startVal);
  if (Number.isNaN(pageStart.getTime())) return null;

  /* Determine if the page has a real end-date. */
  let pageEnd: Date | null = null;
  let hasEndDate = false;
  if (endPropId && page.properties[endPropId]) {
    const d = new Date(page.properties[endPropId]);
    if (!Number.isNaN(d.getTime()) && d > pageStart) {
      pageEnd = d;
      hasEndDate = true;
    }
  }

  const startDay = differenceInDays(pageStart, timelineStart);

  if (!hasEndDate || !pageEnd) {
    /* Point mode: single cell */
    // Bars far off-screen are hidden for perf, but allow a generous margin.
    if (startDay < -200 || startDay > config.daysToShow + 200) return null;

    return {
      left: startDay * config.cellWidth,
      width: config.cellWidth,
      visible: true,
      startDay,
      endDay: startDay + 1,
      hasEndDate: false,
      isPoint: true,
    };
  }

  const endDay = differenceInDays(pageEnd, timelineStart);
  // Hide only if the entire bar is far off-screen in both directions
  if (endDay < -200 || startDay > config.daysToShow + 200) return null;

  const durationCells = Math.max(1, endDay - startDay);

  return {
    left: startDay * config.cellWidth,
    width: durationCells * config.cellWidth,
    visible: true,
    startDay,
    endDay,
    hasEndDate: true,
    isPoint: false,
  };
}
