/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useCalendarTimeDrag.ts                              :+:      :+:    :+:  */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── useCalendarTimeDrag — slot-granular drags on the hour grid ─────────────
// Same single-commit discipline as the month drag, in 30-minute slots:
// move keeps the event's duration; resize moves the end; create draws a
// range from the press slot. Day columns are hit by x (data-cal-timecol),
// minutes by y inside the column.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { differenceInCalendarDays } from 'date-fns';
import { offsetPxToMinutes, withMinutesOfDay } from './model/calendarTimeGrid';
import { fromDayKey } from './model/calendarGrid';
import { shiftIsoPreservingTime } from './model/calendarDragMath';
import { MINUTES_PER_DAY, SLOT_MINUTES } from './model/calendarTypes';
import type { DayKey } from './model/calendarTypes';

export interface TimeDragState {
  kind: 'move' | 'resize-end' | 'create';
  pageId: string | null;
  dayKey: DayKey;
  /** Live minutes (already snapped). */
  startMin: number;
  endMin: number;
  hasMoved: boolean;
}

interface TimedOrigin {
  pageId: string;
  startIso: string;
  endIso: string | null;
  startMin: number;
  endMin: number;
}

interface Options {
  hourHeight: number;
  startPropId: string | undefined;
  databaseId: string | undefined;
  updatePageProperty: (pageId: string, propId: string, value: string) => void;
  addPage: (databaseId: string, properties: Record<string, string>) => void;
  ensureEndProp: () => { id: string } | null;
}

interface ColRect { dayKey: DayKey; left: number; right: number; top: number }

export function useCalendarTimeDrag({
  hourHeight, startPropId, databaseId, updatePageProperty, addPage, ensureEndProp,
}: Options) {
  const [drag, setDrag] = useState<TimeDragState | null>(null);
  const originRef = useRef<TimedOrigin | null>(null);
  const anchorMinRef = useRef(0);
  const colsRef = useRef<ColRect[]>([]);
  const suppressClickRef = useRef(false);

  const snapshot = (root: HTMLElement): void => {
    colsRef.current = [...root.querySelectorAll<HTMLElement>('[data-cal-timecol]')].map(el => {
      const rect = el.getBoundingClientRect();
      return { dayKey: el.dataset.calTimecol as DayKey, left: rect.left, right: rect.right, top: rect.top };
    });
  };

  const locate = (clientX: number, clientY: number): { dayKey: DayKey; minutes: number } | null => {
    const cols = colsRef.current;
    if (cols.length === 0) return null;
    let col = cols.find(c => clientX >= c.left && clientX <= c.right)
      ?? (clientX < cols[0].left ? cols[0] : cols[cols.length - 1]);
    const minutes = Math.max(0, Math.min(MINUTES_PER_DAY - SLOT_MINUTES,
      offsetPxToMinutes(clientY - col.top, hourHeight)));
    return { dayKey: col.dayKey, minutes };
  };

  const begin = useCallback((
    e: React.PointerEvent, kind: TimeDragState['kind'],
    dayKey: DayKey, origin: TimedOrigin | null,
  ): void => {
    if (!startPropId) return;
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const root = (e.currentTarget as HTMLElement).closest('[data-cal-root]');
    if (root) snapshot(root as HTMLElement);
    const at = locate(e.clientX, e.clientY);
    const anchorMin = at?.minutes ?? origin?.startMin ?? 0;
    anchorMinRef.current = anchorMin;
    originRef.current = origin;
    suppressClickRef.current = false;
    setDrag({
      kind,
      pageId: origin?.pageId ?? null,
      dayKey,
      startMin: origin?.startMin ?? anchorMin,
      endMin: origin?.endMin ?? anchorMin + SLOT_MINUTES,
      hasMoved: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startPropId, hourHeight]);

  useEffect(() => {
    if (!drag) return;
    const onKeyDown = (e: KeyboardEvent): void => { if (e.key === 'Escape') setDrag(null); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [drag]);

  const handlePointerMove = useCallback((e: React.PointerEvent): void => {
    if (!drag) return;
    const at = locate(e.clientX, e.clientY);
    if (!at) return;
    setDrag(prev => {
      if (!prev) return null;
      const origin = originRef.current;
      if (prev.kind === 'move' && origin) {
        const duration = origin.endMin - origin.startMin;
        const start = Math.max(0, Math.min(MINUTES_PER_DAY - duration, at.minutes - (anchorMinRef.current - origin.startMin)));
        return { ...prev, dayKey: at.dayKey, startMin: start, endMin: start + duration, hasMoved: true };
      }
      if (prev.kind === 'resize-end') {
        const end = Math.max(prev.startMin + SLOT_MINUTES, at.minutes);
        return { ...prev, endMin: end, hasMoved: true };
      }
      // create: draw both directions from the anchor slot (same day column)
      const a = anchorMinRef.current;
      const start = Math.min(a, at.minutes);
      const end = Math.max(a + SLOT_MINUTES, at.minutes);
      return { ...prev, dayKey: prev.dayKey, startMin: start, endMin: end, hasMoved: true };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag, hourHeight]);

  const handlePointerUp = useCallback((e: React.PointerEvent): void => {
    if (!drag || !startPropId) return;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    const { kind, dayKey, startMin, endMin, hasMoved } = drag;
    const origin = originRef.current;
    setDrag(null);
    if (hasMoved) suppressClickRef.current = true;

    // The ONLY store writes of the gesture:
    if (kind === 'create') {
      if (!databaseId) return;
      const startIso = withMinutesOfDay(fromDayKey(dayKey).toISOString(), startMin);
      const props: Record<string, string> = { [startPropId]: startIso };
      const endProp = ensureEndProp();
      if (endProp) props[endProp.id] = withMinutesOfDay(fromDayKey(dayKey).toISOString(), endMin);
      addPage(databaseId, props);
      return;
    }
    if (!origin || !hasMoved) return;
    if (kind === 'move') {
      const dayDelta = differenceInCalendarDays(fromDayKey(dayKey), new Date(origin.startIso));
      const movedStart = withMinutesOfDay(shiftIsoPreservingTime(origin.startIso, dayDelta), startMin);
      updatePageProperty(origin.pageId, startPropId, movedStart);
      if (origin.endIso) {
        const movedEnd = withMinutesOfDay(shiftIsoPreservingTime(origin.endIso, dayDelta), endMin);
        const endProp = ensureEndProp();
        if (endProp) updatePageProperty(origin.pageId, endProp.id, movedEnd);
      }
      return;
    }
    // resize-end
    const endProp = ensureEndProp();
    if (!endProp) return;
    updatePageProperty(origin.pageId, endProp.id,
      withMinutesOfDay(origin.endIso ?? origin.startIso, endMin));
  }, [drag, startPropId, databaseId, addPage, updatePageProperty, ensureEndProp]);

  return { drag, suppressClickRef, begin, handlePointerMove, handlePointerUp };
}
