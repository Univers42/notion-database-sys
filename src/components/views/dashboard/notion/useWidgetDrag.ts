/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useWidgetDrag.ts                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 12:00:00 by dlesieur          #+#    #+#             */
/*                                                +#+#+#+#+#+   ++#+          */
/* ************************************************************************** */

/**
 * Pointer drag for dashboard widgets. House rule (workspace-grid): NO store
 * writes during the drag — geometry is snapshotted from the DOM at start
 * (and on ANY scroll: the page scroller moves the cards as much as the
 * dashboard's own), the indicator and ghost are positioned with direct style
 * writes, and the single store commit happens on pointer-up through the
 * pure moveWidget mutation. Escape / pointercancel abandon the gesture.
 */

import { useRef, useCallback } from 'react';
import { hitTestDropTarget, type RowGeometry, type DropResolution } from './model/dashboardDragTarget';
import type { MoveTarget } from './model/dashboardLayoutMove';

interface WidgetDragOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  indicatorRef: React.RefObject<HTMLDivElement | null>;
  /** Title chip that follows the pointer. */
  ghostRef?: React.RefObject<HTMLDivElement | null>;
  onDrop: (widgetId: string, target: MoveTarget) => void;
}

/** Distance from the scroller edge where autoscroll starts, and its peak
 *  speed in px per frame. */
const AUTOSCROLL_EDGE = 56;
const AUTOSCROLL_MAX = 18;

function collectGeometry(container: HTMLElement, widgetId: string): RowGeometry[] {
  return [...container.querySelectorAll<HTMLElement>('[data-dash-row]')].map((rowEl) => {
    const rect = rowEl.getBoundingClientRect();
    const cols = [...rowEl.querySelectorAll<HTMLElement>('[data-dash-col]')];
    const slots = cols.map((colEl) => {
      const colRect = colEl.getBoundingClientRect();
      const cards = [...colEl.querySelectorAll<HTMLElement>('[data-dash-widget]')];
      return {
        left: colRect.left, right: colRect.right,
        cards: cards.map((card) => {
          const cardRect = card.getBoundingClientRect();
          return { top: cardRect.top, bottom: cardRect.bottom };
        }),
        containsSource: cards.some((card) => card.dataset.dashWidget === widgetId),
        soleSource: cards.length === 1 && cards[0].dataset.dashWidget === widgetId,
      };
    });
    return {
      rowId: rowEl.dataset.dashRow ?? '',
      top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right,
      slots,
      containsSource: slots.some((slot) => slot.containsSource),
      sourceAloneColumn: slots.some((slot) => slot.soleSource),
    };
  });
}

function paintIndicator(indicator: HTMLElement, resolution: DropResolution): void {
  const geometry = resolution.indicator;
  if (!geometry) {
    indicator.style.display = 'none';
    return;
  }
  indicator.dataset.blocked = String(resolution.blocked);
  if (geometry.kind === 'slot') {
    indicator.style.left = `${geometry.x - 2}px`;
    indicator.style.top = `${geometry.top}px`;
    indicator.style.width = '4px';
    indicator.style.height = `${geometry.bottom - geometry.top}px`;
  } else {
    // 'row' and 'stack' both paint a horizontal insertion bar.
    indicator.style.left = `${geometry.left}px`;
    indicator.style.top = `${geometry.y - 2}px`;
    indicator.style.width = `${geometry.right - geometry.left}px`;
    indicator.style.height = '4px';
  }
  indicator.style.display = 'block';
}

/** The element that actually scrolls the dashboard: its own container when
 *  it overflows, else the nearest scrolling ancestor (an inline dashboard
 *  scrolls with its page). */
function scrollerOf(container: HTMLElement): HTMLElement {
  for (let el: HTMLElement | null = container; el; el = el.parentElement) {
    const { overflowY } = getComputedStyle(el);
    if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) return el;
  }
  return (document.scrollingElement as HTMLElement | null) ?? document.documentElement;
}

