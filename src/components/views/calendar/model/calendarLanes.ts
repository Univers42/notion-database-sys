/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   calendarLanes.ts                                    :+:      :+:    :+:  */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── calendarLanes — week-row segmentation + first-fit lane packing ─────────
// Pure (no React/DOM). The Google-month model: cut each event per week row,
// pack with first-fit interval coloring (longer-first), keep an event on the
// lane it had in the previous week when free ("sticky"), so multi-week bars
// read as one continuous strip. Column-based (not date-based) so hidden
// weekends fall out naturally: a segment only spans VISIBLE days.

import type { CalendarGrid, CalEvent, DayKey, WeekSegment } from './calendarTypes';
import { sortForPacking } from './calendarEvents';

/** Cuts events into per-week-row segments over the grid's visible days. */
export function segmentIntoWeeks(
  events: readonly CalEvent[],
  grid: CalendarGrid,
): WeekSegment[] {
  const segments: WeekSegment[] = [];
  for (const ev of events) {
    if (ev.endKey < grid.rangeStart || ev.startKey > grid.rangeEnd) continue;
    for (const week of grid.weeks) {
      const covered = week.filter(d => ev.startKey <= d.key && d.key <= ev.endKey);
      if (covered.length === 0) continue;
      const first = covered[0];
      const last = covered[covered.length - 1];
      segments.push({
        pageId: ev.pageId,
        weekIndex: first.weekIndex,
        startCol: first.col,
        endCol: last.col,
        continuesLeft: ev.startKey < first.key,
        continuesRight: ev.endKey > last.key,
        lane: -1,
        isRanged: ev.isRanged,
      });
    }
  }
  return segments;
}

const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number): boolean =>
  aStart <= bEnd && bStart <= aEnd;

/**
 * Assigns lanes: first-fit per week over inclusive [startCol..endCol], in
 * packing order (start asc → longer first), trying the event's previous-week
 * lane first for continuations. Pure and deterministic under shuffled input.
 */
export function packWeekLanes(
  segments: readonly WeekSegment[],
  events: readonly CalEvent[],
): WeekSegment[] {
  const order = new Map(sortForPacking(events).map((ev, i) => [ev.pageId, i]));
  const sorted = [...segments].sort((a, b) => {
    const byEvent = (order.get(a.pageId) ?? 0) - (order.get(b.pageId) ?? 0);
    return byEvent !== 0 ? byEvent : a.weekIndex - b.weekIndex;
  });

  const occupied = new Map<number, { start: number; end: number }[][]>(); // week → lane → spans
  const laneOf = new Map<string, number>(); // `${pageId}:${weekIndex}` → lane
  const packed: WeekSegment[] = [];

  for (const seg of sorted) {
    const lanes = occupied.get(seg.weekIndex) ?? [];
    occupied.set(seg.weekIndex, lanes);
    const fits = (lane: number): boolean =>
      !(lanes[lane] ?? []).some(s => overlaps(seg.startCol, seg.endCol, s.start, s.end));

    let lane = -1;
    if (seg.continuesLeft) {
      const sticky = laneOf.get(`${seg.pageId}:${seg.weekIndex - 1}`);
      if (sticky !== undefined && fits(sticky)) lane = sticky;
    }
    if (lane === -1) {
      lane = 0;
      while (!fits(lane)) lane++;
    }
    (lanes[lane] ??= []).push({ start: seg.startCol, end: seg.endCol });
    laneOf.set(`${seg.pageId}:${seg.weekIndex}`, lane);
    packed.push({ ...seg, lane });
  }
  return packed;
}

/** Segments that render as bars (lane under the cap). */
export function visibleSegments(
  segments: readonly WeekSegment[],
  maxLanes: number,
): WeekSegment[] {
  return segments.filter(s => s.lane < maxLanes);
}

/** Per-day hidden-event counts ("+N more") for lanes at/over the cap. */
export function overflowByDay(
  segments: readonly WeekSegment[],
  grid: CalendarGrid,
  maxLanes: number,
): Map<DayKey, number> {
  const counts = new Map<DayKey, number>();
  for (const seg of segments) {
    if (seg.lane < maxLanes) continue;
    const week = grid.weeks[seg.weekIndex] ?? [];
    for (const day of week) {
      if (day.col >= seg.startCol && day.col <= seg.endCol) {
        counts.set(day.key, (counts.get(day.key) ?? 0) + 1);
      }
    }
  }
  return counts;
}
