/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   calendarGrid.ts                                     :+:      :+:    :+:  */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── calendarGrid — month/week grid construction + day-key math ─────────────
// Pure (no React/DOM). Day math is calendar-day based (date-fns), never
// ms/86400000 — DST days are 23h/25h and would drift a division.

import {
  format, addDays, differenceInCalendarDays, getISOWeek,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  isSameMonth,
} from 'date-fns';
import type { CalendarGrid, DayInfo, DayKey } from './calendarTypes';

export interface GridOptions {
  weekStartsOn: 0 | 1;
  showWeekends: boolean;
}

export function toDayKey(d: Date): DayKey {
  return format(d, 'yyyy-MM-dd');
}

/** Local midnight of a day key. */
export function fromDayKey(key: DayKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDaysToKey(key: DayKey, n: number): DayKey {
  return toDayKey(addDays(fromDayKey(key), n));
}

/** a - b in whole calendar days. */
export function diffDayKeys(a: DayKey, b: DayKey): number {
  return differenceInCalendarDays(fromDayKey(a), fromDayKey(b));
}

const isWeekendDay = (d: Date): boolean => d.getDay() === 0 || d.getDay() === 6;

function buildGrid(first: Date, last: Date, anchor: Date, opts: GridOptions): CalendarGrid {
  const all = eachDayOfInterval({ start: first, end: last });
  const weeks: DayInfo[][] = [];
  const weekNumbers: number[] = [];
  for (let i = 0; i < all.length; i += 7) {
    const chunk = all.slice(i, i + 7).filter(d => opts.showWeekends || !isWeekendDay(d));
    if (chunk.length === 0) continue;
    const weekIndex = weeks.length;
    weeks.push(chunk.map((date, col) => ({
      date,
      key: toDayKey(date),
      col,
      weekIndex,
      inMonth: isSameMonth(date, anchor),
      isWeekend: isWeekendDay(date),
    })));
    weekNumbers.push(getISOWeek(all[i]));
  }
  const firstWeek = weeks[0];
  const lastWeek = weeks[weeks.length - 1];
  return {
    weeks,
    cols: opts.showWeekends ? 7 : 5,
    weekStartsOn: opts.weekStartsOn,
    rangeStart: firstWeek[0].key,
    rangeEnd: lastWeek[lastWeek.length - 1].key,
    weekNumbers,
  };
}

/** Full-week month grid around `anchor` (5 or 6 rows). */
export function buildMonthGrid(anchor: Date, opts: GridOptions): CalendarGrid {
  const first = startOfWeek(startOfMonth(anchor), { weekStartsOn: opts.weekStartsOn });
  const last = endOfWeek(endOfMonth(anchor), { weekStartsOn: opts.weekStartsOn });
  return buildGrid(first, last, anchor, opts);
}

/** Single-week grid containing `anchor`. */
export function buildWeekGrid(anchor: Date, opts: GridOptions): CalendarGrid {
  const first = startOfWeek(anchor, { weekStartsOn: opts.weekStartsOn });
  const last = endOfWeek(anchor, { weekStartsOn: opts.weekStartsOn });
  return buildGrid(first, last, anchor, opts);
}

/** Single-day grid (Day mode reuses the same shape). */
export function buildDayGrid(anchor: Date): CalendarGrid {
  const day: DayInfo = {
    date: anchor,
    key: toDayKey(anchor),
    col: 0,
    weekIndex: 0,
    inMonth: true,
    isWeekend: isWeekendDay(anchor),
  };
  return {
    weeks: [[day]],
    cols: 1,
    weekStartsOn: 1,
    rangeStart: day.key,
    rangeEnd: day.key,
    weekNumbers: [getISOWeek(anchor)],
  };
}

/** Finds a day cell by row/column (used by overflow counting). */
export function dayAt(grid: CalendarGrid, weekIndex: number, col: number): DayInfo | null {
  return grid.weeks[weekIndex]?.find(d => d.col === col) ?? null;
}
