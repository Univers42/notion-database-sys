/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   calendarConfig.ts                                   :+:      :+:    :+:  */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── calendarConfig — UI pixel constants for the calendar view ──────────────

/** Height of one event lane row in the month grid (px). */
export const LANE_HEIGHT = 22;
/** Space reserved at the top of a day cell for its number row (px). */
export const DAY_HEADER_HEIGHT = 26;
/** Height of the "+N more" line under the lanes (px). */
export const OVERFLOW_HEIGHT = 18;
/** Width of the week-number gutter column (px). */
export const WEEK_GUTTER_WIDTH = 28;
/** Hour row height in the week/day time grid (px). */
export const HOUR_HEIGHT = 48;
/** Height of the all-day band lane in the time grid (px). */
export const ALLDAY_LANE_HEIGHT = 22;
/** Event lanes a month row of `rowHeight` px shows above its "+N more"
 *  line — never fewer than `minLanes`, so a short pane still scrolls. */
export function lanesThatFit(rowHeight: number, minLanes: number): number {
  const fit = Math.floor((rowHeight - DAY_HEADER_HEIGHT - OVERFLOW_HEIGHT) / LANE_HEIGHT);
  return Number.isFinite(fit) ? Math.max(minLanes, fit) : minLanes;
}

/** Default agenda window (days ahead). */
export const AGENDA_DAYS = 45;
