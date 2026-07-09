/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   TimelineBarComponents.tsx                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 23:30:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 23:30:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { addDays, format } from 'date-fns';
import {
  getBarColorSet, compactDateRange,
  type BarColorSet, type BarGeometry,
} from './TimelineViewHelpers';
import type { DragState } from './timelineTypes';
import { cn } from '../../../utils/cn';

/**
 * Live date chip pinned above a bar WHILE it is dragged/drawn — the user sees
 * the resulting dates in real time, not only after release. Positions follow
 * the live left/width, so the label tracks the pointer.
 */
export function LiveDragLabel({ timelineStart, displayLeft, displayWidth, cellWidth }: Readonly<{
  timelineStart: Date; displayLeft: number; displayWidth: number; cellWidth: number;
}>) {
  const startDay = Math.round(displayLeft / cellWidth);
  const widthCells = Math.max(1, Math.round(displayWidth / cellWidth));
  const from = addDays(timelineStart, startDay);
  // width = (endDay - startDay) cells, so the end DATE sits at startDay + cells.
  const to = addDays(timelineStart, startDay + widthCells);
  const label = widthCells <= 1
    ? format(from, 'MMM d')
    : `${format(from, 'MMM d')} → ${format(to, 'MMM d')}`;
  return (
    <div
      className={cn(`absolute bottom-full mb-1 left-0 px-2 py-0.5 rounded-md
                  bg-surface-primary border border-line shadow-md
                  text-[10px] font-medium text-ink whitespace-nowrap
                  pointer-events-none z-50`)}
    >
      {label}
    </div>
  );
}

/** Renders the vertical "today" marker line. */
export function TodayMarker({ todayIdx, cellWidth }: Readonly<{ todayIdx: number; cellWidth: number }>) {
  return (
    <div
      className={cn("absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none")}
      style={{ left: todayIdx * cellWidth + cellWidth / 2 }}
    />
  );
}

/** Compute status/title/date metadata for a timeline bar. */
export function computeBarMeta(
  pageProps: Record<string, unknown>,
  startPropId: string | null,
  endPropId: string | null,
  statusProp: { id: string; options?: { id: string; value: string; color: string }[] } | undefined,
  _title: string,
): { colorSet: BarColorSet; statusLabel: string; dateLabel: string } {
  const statusVal = statusProp ? pageProps[statusProp.id] : null;
  const statusOpt = statusProp?.options?.find(o => o.id === statusVal);
  const colorSet = getBarColorSet(statusOpt);
  const statusLabel = statusOpt?.value ?? '';
  const pgStart = startPropId && pageProps[startPropId]
    ? new Date(pageProps[startPropId] as string) : null;
  const pgEnd = endPropId && pageProps[endPropId]
    ? new Date(pageProps[endPropId] as string) : null;
  const dateLabel = pgStart ? compactDateRange(pgStart, pgEnd ?? null) : '';
  return { colorSet, statusLabel, dateLabel };
}

/** Compute drag-override display values for a timeline bar. */
export function computeDragOverrides(
  pageId: string, dragState: DragState | null, bar: BarGeometry | null,
): { isDragging: boolean; displayLeft: number; displayWidth: number } {
  const isDragging = dragState?.pageId === pageId;
  const displayLeft = isDragging && dragState ? dragState.liveLeft : bar?.left ?? 0;
  const displayWidth = isDragging && dragState ? dragState.liveWidth : bar?.width ?? 0;
  return { isDragging, displayLeft, displayWidth };
}

/** Renders adaptive bar content based on available width. */
export function BarContent({ verbosity, statusLabel, dateLabel, icon }: Readonly<{
  verbosity: string; statusLabel: string; dateLabel: string; icon?: string;
}>) {
  if (verbosity === 'color-only') return null;
  if (verbosity === 'status') {
    return <span className={cn("text-[10px] font-semibold truncate px-1")}>{statusLabel || '\u25CF'}</span>;
  }
  if (verbosity === 'status+dates') {
    return (
      <div className={cn("flex items-center gap-1 px-1 min-w-0")}>
        <span className={cn("text-[10px] font-semibold truncate")}>{statusLabel}</span>
        <span className={cn("text-[9px] opacity-70 shrink-0")}>{dateLabel}</span>
      </div>
    );
  }
  return (
    <div className={cn("flex items-center gap-1.5 px-1.5 min-w-0")}>
      {icon && <span className={cn("text-xs shrink-0")}>{icon}</span>}
      <span className={cn("text-[11px] font-semibold truncate")}>{statusLabel}</span>
      <span className={cn("text-[9px] opacity-70 shrink-0 ml-auto")}>{dateLabel}</span>
    </div>
  );
}

/** Tooltip shown on bar hover. */
export function BarTooltip({
  title,
  statusLabel,
  dateLabel,
  colorSet,
}: Readonly<{
  title: string;
  statusLabel: string;
  dateLabel: string;
  colorSet: BarColorSet;
}>) {
  return (
    <div
      className={cn(`absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5
                 bg-gray-900 text-white rounded-md px-2.5 py-1.5
                 text-[11px] whitespace-nowrap shadow-lg pointer-events-none z-50
                 opacity-0 group-hover/bar:opacity-100 transition-opacity`)}
    >
      <div className={cn("flex items-center gap-1.5 mb-0.5")}>
        <span
          className={cn("w-2 h-2 rounded-full shrink-0")}
          style={{ backgroundColor: colorSet.hex }}
        />
        <span className={cn("font-medium")}>{statusLabel}</span>
      </div>
      <div className={cn("text-[10px] text-gray-300")}>{title}</div>
      <div className={cn("text-[10px] text-gray-400")}>{dateLabel}</div>
    </div>
  );
}