/** Signed autoscroll step for pointer y inside the scroller's visible box. */
function autoscrollStep(scroller: HTMLElement, y: number): number {
  const isRoot = scroller === document.scrollingElement || scroller === document.documentElement;
  const top = isRoot ? 0 : scroller.getBoundingClientRect().top;
  const bottom = isRoot ? window.innerHeight : scroller.getBoundingClientRect().bottom;
  if (y < top + AUTOSCROLL_EDGE) return -AUTOSCROLL_MAX * Math.min(1, (top + AUTOSCROLL_EDGE - y) / AUTOSCROLL_EDGE);
  if (y > bottom - AUTOSCROLL_EDGE) return AUTOSCROLL_MAX * Math.min(1, (y - bottom + AUTOSCROLL_EDGE) / AUTOSCROLL_EDGE);
  return 0;
}

/** Returns a pointerdown starter for the widget drag handle. */
export function useWidgetDrag({ containerRef, indicatorRef, ghostRef, onDrop }: WidgetDragOptions) {
  const session = useRef<{ widgetId: string; rows: RowGeometry[]; resolution: DropResolution } | null>(null);

  const startDrag = useCallback((widgetId: string, event: React.PointerEvent) => {
    const container = containerRef.current;
    const indicator = indicatorRef.current;
    if (!container || !indicator) return;
    event.preventDefault();
    const ghost = ghostRef?.current ?? null;
    const sourceCell = container.querySelector<HTMLElement>(`[data-dash-widget="${widgetId}"]`);
    const scroller = scrollerOf(container);
    const pointer = { x: event.clientX, y: event.clientY };
    let frame = 0;
    session.current = {
      widgetId,
      rows: collectGeometry(container, widgetId),
      resolution: { target: null, blocked: false, indicator: null },
    };
    if (sourceCell) sourceCell.style.opacity = '0.45';
    if (ghost) ghost.textContent = sourceCell?.querySelector('[data-dash-title]')?.textContent || 'Widget';
    document.body.style.cursor = 'grabbing';

    const resolve = () => {
      const current = session.current;
      if (!current) return;
      current.resolution = hitTestDropTarget(current.rows, pointer.x, pointer.y);
      paintIndicator(indicator, current.resolution);
      document.body.style.cursor = current.resolution.blocked ? 'not-allowed' : 'grabbing';
    };
    const tick = () => {
      const step = autoscrollStep(scroller, pointer.y);
      // The scroll event re-snapshots geometry and re-resolves.
      if (step !== 0) scroller.scrollBy(0, step);
      frame = step === 0 ? 0 : requestAnimationFrame(tick);
    };
    const onMove = (move: PointerEvent) => {
      pointer.x = move.clientX;
      pointer.y = move.clientY;
      if (ghost) {
        ghost.style.transform = `translate(${pointer.x + 14}px, ${pointer.y + 14}px)`;
        ghost.style.display = 'block';
      }
      resolve();
      if (!frame) frame = requestAnimationFrame(tick);
    };
    const onScroll = () => {
      const current = session.current;
      if (!current) return;
      current.rows = collectGeometry(container, current.widgetId);
      resolve();
    };
    const finish = (commit: boolean) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('keydown', onKey, true);
      document.removeEventListener('scroll', onScroll, true);
      cancelAnimationFrame(frame);
      indicator.style.display = 'none';
      if (ghost) ghost.style.display = 'none';
      document.body.style.cursor = '';
      if (sourceCell) sourceCell.style.opacity = '';
      const current = session.current;
      session.current = null;
      // The ONLY store write of the whole gesture.
      if (commit && current?.resolution.target) onDrop(current.widgetId, current.resolution.target);
    };
    const onUp = () => finish(true);
    const onCancel = () => finish(false);
    const onKey = (key: KeyboardEvent) => {
      if (key.key !== 'Escape') return;
      key.stopPropagation();
      finish(false);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    window.addEventListener('keydown', onKey, true);
    document.addEventListener('scroll', onScroll, true);
  }, [containerRef, indicatorRef, ghostRef, onDrop]);

  return { startDrag };
}
