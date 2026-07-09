/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   CalendarEventChip.tsx                               :+:      :+:    :+:  */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── CalendarEventChip — one event bar/chip on the calendar ─────────────────
// Continuation carets mark bars cut at week edges (or hidden weekends).
// Left/right handles (data-cal-handle) are the resize grips; the body starts
// a move. Clicking (when no drag happened) opens the page; the hover clock
// opens the quick date editor anchored to the chip.

import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, CalendarClock } from 'lucide-react';
import { cn } from '../../../utils/cn';

export interface ChipColor {
  /** Inline tint/accent (conditional colors) — wins over the class pair. */
  tint?: string;
  accent?: string;
  /** Tailwind bg/text class pair (select-option colors). */
  className?: string;
}

export function CalendarEventChip({
  pageId, title, icon, timeLabel, isRanged, spanDays,
  continuesLeft = false, continuesRight = false,
  color, wrapTitle = false, dimmed = false,
  onOpen, onEditDates,
  onBodyPointerDown, onHandlePointerDown, suppressClickRef,
}: Readonly<{
  pageId: string;
  title: string;
  icon?: string;
  timeLabel?: string | null;
  isRanged: boolean;
  spanDays: number;
  continuesLeft?: boolean;
  continuesRight?: boolean;
  color: ChipColor;
  wrapTitle?: boolean;
  dimmed?: boolean;
  onOpen: () => void;
  onEditDates?: (anchorRect: DOMRect) => void;
  onBodyPointerDown?: (e: React.PointerEvent) => void;
  onHandlePointerDown?: (e: React.PointerEvent, side: 'left' | 'right') => void;
  /** Set by the drag hook after a completed drag — swallows the click-open. */
  suppressClickRef?: React.RefObject<boolean>;
}>) {
  const ref = useRef<HTMLDivElement>(null);
  const style: React.CSSProperties | undefined = color.tint
    ? { background: color.tint, boxShadow: `inset 2px 0 0 ${color.accent ?? color.tint}` }
    : undefined;

  const handleClick = (): void => {
    if (suppressClickRef?.current) return;
    onOpen();
  };

  return (
    <div ref={ref} data-cal-event={pageId} data-cal-span={spanDays}
      role="button" tabIndex={0}
      onPointerDown={onBodyPointerDown}
      onClick={handleClick}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      className={cn(`group/chip relative h-full flex items-center gap-1 px-1.5 rounded text-xs
        cursor-grab active:cursor-grabbing select-none overflow-hidden transition-shadow hover:shadow-sm
        ${color.tint ? 'text-ink-body' : color.className || 'bg-accent-soft text-accent-text'}
        ${dimmed ? 'opacity-40' : ''}
        ${continuesLeft ? 'rounded-l-none' : ''} ${continuesRight ? 'rounded-r-none' : ''}`)}
      style={style}>
      {continuesLeft && <ChevronLeft className={cn("w-3 h-3 shrink-0 -ml-1 opacity-60")} />}
      {onHandlePointerDown && isRanged && !continuesLeft && (
        <span data-cal-handle="left" role="presentation"
          onPointerDown={e => onHandlePointerDown(e, 'left')}
          className={cn("absolute left-0 inset-y-0 w-1.5 cursor-col-resize")} />
      )}
      <span className={cn(`min-w-0 flex-1 ${wrapTitle ? 'whitespace-pre-wrap break-words' : 'truncate'}`)}>
        {icon && <span className={cn("mr-0.5")}>{icon}</span>}
        {timeLabel && <span className={cn("mr-1 opacity-70 tabular-nums")}>{timeLabel}</span>}
        {title || 'Untitled'}
      </span>
      {onEditDates && (
        <button type="button" aria-label="Edit dates"
          onPointerDown={e => e.stopPropagation()}
          onClick={e => {
            e.stopPropagation();
            if (ref.current) onEditDates(ref.current.getBoundingClientRect());
          }}
          className={cn(`shrink-0 p-0.5 rounded opacity-0 group-hover/chip:opacity-100
            hover:bg-hover-surface2 text-ink-muted transition-opacity`)}>
          <CalendarClock className={cn("w-3 h-3")} />
        </button>
      )}
      {onHandlePointerDown && !continuesRight && (
        <span data-cal-handle="right" role="presentation"
          onPointerDown={e => onHandlePointerDown(e, 'right')}
          className={cn("absolute right-0 inset-y-0 w-1.5 cursor-col-resize")} />
      )}
      {continuesRight && <ChevronRight className={cn("w-3 h-3 shrink-0 -mr-1 opacity-60")} />}
    </div>
  );
}
