/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   CalendarTimeGridHost.tsx                            :+:      :+:    :+:  */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── CalendarTimeGridHost — wires week/day data + slot drag into the grid ───
// Splits events: same-day timed → the hour grid; multi-day or no-time → the
// all-day band (month lane machinery). Owns the 30-minute slot drag.

import React, { useMemo } from 'react';
import type { ChipData, GhostSegment } from './CalendarWeekRow';
import { CalendarTimeGridView } from './CalendarTimeGridView';
import { useCalendarTimeDrag } from './useCalendarTimeDrag';
import { segmentIntoWeeks, packWeekLanes, overflowByDay } from './model/calendarLanes';
import type { CalendarGrid, CalEvent, DayInfo } from './model/calendarTypes';
import { HOUR_HEIGHT } from './calendarConfig';

export function CalendarTimeGridHost({
  grid, events, chipData, includeTime, startPropId, databaseId,
  updatePageProperty, addPage, ensureEndProp, monthGhosts = [],
  monthDragPageId, onOpen, onEditDates, onQuickCreate, onExpandDay,
  onBandChipPointerDown, onBandHandlePointerDown, bandSuppressClickRef,
}: Readonly<{
  grid: CalendarGrid;
  events: CalEvent[];
  chipData: Map<string, ChipData>;
  includeTime: boolean;
  startPropId: string | undefined;
  databaseId: string | undefined;
  updatePageProperty: (pageId: string, propId: string, value: string) => void;
  addPage: (databaseId: string, properties: Record<string, string>) => void;
  ensureEndProp: () => { id: string } | null;
  monthGhosts?: GhostSegment[];
  monthDragPageId?: string | null;
  onOpen: (pageId: string) => void;
  onEditDates?: (pageId: string, anchorRect: DOMRect) => void;
  onQuickCreate: (day: DayInfo) => void;
  onExpandDay: (day: DayInfo, anchorRect: DOMRect) => void;
  onBandChipPointerDown?: (e: React.PointerEvent, pageId: string) => void;
  onBandHandlePointerDown?: (e: React.PointerEvent, pageId: string, side: 'left' | 'right') => void;
  bandSuppressClickRef?: React.RefObject<boolean>;
}>) {
  // Band = multi-day spans always, plus everything when times are off.
  const bandEvents = useMemo(
    () => (includeTime ? events.filter(ev => ev.startKey !== ev.endKey) : events),
    [events, includeTime],
  );
  const bandPacked = useMemo(
    () => packWeekLanes(segmentIntoWeeks(bandEvents, grid), bandEvents),
    [bandEvents, grid],
  );
  const bandOverflow = useMemo(
    () => overflowByDay(bandPacked, grid, Number.MAX_SAFE_INTEGER),
    [bandPacked, grid],
  );

  const timeDrag = useCalendarTimeDrag({
    hourHeight: HOUR_HEIGHT, startPropId, databaseId,
    updatePageProperty, addPage, ensureEndProp,
  });

  return (
    <CalendarTimeGridView grid={grid} events={events} chipData={chipData}
      includeTime={includeTime}
      bandSegments={bandPacked} bandOverflow={bandOverflow} ghosts={monthGhosts}
      timeDrag={timeDrag.drag} draggingPageId={monthDragPageId}
      onOpen={onOpen} onEditDates={onEditDates}
      onQuickCreate={onQuickCreate} onExpandDay={onExpandDay}
      onBandChipPointerDown={onBandChipPointerDown}
      onBandHandlePointerDown={onBandHandlePointerDown}
      onTimedPointerDown={(e, chip) => timeDrag.begin(e, 'move', chip.ev.startKey, {
        pageId: chip.ev.pageId, startIso: chip.ev.startIso, endIso: chip.ev.endIso,
        startMin: chip.startMin, endMin: chip.endMin,
      })}
      onTimedResizePointerDown={(e, chip) => timeDrag.begin(e, 'resize-end', chip.ev.startKey, {
        pageId: chip.ev.pageId, startIso: chip.ev.startIso, endIso: chip.ev.endIso,
        startMin: chip.startMin, endMin: chip.endMin,
      })}
      onColumnPointerDown={includeTime
        ? (e, day) => timeDrag.begin(e, 'create', day.key, null)
        : undefined}
      onTimePointerMove={timeDrag.drag ? timeDrag.handlePointerMove : undefined}
      onTimePointerUp={timeDrag.drag ? timeDrag.handlePointerUp : undefined}
      suppressClickRef={timeDrag.suppressClickRef}
      bandSuppressClickRef={bandSuppressClickRef} />
  );
}
