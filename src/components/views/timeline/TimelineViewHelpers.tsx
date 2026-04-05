/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   TimelineViewHelpers.tsx                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/02 14:38:31 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/05 01:31:17 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * Barrel re-export — keeps every existing import path working.
 * Implementation split into:
 *   timelineHelperTypes.ts  – type declarations
 *   timelineConfig.ts       – grid config, month groups, date-property detection
 *   timelineBarGeometry.ts  – bar position / sizing logic
 *   timelineBarStyles.ts    – colour palette, verbosity, cell bg helpers
 */

export type {
  ZoomLevel,
  TimelineConfig,
  BarGeometry,
  MonthGroup,
  BarColorSet,
  BarVerbosity,
} from './timelineHelperTypes';

export { getTimelineConfig, getMonthGroups, findDateProperties } from './timelineConfig';
export { getBarGeometry } from './timelineBarGeometry';
export {
  getBarColorSet,
  getBarColor,
  computeBarVerbosity,
  compactDateRange,
  getDayHeaderBg,
  getGridCellBg,
  clampDuration,
} from './timelineBarStyles';
