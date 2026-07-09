/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   calendarEvents.ts                                   :+:      :+:    :+:  */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── calendarEvents — property resolution + page→event normalization ────────
// Pure (no React/DOM; type-only imports).

import type { Page, SchemaProperty } from '../../../../types/database';
import type { CalEvent, DayKey } from './calendarTypes';
import { toDayKey, diffDayKeys } from './calendarGrid';

const DATE_TYPES = new Set(['date', 'due_date']);

/**
 * Resolves which properties drive the calendar: the view's "Show calendar by"
 * choice wins when it names a date property; else the first date property
 * (legacy behavior). The END property follows the start's schema pairing
 * (endPropertyId) — the same interval the table's date cell renders.
 */
export function resolveCalendarProps(
  properties: Record<string, SchemaProperty>,
  showCalendarBy: string | undefined,
): { startProp: SchemaProperty | null; endProp: SchemaProperty | null } {
  const chosen = showCalendarBy ? properties[showCalendarBy] : undefined;
  const startProp = (chosen && DATE_TYPES.has(chosen.type))
    ? chosen
    : Object.values(properties).find(p => DATE_TYPES.has(p.type)) ?? null;
  const endProp = startProp?.endPropertyId
    ? properties[startProp.endPropertyId] ?? null
    : null;
  return { startProp, endProp: endProp && DATE_TYPES.has(endProp.type) ? endProp : null };
}

function parseIso(value: unknown): Date | null {
  if (typeof value !== 'string' || !value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Normalizes a page onto calendar days. Missing/garbage start → null.
 * An end on/before the start collapses to a point event (mirrors the
 * timeline's bar geometry). endKey is the INCLUSIVE last day.
 */
export function pageToEvent(
  page: Page,
  startPropId: string,
  endPropId: string | null,
): CalEvent | null {
  const start = parseIso(page.properties[startPropId]);
  if (!start) return null;
  const startKey = toDayKey(start);
  const endRaw = endPropId ? parseIso(page.properties[endPropId]) : null;
  const endKey = endRaw ? toDayKey(endRaw) : startKey;
  const ranged = Boolean(endRaw) && endKey > startKey;
  return {
    pageId: page.id,
    startKey,
    endKey: ranged ? endKey : startKey,
    isRanged: Boolean(endRaw) && endKey >= startKey,
    startIso: String(page.properties[startPropId]),
    endIso: endRaw && endKey >= startKey ? String(page.properties[endPropId as string]) : null,
  };
}

export function eventDurationDays(ev: CalEvent): number {
  return diffDayKeys(ev.endKey, ev.startKey) + 1;
}

/** Packing order: start asc → longer first → pageId (deterministic). */
export function sortForPacking(events: readonly CalEvent[]): CalEvent[] {
  return [...events].sort((a, b) => {
    if (a.startKey !== b.startKey) return a.startKey < b.startKey ? -1 : 1;
    const d = eventDurationDays(b) - eventDurationDays(a);
    if (d !== 0) return d;
    return a.pageId < b.pageId ? -1 : a.pageId > b.pageId ? 1 : 0;
  });
}

/** All events covering `day`, in packing order (the day popover's list). */
export function eventsOnDay(events: readonly CalEvent[], day: DayKey): CalEvent[] {
  return sortForPacking(events.filter(ev => ev.startKey <= day && day <= ev.endKey));
}
