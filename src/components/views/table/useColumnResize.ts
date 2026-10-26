/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useColumnResize.ts                                 :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:37:54 by dlesieur          #+#    #+#             */
/*   Updated: 2026/10/26 15:30:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState, useCallback } from 'react';
import { useStoreApi } from '../../../store/dbms/hardcoded/useDatabaseStore';

/** Narrowest a column can be dragged or keyed to. */
export const MIN_COL_WIDTH = 80;

function setCellWidth(cell: HTMLElement, px: string) {
  cell.style.width = px;
  cell.style.minWidth = px;
  cell.style.maxWidth = px;
}

/** Column resize by mouse drag, one width write per animation frame. */
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

    // The drag writes the width onto the column's own cells, found once. It
    // used to set one CSS custom property on the table container, but a custom
    // property inherits, so every write restyled every descendant: 67 ms per
    // frame on 8.4k nodes against 4.6 ms for the column's 85 cells (live
    // School tracker, 2026-10-26). The store commits once, on mouseup.
    // Caveat: a row the virtualizer mounts mid-drag shows the old width until mouseup.
    const cells = [...(tableRef.current?.querySelectorAll<HTMLElement>(`[data-col="${CSS.escape(propId)}"]`) ?? [])];
    const apply = (width: number) => {
      const px = `${width}px`;
      for (const cell of cells) setCellWidth(cell, px);
    };

    let latestWidth = startWidth;
    let rafId = 0;

    const handleMove = (ev: MouseEvent) => {
      latestWidth = Math.max(MIN_COL_WIDTH, startWidth + ev.clientX - startX);
      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          rafId = 0;
          apply(latestWidth);
        });
      }
    };

    const handleUp = () => {
      if (rafId) cancelAnimationFrame(rafId);
      // The commit re-renders the same width; until then the cells must show it.
      apply(latestWidth);
      setResizingCol(null);
      const store = storeApi.getState();
      const curView = store.views[viewId];
      if (curView) {
        store.updateViewSettings(viewId, {
          columnWidths: { ...curView.settings?.columnWidths, [propId]: latestWidth },
        });
      }
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
