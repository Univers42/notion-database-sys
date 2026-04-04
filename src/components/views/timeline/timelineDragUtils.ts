/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   timelineDragUtils.ts                               :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 23:30:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 23:30:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { addDays } from 'date-fns';
import { clampDuration, type BarGeometry } from './TimelineViewHelpers';
import { type DragKind, EDGE_SCROLL_ZONE, EDGE_SCROLL_SPEED } from './timelineTypes';

/** Handle edge auto-scrolling during a drag operation. */
export function handleAutoScroll(
  clientX: number,
  scrollEl: HTMLDivElement | null,
  autoScrollRef: React.RefObject<number | null>,
  dragActive: boolean,
): void {
  if (!scrollEl) return;
  const rect = scrollEl.getBoundingClientRect();
  const xInContainer = clientX - rect.left;
  if (autoScrollRef.current) cancelAnimationFrame(autoScrollRef.current);

  if (xInContainer < EDGE_SCROLL_ZONE) {
    const step = () => {
      if (!scrollEl || !dragActive) return;
      scrollEl.scrollLeft = Math.max(0, scrollEl.scrollLeft - EDGE_SCROLL_SPEED);
      autoScrollRef.current = requestAnimationFrame(step);
    };
    autoScrollRef.current = requestAnimationFrame(step);
  } else if (xInContainer > rect.width - EDGE_SCROLL_ZONE) {
    const step = () => {
      if (!scrollEl || !dragActive) return;
      scrollEl.scrollLeft += EDGE_SCROLL_SPEED;
      autoScrollRef.current = requestAnimationFrame(step);
    };
    autoScrollRef.current = requestAnimationFrame(step);
  } else {
    autoScrollRef.current = null;
  }
}

/** Compute the drag position (left/width) based on drag kind and delta. */
export function computeDragPosition(
  kind: DragKind,
  originBar: BarGeometry,
  delta: number,
  cellWidth: number,
): { liveLeft: number; liveWidth: number } {
  if (kind === 'move') {
    return {
      liveLeft: (originBar.startDay + delta) * cellWidth,
      liveWidth: originBar.width,
    };
  }
  if (kind === 'resize-left') {
    const { s, e } = clampDuration(originBar.startDay + delta, originBar.endDay);
    return { liveLeft: s * cellWidth, liveWidth: (e - s) * cellWidth };
  }
  // resize-right
  const { s, e } = clampDuration(originBar.startDay, originBar.endDay + delta);
  return { liveLeft: s * cellWidth, liveWidth: (e - s) * cellWidth };
}

/** Apply drag delta for the 'move' kind. */
export function applyMoveDrag(
  originBar: BarGeometry, delta: number, pageId: string,
  startDate: Date, startPropId: string,
  updateProp: (pid: string, propId: string, val: string) => void,
  ensureEndProp: () => { id: string } | null,
): void {
  const newStart = addDays(startDate, originBar.startDay + delta);
  updateProp(pageId, startPropId, newStart.toISOString());
  if (!originBar.hasEndDate) return;
  const ep = ensureEndProp();
  if (!ep) return;
  const newEnd = addDays(startDate, originBar.endDay + delta);
  updateProp(pageId, ep.id, newEnd.toISOString());
}

/** Apply drag delta for the 'resize-left' kind. */
export function applyResizeLeftDrag(
  originBar: BarGeometry, delta: number, pageId: string,
  startDate: Date, startPropId: string,
  updateProp: (pid: string, propId: string, val: string) => void,
  ensureEndProp: () => { id: string } | null,
): void {
  const { s } = clampDuration(originBar.startDay + delta, originBar.endDay);
  updateProp(pageId, startPropId, addDays(startDate, s).toISOString());
  if (originBar.hasEndDate) return;
  const ep = ensureEndProp();
  if (!ep) return;
  updateProp(pageId, ep.id, addDays(startDate, originBar.endDay).toISOString());
}

/** Apply drag delta for the 'resize-right' kind. */
export function applyResizeRightDrag(
  originBar: BarGeometry, delta: number, pageId: string,
  startDate: Date,
  updateProp: (pid: string, propId: string, val: string) => void,
  ensureEndProp: () => { id: string } | null,
): void {
  const { e: end } = clampDuration(originBar.startDay, originBar.endDay + delta);
  const ep = ensureEndProp();
  if (!ep) return;
  updateProp(pageId, ep.id, addDays(startDate, end).toISOString());
}
