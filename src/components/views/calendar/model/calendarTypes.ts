/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   calendarTypes.ts                                    :+:      :+:    :+:  */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── calendarTypes — shared types/constants for the calendar view ───────────
// Pure module (no React/DOM): everything here is importable by node --test.

/** Local calendar day, 'yyyy-MM-dd'. String compare == chronological compare. */
export type DayKey = string;

/** A page normalized onto calendar days. `endKey` is the INCLUSIVE last day
 *  (a one-day ranged event has startKey === endKey). ISO values are kept so
 *  drag commits preserve the original time-of-day. */
export interface CalEvent {
  pageId: string;
  startKey: DayKey;
  endKey: DayKey;
  isRanged: boolean;
  startIso: string;
  endIso: string | null;
}

/** One visible day cell of a built grid. `col` is the VISIBLE column index
 *  (0..4 when weekends are hidden). */
export interface DayInfo {
  date: Date;
  key: DayKey;
  col: number;
  weekIndex: number;
  inMonth: boolean;
  isWeekend: boolean;
}

export interface CalendarGrid {
  weeks: DayInfo[][];
  cols: number;
  weekStartsOn: 0 | 1;
  /** First / last visible day (inclusive). */
  rangeStart: DayKey;
  rangeEnd: DayKey;
  /** ISO week number per row. */
  weekNumbers: number[];
}

/** A ranged event cut to one week row. Cols are inclusive visible columns. */
export interface WeekSegment {
  pageId: string;
  weekIndex: number;
  startCol: number;
  endCol: number;
  /** Event extends beyond this segment (earlier week or hidden weekend). */
  continuesLeft: boolean;
  continuesRight: boolean;
  /** Assigned by packWeekLanes; -1 before packing. */
  lane: number;
  isRanged: boolean;
}

/** Snapshot of a day cell's rect for drag hit-testing. */
export interface CellRect {
  dayKey: DayKey;
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export type CalendarDragKind = 'move' | 'resize-left' | 'resize-right' | 'create';

export type CalendarMode = 'month' | 'week' | 'day' | 'agenda';

export type CalendarAction =
  | 'today' | 'prev' | 'next'
  | 'month-mode' | 'week-mode' | 'day-mode' | 'agenda-mode'
  | 'create';

/** Lanes rendered inside a month cell before events collapse to "+N more". */
export const MAX_VISIBLE_LANES = 3;
/** Px from the grid's left/right edge that arms month rollover during drag. */
export const CAL_ROLLOVER_ZONE = 40;
/** Dwell before the rollover fires (and re-arms while still in the zone). */
export const CAL_ROLLOVER_DELAY_MS = 500;
/** Time-grid drag granularity (minutes). */
export const SLOT_MINUTES = 30;
export const MINUTES_PER_DAY = 24 * 60;
