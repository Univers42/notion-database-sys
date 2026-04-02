/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   TimelineViewHelpers.tsx                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/02 14:38:31 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/02 14:38:32 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { format, differenceInDays } from 'date-fns';
import type { Page } from '../../types/database';

export type ZoomLevel = 'day' | 'week' | 'month';

export interface TimelineConfig {
  cellWidth: number;
  daysToShow: number;
  label: (d: Date) => string;
  headerLabel: (d: Date) => string;
}

export function getTimelineConfig(zoomLevel: string): TimelineConfig {
  switch (zoomLevel) {
    case 'day':
      return { cellWidth: 60, daysToShow: 21, label: (d: Date) => format(d, 'd'), headerLabel: (d: Date) => format(d, 'MMM d') };
    case 'week':
      return { cellWidth: 100, daysToShow: 14, label: (d: Date) => format(d, 'EEE d'), headerLabel: (d: Date) => format(d, 'MMM d') };
    case 'month':
      return { cellWidth: 40, daysToShow: 90, label: (d: Date) => format(d, 'd'), headerLabel: (d: Date) => format(d, 'MMM yyyy') };
    default:
      return { cellWidth: 100, daysToShow: 14, label: (d: Date) => format(d, 'EEE d'), headerLabel: (d: Date) => format(d, 'MMM d') };
  }
}

export function getBarStyle(
  page: Page,
  datePropertyId: string,
  startDate: Date,
  config: TimelineConfig,
  zoomLevel: string,
) {
  const val = page.properties[datePropertyId];
  if (!val) return null;
  const pageDate = new Date(val);
  const dayIdx = differenceInDays(pageDate, startDate);
  if (dayIdx < -2 || dayIdx > config.daysToShow + 2) return null;
  const barWidthMap: Record<string, number> = { day: 2, week: 3, month: 5 };
  const barWidth = barWidthMap[zoomLevel] || 3;
  return {
    left: Math.max(0, dayIdx) * config.cellWidth,
    width: barWidth * config.cellWidth,
    visible: dayIdx >= -barWidth && dayIdx <= config.daysToShow,
  };
}
