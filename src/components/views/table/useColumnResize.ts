/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useColumnResize.ts                                 :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:37:54 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 16:30:13 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState, useCallback } from 'react';
import { useStoreApi } from '../../../store/dbms/hardcoded/useDatabaseStore';

/** CSS custom property carrying a column's live width during a resize drag —
 *  header + cells read `var(<this>, <store width>px)`. Sanitized because
 *  live-mount prop ids come from engine column names, which may contain
 *  characters invalid in a custom-property name. */
export function colWidthVar(propId: string): string {
  return `--col-w-${propId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
}

/** Manages column resize interactions via mouse drag with RAF-throttled updates. */
export function useColumnResize(viewId: string, tableRef: React.RefObject<HTMLDivElement | null>) {
  const [resizingCol, setResizingCol] = useState<string | null>(null);
  const storeApi = useStoreApi();

  const handleResizeStart = useCallback((e: React.MouseEvent, propId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const s = storeApi.getState();
    const v = s.views[viewId];
    const startWidth = v?.settings?.columnWidths?.[propId] || 180;

    let latestWidth = startWidth;
    let rafId = 0;

    const handleMove = (ev: MouseEvent) => {
      latestWidth = Math.max(80, startWidth + ev.clientX - startX);
      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          rafId = 0;
          // Visual-only during the drag: a store write per frame replaced
          // state.views each RAF — busting the pages-for-view cache and
          // re-rendering every windowed row per frame. One CSS var on the
          // table element moves the whole column instead; the store commits
          // once, on mouseup.
          tableRef.current?.style.setProperty(colWidthVar(propId), `${latestWidth}px`);
        });
      }
    };

    const handleUp = () => {
      if (rafId) cancelAnimationFrame(rafId);
      setResizingCol(null);
      const store = storeApi.getState();
      const curView = store.views[viewId];
      if (curView) {
        store.updateViewSettings(viewId, {
          columnWidths: { ...curView.settings?.columnWidths, [propId]: latestWidth },
        });
      }
      // The committed width now renders via the var() fallback — drop the drag
      // var so later width changes (config panel, another view) aren't masked.
      tableRef.current?.style.removeProperty(colWidthVar(propId));
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };

    setResizingCol(propId);
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  }, [storeApi, viewId, tableRef]);

  return { resizingCol, handleResizeStart };
}

/** Returns a getter for column widths from the active view settings. */
export function useColWidth() {
  const storeApi = useStoreApi();
  return useCallback((propId: string) => {
    const s = storeApi.getState();
    const v = s.activeViewId ? s.views[s.activeViewId] : undefined;
    return v?.settings?.columnWidths?.[propId] || 180;
  }, [storeApi]);
}
