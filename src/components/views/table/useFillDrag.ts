/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useFillDrag.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:37:57 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 16:30:13 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { useState, useCallback, useEffect, type RefObject } from 'react';
import type { Page } from '../../../types/database';
import { useStoreApi } from '../../../store/dbms/hardcoded/useDatabaseStore';

/** Tracks the current fill-drag operation state. */
export interface FillDragState {
  sourcePropId: string;
  sourceRowIdx: number;
  currentRowIdx: number;
}

/** Manages fill-handle drag interactions for copying cell values across rows.
 *  `rowPagesRef` holds the rows as rendered — `rowIdx` indexes it, so a grouped
 *  or paged table fills the rows the user dragged over, not the flat view order. */
export function useFillDrag(rowPagesRef: RefObject<readonly Page[]>) {
  const [fillDrag, setFillDrag] = useState<FillDragState | null>(null);
  const storeApi = useStoreApi();

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
    const store = storeApi.getState();
    const rows = rowPagesRef.current;
    const source = rows[sourceRowIdx];
    // Read the live value: the rendered page object may be a render behind.
    const sourceVal = source ? store.pages[source.id]?.properties[sourcePropId] : undefined;
    if (source) {
      const minR = Math.min(sourceRowIdx, currentRowIdx);
      const maxR = Math.max(sourceRowIdx, currentRowIdx);
      for (let i = minR; i <= maxR; i++) {
        if (i !== sourceRowIdx && rows[i]) store.updatePageProperty(rows[i].id, sourcePropId, sourceVal);
      }
    }
    setFillDrag(null);
  }, [fillDrag, rowPagesRef, storeApi]);

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
