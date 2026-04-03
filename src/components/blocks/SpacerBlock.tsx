/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   SpacerBlock.tsx                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:35:37 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 11:45:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState, useCallback, useRef } from 'react';
import { useDatabaseStore } from '../../store/dbms/hardcoded/useDatabaseStore';
import { cn } from '../../utils/cn';

/** Renders a resizable vertical spacer block. */
export function SpacerBlock({ block, pageId }: { block: { id: string; spacerHeight?: number }; pageId: string }) {
  const updateBlock = useDatabaseStore(s => s.updateBlock);
  const height = block.spacerHeight || 40;
  const [dragging, setDragging] = useState(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    startYRef.current = e.clientY;
    startHeightRef.current = height;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientY - startYRef.current;
      const newHeight = Math.max(8, Math.min(400, startHeightRef.current + delta));
      updateBlock(pageId, block.id, { spacerHeight: newHeight });
    };

    const handleMouseUp = () => {
      setDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [height, updateBlock, pageId, block.id]);

  return (
    <div
      className={cn("group/spacer relative")}
      style={{ height }}
    >
      <div
        className={cn(`absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-1 rounded-full cursor-row-resize transition-colors ${
          dragging
            ? 'bg-accent'
            : 'bg-transparent group-hover/spacer:bg-line-medium'
        }`)}
        onMouseDown={handleMouseDown}
        title="Drag to resize"
      />
    </div>
  );
}
