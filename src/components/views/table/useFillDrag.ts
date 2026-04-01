/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useFillDrag.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:37:57 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 16:37:58 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ═══════════════════════════════════════════════════════════════════════════════
// useFillDrag — fill-handle drag logic for table cells
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect } from 'react';
import { useDatabaseStore } from '../../../store/useDatabaseStore';

export interface FillDragState {
  sourcePropId: string;
  sourceRowIdx: number;
  currentRowIdx: number;
}

export function useFillDrag(activeViewId: string | null) {
  const [fillDrag, setFillDrag] = useState<FillDragState | null>(null);

  const handleFillMove = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const row = target.closest('tr[data-row-idx]');
    if (row) {
      const rowIdx = Number(row.getAttribute('data-row-idx'));
      if (!isNaN(rowIdx)) setFillDrag(prev => prev ? { ...prev, currentRowIdx: rowIdx } : null);
    }
  }, []);

  const handleFillEnd = useCallback(() => {
    setFillDrag(prev => {
      if (!prev) return null;
      const { sourcePropId, sourceRowIdx, currentRowIdx } = prev;
      const store = useDatabaseStore.getState();
      const v = activeViewId ? store.views[activeViewId] : null;
      if (!v) return null;
      const allPages = store.getPagesForView(v.id);
      const sourceVal = allPages[sourceRowIdx]?.properties[sourcePropId];
      const minR = Math.min(sourceRowIdx, currentRowIdx);
      const maxR = Math.max(sourceRowIdx, currentRowIdx);
      for (let i = minR; i <= maxR; i++) {
        if (i !== sourceRowIdx && allPages[i]) {
          store.updatePageProperty(allPages[i].id, sourcePropId, sourceVal);
        }
      }
      return null;
    });
  }, [activeViewId]);

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
