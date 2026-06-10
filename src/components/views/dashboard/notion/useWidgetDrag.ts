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
 * (and on scroll), the indicator element is positioned with direct style
 * writes, and the single store commit happens on pointer-up through the
 * pure moveWidget mutation.
 */

import { useRef, useCallback } from 'react';
import { hitTestDropTarget, type RowGeometry, type DropResolution } from './model/dashboardDragTarget';
import type { MoveTarget } from './model/dashboardLayoutMove';

interface WidgetDragOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  indicatorRef: React.RefObject<HTMLDivElement | null>;
  onDrop: (widgetId: string, target: MoveTarget) => void;
}

function collectGeometry(container: HTMLElement, widgetId: string): RowGeometry[] {
  return [...container.querySelectorAll<HTMLElement>('[data-dash-row]')].map((rowEl) => {
    const rect = rowEl.getBoundingClientRect();
    const cells = [...rowEl.querySelectorAll<HTMLElement>('[data-dash-widget]')];
    return {
      rowId: rowEl.dataset.dashRow ?? '',
      top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right,
      slots: cells.map((cell) => {
        const cellRect = cell.getBoundingClientRect();
        return { left: cellRect.left, right: cellRect.right };
      }),
      containsSource: cells.some((cell) => cell.dataset.dashWidget === widgetId),
    };
  });
}

function paintIndicator(indicator: HTMLElement, resolution: DropResolution): void {
  const geometry = resolution.indicator;
  if (!geometry) {
    indicator.style.display = 'none';
    return;
  }
  indicator.style.display = 'block';
  if (geometry.kind === 'slot') {
    indicator.style.left = `${geometry.x - 2}px`;
    indicator.style.top = `${geometry.top}px`;
    indicator.style.width = '4px';
    indicator.style.height = `${geometry.bottom - geometry.top}px`;
  } else {
    indicator.style.left = `${geometry.left}px`;
    indicator.style.top = `${geometry.y - 2}px`;
    indicator.style.width = `${geometry.right - geometry.left}px`;
    indicator.style.height = '4px';
  }
}

/** Returns a pointerdown starter for the widget drag handle. */
export function useWidgetDrag({ containerRef, indicatorRef, onDrop }: WidgetDragOptions) {
  const session = useRef<{ widgetId: string; rows: RowGeometry[]; resolution: DropResolution } | null>(null);

  const startDrag = useCallback((widgetId: string, event: React.PointerEvent) => {
    const container = containerRef.current;
    const indicator = indicatorRef.current;
    if (!container || !indicator) return;
    event.preventDefault();
    const sourceCell = container.querySelector<HTMLElement>(`[data-dash-widget="${widgetId}"]`);
    session.current = {
      widgetId,
      rows: collectGeometry(container, widgetId),
      resolution: { target: null, blocked: false, indicator: null },
    };
    if (sourceCell) sourceCell.style.opacity = '0.45';
    document.body.style.cursor = 'grabbing';

    const onMove = (move: PointerEvent) => {
      const current = session.current;
      if (!current) return;
      current.resolution = hitTestDropTarget(current.rows, move.clientX, move.clientY);
      indicator.style.background = current.resolution.blocked ? 'var(--osio-danger, #e03131)' : '';
      paintIndicator(indicator, current.resolution);
    };
    const onScroll = () => {
      const current = session.current;
      if (current) current.rows = collectGeometry(container, current.widgetId);
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      container.removeEventListener('scroll', onScroll, true);
      indicator.style.display = 'none';
      document.body.style.cursor = '';
      if (sourceCell) sourceCell.style.opacity = '';
      const current = session.current;
      session.current = null;
      // The ONLY store write of the whole gesture.
      if (current?.resolution.target) onDrop(current.widgetId, current.resolution.target);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    container.addEventListener('scroll', onScroll, true);
  }, [containerRef, indicatorRef, onDrop]);

  return { startDrag };
}
