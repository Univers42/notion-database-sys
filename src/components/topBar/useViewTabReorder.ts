/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useViewTabReorder.ts                               :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * Drag-to-reorder for the header view tabs: grab a tab and drop it in a new
 * slot. HTML5 drag-and-drop picks the order (reusing the row-reorder helper
 * `buildManualRowOrder`); a FLIP pass then slides every moved tab from its old
 * position to its new one, so the reorder is an interpolation, not a jump.
 * No drag library — native DnD + one CSS transform.
 */

import React, { useLayoutEffect, useRef, useState } from 'react';
import { buildManualRowOrder } from '../../lib/manualRowOrder';

const FLIP_MS = 220;
const FLIP_EASE = 'cubic-bezier(0.22, 0.61, 0.36, 1)';

function reducedMotion(): boolean {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch { return false; }
}

interface OrderedView { id: string }

export interface ViewTabDragProps {
  draggable: true;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

export interface ViewTabReorder {
  dragViewId: string | null;
  dropTargetId: string | null;
  registerTab: (id: string) => (el: HTMLElement | null) => void;
  tabDragProps: (id: string) => ViewTabDragProps;
}

export function useViewTabReorder(
  dbViews: readonly OrderedView[],
  databaseId: string,
  reorderViews: (databaseId: string, orderedIds: string[]) => void,
): ViewTabReorder {
  const [dragViewId, setDragViewId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const tabRefs = useRef(new Map<string, HTMLElement>());
  const flipFrom = useRef<Map<string, number> | null>(null);

  // FLIP: after the reorder re-render, pin each moved tab back at its old x
  // (no transition), then release to 0 next frame so it slides into place.
  useLayoutEffect(() => {
    const from = flipFrom.current;
    if (!from) return;
    flipFrom.current = null;
    const moved: HTMLElement[] = [];
    tabRefs.current.forEach((el, id) => {
      const prev = from.get(id);
      if (prev === undefined) return;
      const dx = prev - el.getBoundingClientRect().left;
      if (!dx) return;
      el.style.transition = 'none';
      el.style.transform = `translateX(${dx}px)`;
      moved.push(el);
    });
    if (moved.length === 0) return;
    const raf = requestAnimationFrame(() => {
      for (const el of moved) {
        el.style.transition = `transform ${FLIP_MS}ms ${FLIP_EASE}`;
        el.style.transform = '';
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [dbViews]);

  const drop = (targetId: string): void => {
    const dragged = dragViewId;
    setDragViewId(null);
    setDropTargetId(null);
    if (!dragged || dragged === targetId) return;
    const order = buildManualRowOrder(dbViews.map((v) => v.id), dragged, targetId);
    if (!order) return;
    if (!reducedMotion()) {
      const from = new Map<string, number>();
      tabRefs.current.forEach((el, id) => from.set(id, el.getBoundingClientRect().left));
      flipFrom.current = from;
    }
    reorderViews(databaseId, order);
  };

  const registerTab = (id: string) => (el: HTMLElement | null) => {
    if (el) tabRefs.current.set(id, el);
    else tabRefs.current.delete(id);
  };

  const tabDragProps = (id: string): ViewTabDragProps => ({
    draggable: true,
    onDragStart: (e) => {
      setDragViewId(id);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', id);
    },
    onDragOver: (e) => {
      if (dragViewId && dragViewId !== id) { e.preventDefault(); setDropTargetId(id); }
    },
    onDrop: (e) => { e.preventDefault(); drop(id); },
    onDragEnd: () => { setDragViewId(null); setDropTargetId(null); },
  });

  return { dragViewId, dropTargetId, registerTab, tabDragProps };
}
