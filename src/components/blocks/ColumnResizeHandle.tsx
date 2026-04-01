import React, { useState, useCallback, useRef } from 'react';
import type { Block } from '../../types/database';
import { useDatabaseStore } from '../../store/useDatabaseStore';

export function ColumnResizeHandle({ pageId, blockId, colIdx, ratios, columns }: {
  pageId: string;
  blockId: string;
  colIdx: number;
  ratios: number[];
  columns: Block[][];
}) {
  const updateBlock = useDatabaseStore(s => s.updateBlock);
  const [dragging, setDragging] = useState(false);
  const startXRef = useRef(0);
  const startRatiosRef = useRef<number[]>([]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    startXRef.current = e.clientX;
    startRatiosRef.current = [...ratios];

    const handleMouseMove = (e: MouseEvent) => {
      const delta = (e.clientX - startXRef.current) / 200;
      const newRatios = [...startRatiosRef.current];
      newRatios[colIdx - 1] = Math.max(0.2, newRatios[colIdx - 1] + delta);
      newRatios[colIdx] = Math.max(0.2, newRatios[colIdx] - delta);
      updateBlock(pageId, blockId, { columnRatios: newRatios });
    };

    const handleMouseUp = () => {
      setDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [ratios, colIdx, updateBlock, pageId, blockId]);

  return (
    <div
      className={`w-1 shrink-0 cursor-col-resize rounded-full transition-colors self-stretch ${
        dragging ? 'bg-accent' : 'bg-transparent hover:bg-line-medium'
      }`}
      onMouseDown={handleMouseDown}
    />
  );
}
