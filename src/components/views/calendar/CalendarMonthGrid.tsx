/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   CalendarMonthGrid.tsx                               :+:      :+:    :+:  */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── CalendarMonthGrid — weekday header + week rows (also Week mode, 1 row) ─

import React from 'react';
import { format } from 'date-fns';
import { CalendarWeekRow } from './CalendarWeekRow';
import type { ChipData, GhostSegment } from './CalendarWeekRow';
import { WEEK_GUTTER_WIDTH } from './calendarConfig';
import type { CalendarGrid, DayInfo, DayKey, WeekSegment } from './model/calendarTypes';
import { cn } from '../../../utils/cn';

export function CalendarMonthGrid({
  grid, showWeekNumbers = false, wrapTitles = false, stretchRows = false,
  segments, chipData, ghosts = [], overflow, draggingPageId,
  onOpen, onEditDates, onQuickCreate, onExpandDay,
  onChipPointerDown, onHandlePointerDown, onEmptyPointerDown, suppressClickRef,
}: Readonly<{
  grid: CalendarGrid;
  showWeekNumbers?: boolean;
  wrapTitles?: boolean;
  /** Week mode: the single row grows to fill the pane. */
  stretchRows?: boolean;
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
  // Weekday labels come from the FIRST row's real dates, so week start and
  // hidden weekends are always consistent with the cells below.
  const labels = grid.weeks[0]?.map(d => format(d.date, 'EEE')) ?? [];

  return (
    <div data-cal-grid
      className={cn("flex-1 min-h-0 border border-line rounded-lg overflow-hidden flex flex-col")}>
      <div className={cn("flex bg-surface-secondary border-b border-line shrink-0")}>
        {showWeekNumbers && (
          <div className={cn("shrink-0 border-r border-line")} style={{ width: WEEK_GUTTER_WIDTH }} />
        )}
        <div className={cn("flex-1 grid")}
          style={{ gridTemplateColumns: `repeat(${grid.cols}, minmax(0, 1fr))` }}>
          {labels.map(label => (
            <div key={label}
              className={cn("py-2 text-center text-xs font-medium text-ink-secondary border-r border-line last:border-r-0")}>
              {label}
            </div>
          ))}
        </div>
      </div>
      <div className={cn(`flex-1 min-h-0 overflow-y-auto flex flex-col
        ${stretchRows ? '[&>*]:flex-1' : ''}`)}>
        {grid.weeks.map((days, weekIndex) => (
          <CalendarWeekRow key={days[0].key} days={days} cols={grid.cols}
            weekNumber={grid.weekNumbers[weekIndex]} showWeekNumber={showWeekNumbers}
            wrapTitles={wrapTitles}
            segments={segments.filter(s => s.weekIndex === weekIndex)}
            chipData={chipData}
            ghosts={ghosts.filter(g => g.weekIndex === weekIndex)}
            overflow={overflow} draggingPageId={draggingPageId}
            onOpen={onOpen} onEditDates={onEditDates}
            onQuickCreate={onQuickCreate} onExpandDay={onExpandDay}
            onChipPointerDown={onChipPointerDown} onHandlePointerDown={onHandlePointerDown}
            onEmptyPointerDown={onEmptyPointerDown} suppressClickRef={suppressClickRef} />
        ))}
      </div>
    </div>
  );
}
