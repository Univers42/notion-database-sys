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

/** Drag divider: 'col' resizes widget widths, 'row' resizes row height. */
export function DashboardSplitter({ direction, onResizeStart, onResize, onResizeEnd }: Readonly<{
  direction: 'col' | 'row';
  onResizeStart: () => void;
  /** Signed delta since pointer-down: fraction of container (col) / px (row). */
  onResize: (delta: number) => void;
  onResizeEnd: () => void;
}>) {
  const ref = useRef<HTMLDivElement>(null);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    const handle = ref.current;
    const container = handle?.parentElement;
    if (!handle || !container) return;
    const span = direction === 'col' ? container.clientWidth : 1;
    const start = direction === 'col' ? event.clientX : event.clientY;
    handle.setPointerCapture(event.pointerId);
    onResizeStart();

    const move = (moveEvent: PointerEvent) => {
      const current = direction === 'col' ? moveEvent.clientX : moveEvent.clientY;
      if (span > 0) onResize((current - start) / span);
    };
    const up = (upEvent: PointerEvent) => {
      handle.releasePointerCapture(upEvent.pointerId);
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      document.body.style.removeProperty('cursor');
      document.body.style.removeProperty('user-select');
      delete document.body.dataset.paneResizing;
      onResizeEnd();
    };
    document.body.style.cursor = direction === 'col' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
    // Same CSS flag the workspace grid uses: off-screen cells skip layout
    // (content-visibility) while something is being reshaped.
    document.body.dataset.paneResizing = 'true';
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
  }

  return (
    <div
      ref={ref}
      role="separator"
      aria-orientation={direction === 'col' ? 'vertical' : 'horizontal'}
      onPointerDown={onPointerDown}
      className={[
        'shrink-0 z-10 rounded-full bg-transparent hover:bg-accent-border/60 active:bg-accent-border transition-colors',
        direction === 'col' ? 'w-1.5 cursor-col-resize self-stretch' : 'h-1.5 cursor-row-resize w-full',
      ].join(' ')}
    />
  );
}
