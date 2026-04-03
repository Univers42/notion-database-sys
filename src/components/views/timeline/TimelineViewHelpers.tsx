/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   TimelineViewHelpers.tsx                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/02 14:38:31 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/03 02:26:37 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { format, differenceInDays, startOfMonth, addDays, getMonth } from 'date-fns';
import type { Page, SchemaProperty, SelectOption } from '../../../types/database';
import { cn } from '../../../utils/cn';

/* ── Types ─────────────────────────────────────────────────────────────── */

export type ZoomLevel = 'day' | 'week' | 'month';

export interface TimelineConfig {
  cellWidth: number;
  daysToShow: number;
  rowHeight: number;
  label: (d: Date) => string;
  headerLabel: (d: Date) => string;
}

export interface BarGeometry {
  left: number;
  width: number;
  visible: boolean;
  startDay: number;
  endDay: number;
  /** true when the page actually has an end-date value set */
  hasEndDate: boolean;
  /** true when the bar represents a single point-in-time (no range) */
  isPoint: boolean;
}

export interface MonthGroup {
  label: string;
  colSpan: number;
  month: number;
  year: number;
}

/* ── Zoom config ───────────────────────────────────────────────────────── */

const ROW_HEIGHT = 40;

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
    case 'week':
      return {
        cellWidth: 48,
        daysToShow: 42,
        rowHeight: ROW_HEIGHT,
        label: (d: Date) => format(d, 'd'),
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

/* ── Month header groupings ────────────────────────────────────────────── */

export function getMonthGroups(days: Date[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  let currentGroup: MonthGroup | null = null;
  for (const d of days) {
    const m = getMonth(d);
    const y = d.getFullYear();
    if (!currentGroup || currentGroup.month !== m || currentGroup.year !== y) {
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

/* ── Date-property resolution ──────────────────────────────────────────── */

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
  const remaining = endProp ? dateLike.filter(p => p.id !== endProp!.id) : dateLike;
  let startProp = remaining.find(p =>
    startNames.some(n => p.name.toLowerCase().includes(n)),
  ) ?? remaining[0] ?? null;

  // 3. If no explicit end was found, use the second date prop as end
  if (!endProp && dateLike.length >= 2) {
    endProp = dateLike.find(p => p.id !== startProp?.id) ?? null;
  }

  // 4. Safety: ensure start and end are different
  if (endProp && startProp && endProp.id === startProp.id) endProp = null;

  return { startProp, endProp };
}

/* ── Bar positioning ───────────────────────────────────────────────────── */

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
  if (isNaN(pageStart.getTime())) return null;

  /* Determine if the page has a real end-date. */
  let pageEnd: Date | null = null;
  let hasEndDate = false;
  if (endPropId && page.properties[endPropId]) {
    const d = new Date(page.properties[endPropId]);
    if (!isNaN(d.getTime()) && d > pageStart) {
      pageEnd = d;
      hasEndDate = true;
    }
  }

  const startDay = differenceInDays(pageStart, timelineStart);

  if (!hasEndDate || !pageEnd) {
    /* ── Point mode: single cell ──────────────────────────────── */
    // Always compute geometry — let the renderer handle clipping.
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

  /* ── Range mode ─────────────────────────────────────────────── */
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

/* ── Status color palette ─────────────────────────────────────────────── */

/**
 * Full mapping from option color-token substrings to solid Tailwind bar
 * backgrounds **and** a lighter hover variant.  We also export the raw
 * hex so the tooltip / hover card can reuse the palette.
 */
export interface BarColorSet {
  /** Solid bar background class (Tailwind) */
  bg: string;
  /** Text color inside the bar */
  text: string;
  /** Raw hex used for inline styles / tooltips */
  hex: string;
}

const STATUS_PALETTE: [string, BarColorSet][] = [
  ['green',  { bg: 'bg-emerald-500',  text: 'text-white',     hex: '#10b981' }],
  ['blue',   { bg: 'bg-blue-500',     text: 'text-white',     hex: '#3b82f6' }],
  ['purple', { bg: 'bg-violet-500',   text: 'text-white',     hex: '#8b5cf6' }],
  ['yellow', { bg: 'bg-amber-400',    text: 'text-amber-950', hex: '#fbbf24' }],
  ['amber',  { bg: 'bg-amber-400',    text: 'text-amber-950', hex: '#fbbf24' }],
  ['orange', { bg: 'bg-orange-500',   text: 'text-white',     hex: '#f97316' }],
  ['red',    { bg: 'bg-rose-500',     text: 'text-white',     hex: '#f43f5e' }],
  ['pink',   { bg: 'bg-pink-500',     text: 'text-white',     hex: '#ec4899' }],
  ['cyan',   { bg: 'bg-cyan-500',     text: 'text-white',     hex: '#06b6d4' }],
  ['teal',   { bg: 'bg-teal-500',     text: 'text-white',     hex: '#14b8a6' }],
  ['gray',   { bg: 'bg-gray-400',     text: 'text-white',     hex: '#9ca3af' }],
];

const DEFAULT_COLOR_SET: BarColorSet = {
  bg: 'bg-blue-500', text: 'text-white', hex: '#3b82f6',
};

export function getBarColorSet(statusOpt: { color: string } | undefined): BarColorSet {
  if (!statusOpt) return DEFAULT_COLOR_SET;
  for (const [key, set] of STATUS_PALETTE) {
    if (statusOpt.color.includes(key)) return set;
  }
  return DEFAULT_COLOR_SET;
}

/** Simple bg-class-only variant (backward compat). */
export function getBarColor(statusOpt: { color: string } | undefined): string {
  return getBarColorSet(statusOpt).bg;
}

/* ── Adaptive bar label logic ─────────────────────────────────────────── */

/**
 * Determines what verbosity level the bar can afford based on its pixel
 * width.  Returns an object telling the bar renderer what to show.
 *
 * - `'color-only'`  — bar too small for any text
 * - `'status'`      — show just the status label
 * - `'status+dates'`— show status + compact date range
 * - `'full'`        — show status + date range + icon
 */
export type BarVerbosity = 'color-only' | 'status' | 'status+dates' | 'full';

export function computeBarVerbosity(
  barWidthPx: number,
  cellWidth: number,
): BarVerbosity {
  // Rough breakpoints (in px)
  if (barWidthPx < cellWidth * 1.3)  return 'color-only';
  if (barWidthPx < cellWidth * 2.5)  return 'status';
  if (barWidthPx < cellWidth * 5)    return 'status+dates';
  return 'full';
}

/** Short date label: "3 Apr" or "3/4–10/4" etc. */
export function compactDateRange(start: Date, end: Date | null): string {
  if (!end) return format(start, 'd/M');
  return `${format(start, 'd/M')}–${format(end, 'd/M')}`;
}

/* ── Day cell helpers ──────────────────────────────────────────────────── */

export function getDayHeaderBg(isToday: boolean, isWeekend: boolean): string {
  if (isToday) return 'bg-accent-soft';
  if (isWeekend) return 'bg-surface-secondary-soft2';
  return 'bg-surface-primary';
}

export function getGridCellBg(isToday: boolean, isWeekend: boolean): string {
  if (isToday) return 'bg-accent-soft5';
  if (isWeekend) return 'bg-surface-secondary-soft4';
  return '';
}

/* ── Clamp a date range to valid values ────────────────────────────────── */

export function clampDuration(startDay: number, endDay: number): { s: number; e: number } {
  const s = Math.min(startDay, endDay);
  const e = Math.max(startDay, endDay);
  return { s, e: Math.max(e, s + 1) }; // minimum 1-day span
}
