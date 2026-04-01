// ═══════════════════════════════════════════════════════════════════════════════
// useColumnResize — column resize handle logic
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useCallback } from 'react';
import { useDatabaseStore } from '../../../store/useDatabaseStore';

export function useColumnResize(viewId: string) {
  const [resizingCol, setResizingCol] = useState<string | null>(null);

  const handleResizeStart = useCallback((e: React.MouseEvent, propId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const s = useDatabaseStore.getState();
    const v = s.views[viewId];
    const startWidth = v?.settings?.columnWidths?.[propId] || 180;

    let latestWidth = startWidth;
    let rafId = 0;

    const handleMove = (ev: MouseEvent) => {
      latestWidth = Math.max(80, startWidth + ev.clientX - startX);
      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          rafId = 0;
          const store = useDatabaseStore.getState();
          const curView = store.views[viewId];
          if (curView) {
            store.updateViewSettings(viewId, {
              columnWidths: { ...(curView.settings?.columnWidths || {}), [propId]: latestWidth },
            });
          }
        });
      }
    };

    const handleUp = () => {
      if (rafId) cancelAnimationFrame(rafId);
      setResizingCol(null);
      const store = useDatabaseStore.getState();
      const curView = store.views[viewId];
      if (curView) {
        store.updateViewSettings(viewId, {
          columnWidths: { ...(curView.settings?.columnWidths || {}), [propId]: latestWidth },
        });
      }
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };

    setResizingCol(propId);
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  }, [viewId]);

  return { resizingCol, handleResizeStart };
}

export function useColWidth() {
  return useCallback((propId: string) => {
    const s = useDatabaseStore.getState();
    const v = s.views[s.activeViewId!];
    return v?.settings?.columnWidths?.[propId] || 180;
  }, []);
}
