/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   calendarTimeGrid.ts                                 :+:      :+:    :+:  */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── calendarTimeGrid — hour-grid math for the week/day views ───────────────
// Pure (no React/DOM). Timed events lay out per day column: overlapping
// events form a CLUSTER that splits its width into side-by-side columns
// (the classic day-column partitioning Google/Outlook use).

import { MINUTES_PER_DAY, SLOT_MINUTES } from './calendarTypes';

/** Minutes since local midnight of the ISO's own day. */
export function minutesOfDay(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

/** Snaps minutes to the drag granularity, clamped to the day. */
export function snapToSlot(minutes: number, slot: number = SLOT_MINUTES): number {
  const snapped = Math.round(minutes / slot) * slot;
  return Math.max(0, Math.min(MINUTES_PER_DAY, snapped));
}

/** Y offset (px) inside a day column for a given minute of the day. */
export function minutesToOffsetPx(minutes: number, hourHeight: number): number {
  return (minutes / 60) * hourHeight;
}

/** Pointer y (px from the column top) → snapped minutes. */
export function offsetPxToMinutes(offsetPx: number, hourHeight: number, slot: number = SLOT_MINUTES): number {
  return snapToSlot((offsetPx / hourHeight) * 60, slot);
}

export interface TimedItem {
  id: string;
  startMin: number;
  endMin: number; // exclusive; rendering enforces a minimum visual height
}

export interface TimedPlacement {
  id: string;
  /** Column inside the overlap cluster, and the cluster's column count. */
  col: number;
  cols: number;
}

const overlaps = (a: TimedItem, b: TimedItem): boolean =>
  a.startMin < b.endMin && b.startMin < a.endMin;

/**
 * Side-by-side layout for one day's timed events: sweep in start order,
 * group transitively-overlapping events into clusters, first-fit columns
 * inside each cluster, then every member reports the cluster width so the
 * UI divides the day column evenly. Deterministic (start asc → longer first
 * → id).
 */
export function packTimedColumns(items: readonly TimedItem[]): TimedPlacement[] {
  const sorted = [...items].sort((a, b) =>
    a.startMin - b.startMin
    || (b.endMin - b.startMin) - (a.endMin - a.startMin)
    || (a.id < b.id ? -1 : 1));

  const placements: TimedPlacement[] = [];
  let cluster: { item: TimedItem; col: number }[] = [];
  let clusterEnd = -1;

  const flush = (): void => {
    if (cluster.length === 0) return;
    const cols = Math.max(...cluster.map(c => c.col)) + 1;
    for (const c of cluster) placements.push({ id: c.item.id, col: c.col, cols });
    cluster = [];
  };

  for (const item of sorted) {
    if (cluster.length > 0 && item.startMin >= clusterEnd) flush();
    const used = cluster.filter(c => overlaps(c.item, item)).map(c => c.col);
    let col = 0;
    while (used.includes(col)) col++;
    cluster.push({ item, col });
    clusterEnd = Math.max(clusterEnd, item.endMin);
  }
  flush();
  return placements;
}

/** Minutes since midnight for the now-line (null when `now` is another day). */
export function nowLineMinutes(now: Date, dayKey: string): number | null {
  const pad = (n: number): string => String(n).padStart(2, '0');
  const nowKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  if (nowKey !== dayKey) return null;
  return now.getHours() * 60 + now.getMinutes();
}

/** Applies a snapped time-of-day to an ISO datetime, keeping its date. */
export function withMinutesOfDay(iso: string, minutes: number): string {
  const d = new Date(iso);
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return d.toISOString();
}
