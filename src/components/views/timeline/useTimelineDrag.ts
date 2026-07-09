/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useTimelineDrag.ts                                 :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 23:30:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 16:30:13 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useStoreApi } from '../../../store/dbms/hardcoded/useDatabaseStore';
import { findDateProperties, type BarGeometry } from './TimelineViewHelpers';
import type { SchemaProperty } from '../../../types/database';
import type { DragKind, DragState } from './timelineTypes';
import { handleAutoScroll, computeDragPosition, applyMoveDrag, applyResizeLeftDrag, applyResizeRightDrag, applyCreateDrag } from './timelineDragUtils';

interface UseTimelineDragOptions {
  cellWidth: number;
  startDate: Date;
  startPropId: string;
  /** The view-selected end property (Dates menu); null → name heuristic. */
  endPropId: string | null;
  dbId: string;
  updatePageProperty: (pageId: string, propId: string, val: string) => void;
}

export function useTimelineDrag({
  cellWidth, startDate, startPropId, endPropId, dbId, updatePageProperty,
}: UseTimelineDragOptions) {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef<number | null>(null);
  const storeApi = useStoreApi();

  const getDayFromMouse = useCallback(
    (clientX: number): number => {
      if (!scrollRef.current) return 0;
      return Math.floor((clientX - scrollRef.current.getBoundingClientRect().left + scrollRef.current.scrollLeft) / cellWidth);
    },
    [cellWidth],
  );

  const findEndProp = useCallback((): SchemaProperty | null => {
    if (!dbId) return null;
    const freshDb = storeApi.getState().databases[dbId];
    if (!freshDb) return null;
    // The view's explicit choice wins, then the start property's SCHEMA
    // pairing (the same interval the table cell renders), then heuristics.
    if (endPropId && freshDb.properties[endPropId]) return freshDb.properties[endPropId];
    const paired = freshDb.properties[startPropId]?.endPropertyId;
    if (paired && freshDb.properties[paired]) return freshDb.properties[paired];
    const { endProp } = findDateProperties(freshDb.properties);
    if (endProp) return endProp;
    return Object.values(freshDb.properties).find(
      p => p.name === 'End Date' && (p.type === 'date' || p.type === 'due_date'),
    ) ?? null;
  }, [dbId, endPropId, startPropId, storeApi]);

  const ensureEndProp = useCallback((): SchemaProperty | null => {
    if (!dbId) return null;
    let endProp = findEndProp();
    if (!endProp) {
      storeApi.getState().addProperty(dbId, 'End Date', 'date');
      const updatedDb = storeApi.getState().databases[dbId];
      endProp = updatedDb
        ? Object.values(updatedDb.properties).find(
            p => p.name === 'End Date' && (p.type === 'date' || p.type === 'due_date'),
          ) ?? null
        : null;
    }
    // Record the pairing on the start property, so the table's date cell
    // renders the SAME interval this drag writes ("start → end").
    if (endProp && startPropId && endProp.id !== startPropId) {
      const state = storeApi.getState();
      if (state.databases[dbId]?.properties[startPropId]?.endPropertyId !== endProp.id) {
        state.updateProperty(dbId, startPropId, { endPropertyId: endProp.id });
      }
    }
    return endProp;
  }, [dbId, findEndProp, startPropId, storeApi]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, pageId: string, kind: DragKind, bar: BarGeometry) => {
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setDragState({
        pageId,
        kind,
        originDayIdx: getDayFromMouse(e.clientX),
        originBar: bar,
        liveLeft: bar.left,
        liveWidth: bar.width,
        hasMoved: false,
      });
    },
    [getDayFromMouse],
  );

  /** Start DRAWING a range on a dateless record's lane (grab-and-slide create). */
  const beginCreate = useCallback(
    (e: React.PointerEvent, pageId: string, dayIdx: number) => {
      const ghost: BarGeometry = {
        left: dayIdx * cellWidth, width: cellWidth, visible: true,
        startDay: dayIdx, endDay: dayIdx + 1, hasEndDate: false, isPoint: true,
      };
      handlePointerDown(e, pageId, 'create', ghost);
    },
    [cellWidth, handlePointerDown],
  );

  const cancelDrag = useCallback(() => {
    if (autoScrollRef.current) {
      cancelAnimationFrame(autoScrollRef.current);
      autoScrollRef.current = null;
    }
    setDragState(null);
  }, []);

  // Escape aborts an in-flight drag without committing (escape route).
  useEffect(() => {
    if (!dragState) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancelDrag();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [dragState, cancelDrag]);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState) return;
      const currentDay = getDayFromMouse(e.clientX);
      const delta = currentDay - dragState.originDayIdx;
      if (delta === 0 && !dragState.hasMoved) return;

      handleAutoScroll(e.clientX, scrollRef.current, autoScrollRef, !!dragState);

      const pos = computeDragPosition(dragState.kind, dragState.originBar, delta, cellWidth);
      setDragState(prev => prev ? { ...prev, ...pos, hasMoved: true } : null);
    },
    [dragState, getDayFromMouse, cellWidth],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState || !startPropId) return;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);

      if (autoScrollRef.current) {
        cancelAnimationFrame(autoScrollRef.current);
        autoScrollRef.current = null;
      }

      const currentDay = getDayFromMouse(e.clientX);
      const delta = currentDay - dragState.originDayIdx;
      const { originBar, pageId, kind, hasMoved } = dragState;

      if (kind === 'create') {
        // A plain click (no move) still commits: single-day date on the record.
        applyCreateDrag(originBar, hasMoved ? delta : 0, pageId, startDate, startPropId, updatePageProperty, ensureEndProp);
      } else if (hasMoved && delta !== 0) {
        if (kind === 'move') {
          applyMoveDrag(originBar, delta, pageId, startDate, startPropId, updatePageProperty, ensureEndProp);
        } else if (kind === 'resize-left') {
          applyResizeLeftDrag(originBar, delta, pageId, startDate, startPropId, updatePageProperty, ensureEndProp);
        } else {
          applyResizeRightDrag(originBar, delta, pageId, startDate, updatePageProperty, ensureEndProp);
        }
      }

      setDragState(null);
    },
    [dragState, getDayFromMouse, startDate, startPropId, updatePageProperty, ensureEndProp],
  );

  return {
    dragState,
    scrollRef,
    findEndProp,
    ensureEndProp,
    beginCreate,
    cancelDrag,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
