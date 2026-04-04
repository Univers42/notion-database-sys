/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useFillDrag.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:37:57 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 22:31:02 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { useState, useCallback, useEffect } from 'react';
import { useDatabaseStore } from '../../../store/dbms/hardcoded/useDatabaseStore';

/** Tracks the current fill-drag operation state. */
export interface FillDragState {
  sourcePropId: string;
  sourceRowIdx: number;
  currentRowIdx: number;
}

/** Manages fill-handle drag interactions for copying cell values across rows. */
export function useFillDrag(activeViewId: string | null) {
  const [fillDrag, setFillDrag] = useState<FillDragState | null>(null);

  const handleFillMove = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const row = target.closest('tr[data-row-idx]');
    if (row) {
      const rowIdx = Number((row as HTMLElement).dataset.rowIdx);
      if (!Number.isNaN(rowIdx)) setFillDrag(prev => prev ? { ...prev, currentRowIdx: rowIdx } : null);
    }
  }, []);

  const handleFillEnd = useCallback(() => {
    const drag = fillDrag;
    if (!drag) {
      setFillDrag(null);
      return;
    }
    const { sourcePropId, sourceRowIdx, currentRowIdx } = drag;
    const store = useDatabaseStore.getState();
    const v = activeViewId ? store.views[activeViewId] : null;
    if (v) {
      const allPages = store.getPagesForView(v.id);
      const sourceVal = allPages[sourceRowIdx]?.properties[sourcePropId];
      const minR = Math.min(sourceRowIdx, currentRowIdx);
      const maxR = Math.max(sourceRowIdx, currentRowIdx);
      for (let i = minR; i <= maxR; i++) {
        if (i !== sourceRowIdx && allPages[i]) {
          store.updatePageProperty(allPages[i].id, sourcePropId, sourceVal);
        }
      }
    }
    setFillDrag(null);
  }, [activeViewId, fillDrag]);

  useEffect(() => {
    if (fillDrag) {
      document.addEventListener('mousemove', handleFillMove);
      document.addEventListener('mouseup', handleFillEnd);
      return () => {
        document.removeEventListener('mousemove', handleFillMove);
        document.removeEventListener('mouseup', handleFillEnd);
      };
    }
  }, [fillDrag, handleFillMove, handleFillEnd]);

  const startFillDrag = useCallback((propId: string, rowIdx: number) => {
    setFillDrag({ sourcePropId: propId, sourceRowIdx: rowIdx, currentRowIdx: rowIdx });
  }, []);

  return { fillDrag, startFillDrag };
}
