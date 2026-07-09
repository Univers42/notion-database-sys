/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   pointerDrag.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── pointerDrag — one pointer-capture axis drag for every dashboard handle ──
// Deltas stream to onMove (DOM-only writes in the caller); onEnd fires once on
// pointer-up. Never writes to the store itself.

import type React from 'react';

export interface AxisDragOptions {
  axis: 'x' | 'y';
  cursor: 'col-resize' | 'row-resize';
  /** Signed px delta since pointer-down. */
  onMove: (deltaPx: number) => void;
  onEnd: () => void;
}

/** Captures the pointer on `handle` and streams axis deltas until release. */
export function beginAxisDrag(
  handle: HTMLElement,
  event: React.PointerEvent,
  { axis, cursor, onMove, onEnd }: AxisDragOptions,
): void {
  event.preventDefault();
  const start = axis === 'x' ? event.clientX : event.clientY;
  handle.setPointerCapture(event.pointerId);

  const move = (moveEvent: PointerEvent) => {
    const current = axis === 'x' ? moveEvent.clientX : moveEvent.clientY;
    onMove(current - start);
  };
  const up = (upEvent: PointerEvent) => {
    handle.releasePointerCapture(upEvent.pointerId);
    handle.removeEventListener('pointermove', move);
    handle.removeEventListener('pointerup', up);
    document.body.style.removeProperty('cursor');
    document.body.style.removeProperty('user-select');
    delete document.body.dataset.paneResizing;
    onEnd();
  };
  document.body.style.cursor = cursor;
  document.body.style.userSelect = 'none';
  // Same CSS flag the workspace grid uses: off-screen cells skip layout
  // (content-visibility) while something is being reshaped.
  document.body.dataset.paneResizing = 'true';
  handle.addEventListener('pointermove', move);
  handle.addEventListener('pointerup', up);
}
