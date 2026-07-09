/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   DashboardCellHandles.tsx                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── DashboardCellHandles — the two vertical-resize zones of a card ─────────
// The BORDER belongs to the CARD: a full-card-width zone owning border ±4px
// whose hover lights a line exactly as wide as that card — drag = this column
// only, detaching it from the group until it snaps back into alignment.
// The row GAP belongs to the GROUP: a zone lower down (only on aligned
// columns) whose segments light together as one long bar — drag = the whole
// aligned group. Distinct spans make each proposition legible at a glance.

import React, { useRef } from 'react';
import { beginAxisDrag } from './pointerDrag';
import { cn } from '../../../../utils/cn';

interface ZoneProps {
  onStart: () => void;
  onLive: (deltaPx: number) => void;
  onEnd: () => void;
}

/** Aligned-cards bar segment, right under the border. Hover is row-shared. */
export function GroupResizeZone({ onStart, onLive, onEnd, hot, onHotChange, className }: Readonly<ZoneProps & {
  hot: boolean;
  onHotChange: (hot: boolean) => void;
  className?: string;
}>) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      role="separator"
      aria-orientation="horizontal"
      aria-label="Resize row"
      data-dash-resize="group"
      onPointerEnter={() => onHotChange(true)}
      onPointerLeave={() => onHotChange(false)}
      onPointerDown={event => {
        if (!ref.current) return;
        onStart();
        beginAxisDrag(ref.current, event, { axis: 'y', cursor: 'row-resize', onMove: onLive, onEnd });
      }}
      className={cn(`absolute inset-x-0 -bottom-3 h-2 z-10 cursor-row-resize touch-none
        flex items-center`, className)}
    >
      <div className={cn(`h-1 w-full rounded-full transition-colors
        ${hot ? 'bg-accent-border' : 'bg-transparent'}`)} />
    </div>
  );
}

/** Right-edge width handle on a row's LAST column: shrinking leaves
 *  droppable trailing slack; growing back snaps the row to full width.
 *  The only horizontal handle a single-column row has. */
export function EdgeResizeZone({ onStart, onLive, onEnd, className }: Readonly<ZoneProps & {
  className?: string;
}>) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize card width"
      data-dash-resize="edge"
      onPointerDown={event => {
        if (!ref.current) return;
        onStart();
        beginAxisDrag(ref.current, event, { axis: 'x', cursor: 'col-resize', onMove: onLive, onEnd });
      }}
      className={cn(`group/edgeresize absolute right-0 inset-y-6 w-2 z-20 cursor-col-resize touch-none
        flex items-center justify-end`, className)}
    >
      <div className={cn(`mr-0.5 w-1 h-12 rounded-full bg-transparent transition-colors
        group-hover/edgeresize:bg-accent-border group-active/edgeresize:bg-accent-border`)} />
    </div>
  );
}

/** Single-card handle ON the bottom border: resizes only this card. */
export function CardResizeZone({ onStart, onLive, onEnd, detached, className }: Readonly<ZoneProps & {
  /** Card already has its own height (not aligned to the row). */
  detached: boolean;
  className?: string;
}>) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      role="separator"
      aria-orientation="horizontal"
      aria-label="Resize card"
      data-dash-resize="card"
      onPointerDown={event => {
        if (!ref.current) return;
        onStart();
        beginAxisDrag(ref.current, event, { axis: 'y', cursor: 'row-resize', onMove: onLive, onEnd });
      }}
      className={cn(`group/cardresize absolute inset-x-0 -bottom-1 h-3 z-30 cursor-row-resize touch-none
        flex items-end`, className)}
    >
      <div className={cn(`mb-1 h-1 w-full rounded-full transition-colors
        ${detached ? 'bg-accent-border/50' : 'bg-transparent'}
        group-hover/cardresize:bg-accent-border group-active/cardresize:bg-accent-border`)} />
    </div>
  );
}
