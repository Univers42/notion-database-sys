/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   calendarDragMath.ts                                 :+:      :+:    :+:  */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── calendarDragMath — hit-testing, previews, single-commit appliers ───────
// Pure (no React/DOM). Commit functions take injected updateProp/ensureEndProp
// callbacks (the timelineDragUtils shape) so they unit-test with stubs and the
// hook stays a thin wiring layer.

import { addDays } from 'date-fns';
import type { CalendarDragKind, CalEvent, CellRect, DayKey } from './calendarTypes';
import { diffDayKeys, fromDayKey } from './calendarGrid';

/**
 * Day under the pointer. Containment first; otherwise the NEAREST cell (by
 * clamped distance) so a drag never "loses" the grid at its edges. Null only
 * for an empty snapshot.
 */
export function hitTestDay(cells: readonly CellRect[], x: number, y: number): DayKey | null {
  let best: CellRect | null = null;
  let bestDist = Infinity;
  for (const cell of cells) {
    const dx = Math.max(cell.left - x, 0, x - cell.right);
    const dy = Math.max(cell.top - y, 0, y - cell.bottom);
    const dist = dx * dx + dy * dy;
    if (dist === 0) return cell.dayKey;
    if (dist < bestDist) { bestDist = dist; best = cell; }
  }
  return best?.dayKey ?? null;
}

export interface DragOrigin {
  startKey: DayKey;
  endKey: DayKey;
  /** The day the pointer went down on. */
  anchorKey: DayKey;
}

export interface DragPreview {
  startKey: DayKey;
  endKey: DayKey;
}

const shiftKey = (key: DayKey, days: number): DayKey => {
  const d = addDays(fromDayKey(key), days);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/**
 * The live range for a drag. move preserves duration; resizes clamp so the
 * range never inverts (collapsing to a point at worst); create draws in both
 * directions from the anchor.
 */
export function previewDrag(
  kind: CalendarDragKind,
  origin: DragOrigin,
  currentKey: DayKey,
): DragPreview {
  if (kind === 'move') {
    const delta = diffDayKeys(currentKey, origin.anchorKey);
    return { startKey: shiftKey(origin.startKey, delta), endKey: shiftKey(origin.endKey, delta) };
  }
  if (kind === 'resize-left') {
    return {
      startKey: currentKey <= origin.endKey ? currentKey : origin.endKey,
      endKey: origin.endKey,
    };
  }
  if (kind === 'resize-right') {
    return {
      startKey: origin.startKey,
      endKey: currentKey >= origin.startKey ? currentKey : origin.startKey,
    };
  }
  // create
  return currentKey < origin.anchorKey
    ? { startKey: currentKey, endKey: origin.anchorKey }
    : { startKey: origin.anchorKey, endKey: currentKey };
}

/** Shifts an ISO datetime by whole days, keeping its time-of-day. */
export function shiftIsoPreservingTime(iso: string, days: number): string {
  return addDays(new Date(iso), days).toISOString();
}

type UpdateFn = (pageId: string, propId: string, value: string) => void;
type EnsureFn = () => { id: string } | null;

/** Move: shift start (and end when ranged) by the drag delta. Never creates
 *  an end property (mirrors timeline applyMoveDrag). */
export function applyMoveDrag(
  ev: CalEvent,
  deltaDays: number,
  startPropId: string,
  updateProp: UpdateFn,
  ensureEndProp: EnsureFn,
): void {
  if (deltaDays === 0) return;
  updateProp(ev.pageId, startPropId, shiftIsoPreservingTime(ev.startIso, deltaDays));
  if (!ev.endIso) return;
  const endProp = ensureEndProp();
  if (endProp) updateProp(ev.pageId, endProp.id, shiftIsoPreservingTime(ev.endIso, deltaDays));
}

/** Resize-left: move the start to `newStartKey` (time-of-day preserved). */
export function applyResizeStartDrag(
  ev: CalEvent,
  newStartKey: DayKey,
  startPropId: string,
  updateProp: UpdateFn,
): void {
  const delta = diffDayKeys(newStartKey, ev.startKey);
  if (delta === 0) return;
  updateProp(ev.pageId, startPropId, shiftIsoPreservingTime(ev.startIso, delta));
}

/** Resize-right: write the end — the gesture that upgrades a point event to
 *  a range (creates + pairs the End Date property on first use). */
export function applyResizeEndDrag(
  ev: CalEvent,
  newEndKey: DayKey,
  updateProp: UpdateFn,
  ensureEndProp: EnsureFn,
): void {
  const endProp = ensureEndProp();
  if (!endProp) return;
  const base = ev.endIso ?? ev.startIso;
  const baseKey = ev.endIso ? ev.endKey : ev.startKey;
  updateProp(ev.pageId, endProp.id, shiftIsoPreservingTime(base, diffDayKeys(newEndKey, baseKey)));
}

/** Properties for a drag-created page: start always, end only for a span. */
export function buildCreateProperties(
  preview: DragPreview,
  startPropId: string,
  endPropId: string | null,
): Record<string, string> {
  const props: Record<string, string> = {
    [startPropId]: fromDayKey(preview.startKey).toISOString(),
  };
  if (endPropId && preview.endKey !== preview.startKey) {
    props[endPropId] = fromDayKey(preview.endKey).toISOString();
  }
  return props;
}
