/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   timelineBarStyles.ts                               :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/05 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/05 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { format } from 'date-fns';
import type { BarColorSet, BarVerbosity } from './timelineHelperTypes';

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

/** Return the color set for a timeline bar based on a status option's color token. */
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

/** Determine the label verbosity a bar can afford based on its pixel width. */
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

/** Returns the background class for a day header cell based on today/weekend status. */
export function getDayHeaderBg(isToday: boolean, isWeekend: boolean): string {
  if (isToday) return 'bg-accent-soft';
  if (isWeekend) return 'bg-surface-secondary-soft2';
  return 'bg-surface-primary';
}

/** Returns the background class for a grid body cell based on today/weekend status. */
export function getGridCellBg(isToday: boolean, isWeekend: boolean): string {
  if (isToday) return 'bg-accent-soft5';
  if (isWeekend) return 'bg-surface-secondary-soft4';
  return '';
}

/** Clamps a day range ensuring start ≤ end with a minimum 1-day span. */
export function clampDuration(startDay: number, endDay: number): { s: number; e: number } {
  const s = Math.min(startDay, endDay);
  const e = Math.max(startDay, endDay);
  return { s, e: Math.max(e, s + 1) }; // minimum 1-day span
}
