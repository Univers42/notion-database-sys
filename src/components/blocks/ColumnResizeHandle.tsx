/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ColumnResizeHandle.tsx                             :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/18 21:19:17 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/18 21:19:17 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState, useCallback, useRef } from 'react';
import type { Block } from '../../types/database';
import { useDatabaseStore } from '../../store/dbms/hardcoded/useDatabaseStore';
import { cn } from '../../utils/cn';

/** Draggable handle for resizing adjacent columns in a ColumnBlock. */
export function ColumnResizeHandle({ pageId, blockId, colIdx, ratios, columns: _columns }: Readonly<{
  pageId: string;
  blockId: string;
  colIdx: number;
  ratios: number[];
  columns: Block[][];
}>) {
  const updateBlock = useDatabaseStore(s => s.updateBlock);
  const [dragging, setDragging] = useState(false);
  const startXRef = useRef(0);
  const startRatiosRef = useRef<number[]>([]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    startXRef.current = e.clientX;
    startRatiosRef.current = [...ratios];
    // The two flanking columns are restyled directly, once per frame; the block is written
    // once, on mouseup. A store write per mousemove re-rendered the page for every event.
    const handle = e.currentTarget as HTMLElement;
    const leftEl = handle.previousElementSibling as HTMLElement | null;
    const rightEl = handle.nextElementSibling as HTMLElement | null;
    let latestRatios = startRatiosRef.current;
    let frame = 0;

    const paint = () => {
      frame = 0;
      if (leftEl) leftEl.style.flex = String(latestRatios[colIdx - 1]);
      if (rightEl) rightEl.style.flex = String(latestRatios[colIdx]);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const delta = (e.clientX - startXRef.current) / 200;
      const newRatios = [...startRatiosRef.current];
      newRatios[colIdx - 1] = Math.max(0.2, newRatios[colIdx - 1] + delta);
      newRatios[colIdx] = Math.max(0.2, newRatios[colIdx] - delta);
      latestRatios = newRatios;
      if (!frame) frame = requestAnimationFrame(paint);
    };

    const handleMouseUp = () => {
      if (frame) cancelAnimationFrame(frame);
      paint();
      setDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      if (latestRatios !== startRatiosRef.current) updateBlock(pageId, blockId, { columnRatios: latestRatios });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [ratios, colIdx, updateBlock, pageId, blockId]);

  return (
    <div // NOSONAR - custom resize separator requires non-semantic element
      role="separator"
      tabIndex={0} // NOSONAR - resize separator needs tabIndex for keyboard access
      aria-label="Resize column"
      aria-orientation="vertical"
      aria-valuemin={60}
      aria-valuemax={600}
      aria-valuenow={200}
      className={cn(`w-1 shrink-0 cursor-col-resize rounded-full transition-colors self-stretch ${
        dragging ? 'bg-accent' : 'bg-transparent hover:bg-line-medium'
      }`)}
      onMouseDown={handleMouseDown}
    />
  );
}
