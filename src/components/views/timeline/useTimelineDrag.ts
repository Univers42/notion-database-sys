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

import React, { useState, useRef, useCallback } from 'react';
import { useStoreApi } from '../../../store/dbms/hardcoded/useDatabaseStore';
import { findDateProperties, type BarGeometry } from './TimelineViewHelpers';
import type { SchemaProperty } from '../../../types/database';
import type { DragKind, DragState } from './timelineTypes';
import { handleAutoScroll, computeDragPosition, applyMoveDrag, applyResizeLeftDrag, applyResizeRightDrag } from './timelineDragUtils';

interface UseTimelineDragOptions {
  cellWidth: number;
  startDate: Date;
  startPropId: string;
  dbId: string;
  updatePageProperty: (pageId: string, propId: string, val: string) => void;
}

export function useTimelineDrag({
  cellWidth, startDate, startPropId, dbId, updatePageProperty,
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
    const { endProp } = findDateProperties(freshDb.properties);
    if (endProp) return endProp;
    return Object.values(freshDb.properties).find(
      p => p.name === 'End Date' && (p.type === 'date' || p.type === 'due_date'),
    ) ?? null;
  }, [dbId, storeApi]);

  const ensureEndProp = useCallback((): SchemaProperty | null => {
    if (!dbId) return null;
    const existing = findEndProp();
    if (existing) return existing;
    storeApi.getState().addProperty(dbId, 'End Date', 'date');
    const updatedDb = storeApi.getState().databases[dbId];
    if (!updatedDb) return null;
    return Object.values(updatedDb.properties).find(
      p => p.name === 'End Date' && (p.type === 'date' || p.type === 'due_date'),
    ) ?? null;
  }, [dbId, findEndProp, storeApi]);

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

      if (hasMoved && delta !== 0) {
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
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
