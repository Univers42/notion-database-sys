/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useCalendarDrag.ts                                  :+:      :+:    :+:  */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── useCalendarDrag — month-grid drag state machine ────────────────────────
// House rule (timeline/useWidgetDrag): pointer capture at down, cell rects
// snapshotted from [data-cal-day], DOM/local state only during the gesture,
// Escape aborts, the SINGLE store commit happens on pointer-up. Holding the
// pointer at the grid's left/right edge pages the month (rollover) and
// re-snapshots after the new grid paints.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  hitTestDay, previewDrag,
  applyMoveDrag, applyResizeStartDrag, applyResizeEndDrag, buildCreateProperties,
} from './model/calendarDragMath';
import type { DragOrigin, DragPreview } from './model/calendarDragMath';
import { diffDayKeys } from './model/calendarGrid';
import { CAL_ROLLOVER_DELAY_MS, CAL_ROLLOVER_ZONE } from './model/calendarTypes';
import type { CalendarDragKind, CalEvent, CellRect, DayKey } from './model/calendarTypes';

export interface CalendarDragState {
  kind: CalendarDragKind;
  pageId: string | null;
  event: CalEvent | null;
  origin: DragOrigin;
  preview: DragPreview;
  hasMoved: boolean;
}

interface Options {
  rootRef: React.RefObject<HTMLElement | null>;
  startPropId: string | undefined;
  endPropId: string | null;
  databaseId: string | undefined;
  updatePageProperty: (pageId: string, propId: string, value: string) => void;
  addPage: (databaseId: string, properties: Record<string, string>) => void;
  ensureEndProp: () => { id: string } | null;
  onNavigate: (direction: -1 | 1) => void;
}

const collectCells = (root: HTMLElement): CellRect[] =>
  [...root.querySelectorAll<HTMLElement>('[data-cal-day]')].map(el => {
    const rect = el.getBoundingClientRect();
    return { dayKey: el.dataset.calDay as DayKey, left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
  });

export function useCalendarDrag({
  rootRef, startPropId, endPropId, databaseId,
  updatePageProperty, addPage, ensureEndProp, onNavigate,
}: Options) {
  const [drag, setDrag] = useState<CalendarDragState | null>(null);
  const cellsRef = useRef<CellRect[]>([]);
  const rolloverRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClickRef = useRef(false);
  // Escape sets this synchronously; pointer-up reads it — so an Escape then an
  // immediate release still aborts even before React re-renders drag to null.
  const abortRef = useRef(false);

  const clearRollover = (): void => {
    if (rolloverRef.current) { clearTimeout(rolloverRef.current); rolloverRef.current = null; }
  };

  const begin = useCallback((
    e: React.PointerEvent, kind: CalendarDragKind, anchorKey: DayKey, event: CalEvent | null,
  ): void => {
    if (!startPropId) return;
    e.preventDefault();
    e.stopPropagation();
    // setPointerCapture keeps the gesture on this element even if the pointer
    // leaves it; guard because a detached/synthetic target can throw.
    try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch { /* non-fatal */ }
    if (rootRef.current) cellsRef.current = collectCells(rootRef.current);
    suppressClickRef.current = false;
    abortRef.current = false;
    const origin: DragOrigin = {
      startKey: event?.startKey ?? anchorKey,
      endKey: event?.endKey ?? anchorKey,
      anchorKey,
    };
    setDrag({
      kind, pageId: event?.pageId ?? null, event, origin,
      preview: { startKey: origin.startKey, endKey: origin.endKey },
      hasMoved: false,
    });
  }, [rootRef, startPropId]);

  // Escape aborts an in-flight drag without committing (escape route).
  useEffect(() => {
    if (!drag) return;
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') { abortRef.current = true; clearRollover(); setDrag(null); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [drag]);

  const armRollover = useCallback((clientX: number): void => {
    const root = rootRef.current?.querySelector('[data-cal-grid]') ?? rootRef.current;
    if (!root) return;
    const rect = (root as HTMLElement).getBoundingClientRect();
    const dir: -1 | 1 | 0 = clientX < rect.left + CAL_ROLLOVER_ZONE ? -1
      : clientX > rect.right - CAL_ROLLOVER_ZONE ? 1 : 0;
    if (dir === 0) { clearRollover(); return; }
    if (rolloverRef.current) return; // already armed
    rolloverRef.current = setTimeout(() => {
      rolloverRef.current = null;
      onNavigate(dir);
      // The new month paints on the next frame — then rects are valid again.
      requestAnimationFrame(() => {
        if (rootRef.current) cellsRef.current = collectCells(rootRef.current);
      });
    }, CAL_ROLLOVER_DELAY_MS);
  }, [onNavigate, rootRef]);

  const handlePointerMove = useCallback((e: React.PointerEvent): void => {
    if (!drag) return;
    const dayKey = hitTestDay(cellsRef.current, e.clientX, e.clientY);
    if (!dayKey) return;
    armRollover(e.clientX);
    const preview = previewDrag(drag.kind, drag.origin, dayKey);
    const moved = drag.hasMoved || dayKey !== drag.origin.anchorKey;
    if (!moved && preview.startKey === drag.preview.startKey && preview.endKey === drag.preview.endKey) return;
    setDrag(prev => (prev ? { ...prev, preview, hasMoved: moved } : null));
  }, [drag, armRollover]);

  const handlePointerUp = useCallback((e: React.PointerEvent): void => {
    if (!drag || !startPropId) return;
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* non-fatal */ }
    // Escape may have fired between the last render and this release — the
    // closure's `drag` is stale, so honour the synchronous abort flag.
    if (abortRef.current) { abortRef.current = false; clearRollover(); setDrag(null); return; }
    clearRollover();
    const { kind, event, preview, hasMoved } = drag;
    setDrag(null);
    if (hasMoved) suppressClickRef.current = true;

    // The ONLY store writes of the whole gesture:
    if (kind === 'create') {
      if (!databaseId) return;
      const span = preview.endKey !== preview.startKey;
      const endId = span ? (ensureEndProp()?.id ?? null) : endPropId;
      addPage(databaseId, buildCreateProperties(preview, startPropId, endId));
      return;
    }
    if (!event || !hasMoved) return;
    if (kind === 'move') {
      applyMoveDrag(event, diffDayKeys(preview.startKey, event.startKey), startPropId, updatePageProperty, ensureEndProp);
    } else if (kind === 'resize-left') {
      applyResizeStartDrag(event, preview.startKey, startPropId, updatePageProperty);
    } else {
      applyResizeEndDrag(event, preview.endKey, updatePageProperty, ensureEndProp);
    }
  }, [drag, startPropId, endPropId, databaseId, addPage, updatePageProperty, ensureEndProp]);

  useEffect(() => () => clearRollover(), []);

  return { drag, suppressClickRef, begin, handlePointerMove, handlePointerUp };
}
