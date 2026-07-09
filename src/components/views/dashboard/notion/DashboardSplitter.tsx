/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   DashboardSplitter.tsx                              :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/10 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── DashboardSplitter — pointer-capture divider (PaneSplitter technique) ───
// The drag NEVER writes to the store: deltas stream to onResize (DOM-only
// updates in the parent), the final value commits once on pointer-up.

import React, { useRef } from 'react';
import { beginAxisDrag } from './pointerDrag';

/** Drag divider: 'col' resizes widget widths, 'row' resizes row height. */
export function DashboardSplitter({ direction, onResizeStart, onResize, onResizeEnd, className }: Readonly<{
  direction: 'col' | 'row';
  onResizeStart: () => void;
  /** Signed delta since pointer-down: fraction of container (col) / px (row). */
  onResize: (delta: number) => void;
  onResizeEnd: () => void;
  className?: string;
}>) {
  const ref = useRef<HTMLDivElement>(null);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const handle = ref.current;
    const container = handle?.parentElement;
    if (!handle || !container) return;
    const span = direction === 'col' ? container.clientWidth : 1;
    onResizeStart();
    beginAxisDrag(handle, event, {
      axis: direction === 'col' ? 'x' : 'y',
      cursor: direction === 'col' ? 'col-resize' : 'row-resize',
      onMove: delta => { if (span > 0) onResize(delta / span); },
      onEnd: onResizeEnd,
    });
  }

  return (
    <div
      ref={ref}
      role="separator"
      data-dashboard-splitter={direction}
      aria-orientation={direction === 'col' ? 'vertical' : 'horizontal'}
      onPointerDown={onPointerDown}
      className={[
        // touch-none: without it, touch pointermove is hijacked by scroll and the drag dies.
        'shrink-0 z-10 rounded-full bg-transparent hover:bg-accent-border/60 active:bg-accent-border transition-colors touch-none',
        direction === 'col' ? 'w-1.5 cursor-col-resize self-stretch' : 'h-1.5 cursor-row-resize w-full',
        className ?? '',
      ].join(' ')}
    />
  );
}
