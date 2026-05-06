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

/** Manages column resize interactions via mouse drag with RAF-throttled updates. */
export function useColumnResize(viewId: string) {
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
          const store = storeApi.getState();
          const curView = store.views[viewId];
          if (curView) {
            store.updateViewSettings(viewId, {
              columnWidths: { ...curView.settings?.columnWidths, [propId]: latestWidth },
            });
          }
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
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };

    setResizingCol(propId);
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  }, [storeApi, viewId]);

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
