/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   CalendarWeekRow.tsx                                 :+:      :+:    :+:  */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── CalendarWeekRow — one week: day cells + the absolute bar overlay ───────
// Cells are the background (numbers, quick-create, overflow); packed lane
// segments paint above them, positioned by grid column fractions so bars
// span days precisely. Ghost segments preview an in-flight drag.

import React from 'react';
import { isToday } from 'date-fns';
import { CalendarDayCell } from './CalendarDayCell';
import { CalendarEventChip } from './CalendarEventChip';
import type { ChipColor } from './CalendarEventChip';
import { DAY_HEADER_HEIGHT, LANE_HEIGHT, OVERFLOW_HEIGHT, WEEK_GUTTER_WIDTH } from './calendarConfig';
import { MAX_VISIBLE_LANES } from './model/calendarTypes';
import type { DayInfo, DayKey, WeekSegment } from './model/calendarTypes';
import { cn } from '../../../utils/cn';

export interface ChipData {
  title: string;
  icon?: string;
  timeLabel?: string | null;
  color: ChipColor;
  isRanged: boolean;
  spanDays: number;
}

export interface GhostSegment {
  startCol: number;
  endCol: number;
  weekIndex: number;
}

export function CalendarWeekRow({
  days, cols, weekNumber, showWeekNumber = false, wrapTitles = false,
  segments, chipData, ghosts = [], overflow, draggingPageId = null,
  onOpen, onEditDates, onQuickCreate, onExpandDay,
  onChipPointerDown, onHandlePointerDown, onEmptyPointerDown, suppressClickRef,
}: Readonly<{
  days: DayInfo[];
  cols: number;
  weekNumber: number;
  showWeekNumber?: boolean;
  wrapTitles?: boolean;
  segments: WeekSegment[];
  chipData: Map<string, ChipData>;
  ghosts?: GhostSegment[];
  overflow: Map<DayKey, number>;
  draggingPageId?: string | null;
  onOpen: (pageId: string) => void;
  onEditDates?: (pageId: string, anchorRect: DOMRect) => void;
  onQuickCreate: (day: DayInfo) => void;
  onExpandDay: (day: DayInfo, anchorRect: DOMRect) => void;
  onChipPointerDown?: (e: React.PointerEvent, pageId: string) => void;
  onHandlePointerDown?: (e: React.PointerEvent, pageId: string, side: 'left' | 'right') => void;
  onEmptyPointerDown?: (e: React.PointerEvent, day: DayInfo) => void;
  suppressClickRef?: React.RefObject<boolean>;
}>) {
  const laneCount = Math.min(
    Math.max(0, ...segments.map(s => s.lane + 1)),
    MAX_VISIBLE_LANES,
  );
  const minHeight = DAY_HEADER_HEIGHT + MAX_VISIBLE_LANES * LANE_HEIGHT + OVERFLOW_HEIGHT;
  const colWidth = `calc(100% / ${cols})`;

  const barPosition = (startCol: number, endCol: number): React.CSSProperties => ({
    left: `calc(${startCol} * ${colWidth} + 2px)`,
    width: `calc(${endCol - startCol + 1} * ${colWidth} - 5px)`,
  });

  return (
    <div className={cn("flex border-line")} style={{ minHeight }}>
      {showWeekNumber && (
        <div className={cn(`shrink-0 border-b border-r border-line bg-surface-secondary
          text-[10px] text-ink-muted flex items-start justify-center pt-1.5 tabular-nums`)}
          style={{ width: WEEK_GUTTER_WIDTH }}>
          {weekNumber}
        </div>
      )}
      <div className={cn("relative flex-1 min-w-0")}>
        <div className={cn("grid h-full")}
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {days.map(day => (
            <CalendarDayCell key={day.key} day={day} isToday={isToday(day.date)}
              laneCount={laneCount}
              overflowCount={overflow.get(day.key) ?? 0}
              onQuickCreate={() => onQuickCreate(day)}
              onExpandDay={rect => onExpandDay(day, rect)}
              onEmptyPointerDown={onEmptyPointerDown ? e => onEmptyPointerDown(e, day) : undefined} />
          ))}
        </div>
        {/* Bar overlay: packed lanes above the cells. */}
        {segments.map(seg => {
          const chip = chipData.get(seg.pageId);
          if (!chip) return null;
          return (
            <div key={`${seg.pageId}:${seg.startCol}`}
              className={cn("absolute")}
              style={{
                ...barPosition(seg.startCol, seg.endCol),
                top: DAY_HEADER_HEIGHT + seg.lane * LANE_HEIGHT,
                height: LANE_HEIGHT - 2,
              }}>
              <CalendarEventChip pageId={seg.pageId} title={chip.title} icon={chip.icon}
                timeLabel={chip.timeLabel} isRanged={chip.isRanged} spanDays={chip.spanDays}
                continuesLeft={seg.continuesLeft} continuesRight={seg.continuesRight}
                color={chip.color} wrapTitle={wrapTitles && !seg.isRanged}
                dimmed={draggingPageId === seg.pageId}
                onOpen={() => onOpen(seg.pageId)}
                onEditDates={onEditDates ? rect => onEditDates(seg.pageId, rect) : undefined}
                onBodyPointerDown={onChipPointerDown ? e => onChipPointerDown(e, seg.pageId) : undefined}
                onHandlePointerDown={onHandlePointerDown
                  ? (e, side) => onHandlePointerDown(e, seg.pageId, side)
                  : undefined}
                suppressClickRef={suppressClickRef} />
            </div>
          );
        })}
        {/* Drag ghost preview. */}
        {ghosts.map(ghost => (
          <div key={`ghost:${ghost.startCol}`} aria-hidden="true"
            className={cn("absolute rounded bg-accent-soft ring-1 ring-ring-accent-muted pointer-events-none")}
            style={{
              ...barPosition(ghost.startCol, ghost.endCol),
              top: DAY_HEADER_HEIGHT,
              height: LANE_HEIGHT - 2,
            }} />
        ))}
      </div>
    </div>
  );
}
