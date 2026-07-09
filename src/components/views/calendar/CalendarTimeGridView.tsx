/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   CalendarTimeGridView.tsx                            :+:      :+:    :+:  */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── CalendarTimeGridView — Google-style hour grid (week: N cols, day: 1) ───
// Same-day timed events place at their hour with side-by-side overlap
// columns; multi-day / no-time events live in the all-day band on top
// (the month machinery with uncapped lanes). A red line tracks "now".

import React, { useEffect, useMemo, useState } from 'react';
import { format, isToday } from 'date-fns';
import { CalendarWeekRow } from './CalendarWeekRow';
import type { ChipData, GhostSegment } from './CalendarWeekRow';
import { HOUR_HEIGHT } from './calendarConfig';
import { minutesOfDay, minutesToOffsetPx, packTimedColumns, nowLineMinutes } from './model/calendarTimeGrid';
import type { CalendarGrid, CalEvent, DayInfo, DayKey, WeekSegment } from './model/calendarTypes';
import type { TimeDragState } from './useCalendarTimeDrag';
import { cn } from '../../../utils/cn';

const RAIL_WIDTH = 52;
const HOURS = Array.from({ length: 24 }, (_, h) => h);

interface TimedChip {
  ev: CalEvent;
  startMin: number;
  endMin: number;
}

export function CalendarTimeGridView({
  grid, events, chipData, includeTime, bandSegments, bandOverflow, ghosts = [],
  timeDrag, draggingPageId,
  onOpen, onEditDates, onQuickCreate, onExpandDay,
  onBandChipPointerDown, onBandHandlePointerDown,
  onTimedPointerDown, onTimedResizePointerDown, onColumnPointerDown,
  onTimePointerMove, onTimePointerUp, suppressClickRef, bandSuppressClickRef,
}: Readonly<{
  grid: CalendarGrid;
  events: CalEvent[];
  chipData: Map<string, ChipData>;
  includeTime: boolean;
  bandSegments: WeekSegment[];
  bandOverflow: Map<DayKey, number>;
  ghosts?: GhostSegment[];
  timeDrag: TimeDragState | null;
  draggingPageId?: string | null;
  onOpen: (pageId: string) => void;
  onEditDates?: (pageId: string, anchorRect: DOMRect) => void;
  onQuickCreate: (day: DayInfo) => void;
  onExpandDay: (day: DayInfo, anchorRect: DOMRect) => void;
  onBandChipPointerDown?: (e: React.PointerEvent, pageId: string) => void;
  onBandHandlePointerDown?: (e: React.PointerEvent, pageId: string, side: 'left' | 'right') => void;
  onTimedPointerDown?: (e: React.PointerEvent, ev: TimedChip) => void;
  onTimedResizePointerDown?: (e: React.PointerEvent, ev: TimedChip) => void;
  onColumnPointerDown?: (e: React.PointerEvent, day: DayInfo) => void;
  onTimePointerMove?: (e: React.PointerEvent) => void;
  onTimePointerUp?: (e: React.PointerEvent) => void;
  suppressClickRef?: React.RefObject<boolean>;
  bandSuppressClickRef?: React.RefObject<boolean>;
}>) {
  const days = grid.weeks[0];
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // Same-day timed events per column; everything else rides the all-day band.
  const timedByDay = useMemo(() => {
    const map = new Map<DayKey, TimedChip[]>();
    if (!includeTime) return map;
    for (const ev of events) {
      if (ev.startKey !== ev.endKey) continue;
      const startMin = minutesOfDay(ev.startIso);
      const endRaw = ev.endIso ? minutesOfDay(ev.endIso) : startMin + 60;
      const chip: TimedChip = { ev, startMin, endMin: Math.max(endRaw, startMin + 30) };
      const list = map.get(ev.startKey);
      if (list) list.push(chip);
      else map.set(ev.startKey, [chip]);
    }
    return map;
  }, [events, includeTime]);

  return (
    <div className={cn("flex-1 min-h-0 border border-line rounded-lg overflow-hidden flex flex-col")}
      onPointerMove={onTimePointerMove} onPointerUp={onTimePointerUp}>
      {/* Day headers */}
      <div className={cn("flex bg-surface-secondary border-b border-line shrink-0")}>
        <div className={cn("shrink-0 border-r border-line")} style={{ width: RAIL_WIDTH }} />
        {days.map(day => (
          <div key={day.key}
            className={cn(`flex-1 py-1.5 text-center text-xs font-medium border-r border-line last:border-r-0
              ${isToday(day.date) ? 'text-accent-text font-semibold' : 'text-ink-secondary'}`)}>
            {format(day.date, grid.cols === 1 ? 'EEEE d' : 'EEE d')}
          </div>
        ))}
      </div>
      {/* All-day / multi-day band */}
      <div className={cn("flex border-b border-line shrink-0 max-h-32 overflow-y-auto")}>
        <div className={cn("shrink-0 border-r border-line text-[10px] text-ink-muted pt-1 text-center")}
          style={{ width: RAIL_WIDTH }}>all-day</div>
        <div className={cn("flex-1 min-w-0")}>
          <CalendarWeekRow days={days} cols={grid.cols} weekNumber={grid.weekNumbers[0]}
            segments={bandSegments} chipData={chipData} ghosts={ghosts} overflow={bandOverflow}
            draggingPageId={draggingPageId}
            onOpen={onOpen} onEditDates={onEditDates}
            onQuickCreate={onQuickCreate} onExpandDay={onExpandDay}
            onChipPointerDown={onBandChipPointerDown}
            onHandlePointerDown={onBandHandlePointerDown}
            suppressClickRef={bandSuppressClickRef ?? suppressClickRef} />
        </div>
      </div>
      {/* Hour grid */}
      <div className={cn("flex-1 min-h-0 overflow-y-auto")}>
        <div className={cn("flex relative")} style={{ height: 24 * HOUR_HEIGHT }}>
          <div className={cn("shrink-0 border-r border-line relative")} style={{ width: RAIL_WIDTH }}>
            {HOURS.map(h => (
              <div key={h} className={cn("absolute right-1.5 text-[10px] text-ink-muted tabular-nums")}
                style={{ top: h * HOUR_HEIGHT - 6 }}>
                {h === 0 ? '' : format(new Date(2000, 0, 1, h), 'HH:mm')}
              </div>
            ))}
          </div>
          {days.map(day => {
            const timed = timedByDay.get(day.key) ?? [];
            const placements = packTimedColumns(timed.map(t => ({ id: t.ev.pageId, startMin: t.startMin, endMin: t.endMin })));
            const nowMin = nowLineMinutes(now, day.key);
            const liveDrag = timeDrag?.hasMoved && timeDrag.dayKey === day.key ? timeDrag : null;
            return (
              <div key={day.key} data-cal-timecol={day.key}
                onPointerDown={e => {
                  if ((e.target as HTMLElement).closest('[data-cal-event]')) return;
                  onColumnPointerDown?.(e, day);
                }}
                className={cn(`flex-1 min-w-0 relative border-r border-line last:border-r-0
                  ${isToday(day.date) ? 'bg-accent-soft/20' : ''}`)}>
                {HOURS.map(h => (
                  <div key={h} className={cn("absolute inset-x-0 border-t border-line-faint")}
                    style={{ top: h * HOUR_HEIGHT }} />
                ))}
                {timed.map(chip => {
                  const place = placements.find(p => p.id === chip.ev.pageId);
                  const data = chipData.get(chip.ev.pageId);
                  if (!place || !data) return null;
                  const isDragSource = timeDrag?.pageId === chip.ev.pageId && timeDrag.hasMoved;
                  const style: React.CSSProperties = {
                    top: minutesToOffsetPx(chip.startMin, HOUR_HEIGHT),
                    height: Math.max(minutesToOffsetPx(chip.endMin - chip.startMin, HOUR_HEIGHT), 18),
                    left: `calc(${place.col} * (100% / ${place.cols}) + 2px)`,
                    width: `calc(100% / ${place.cols} - 4px)`,
                    ...(data.color.tint
                      ? { background: data.color.tint, boxShadow: `inset 2px 0 0 ${data.color.accent}` }
                      : {}),
                  };
                  return (
                    <div key={chip.ev.pageId} data-cal-event={chip.ev.pageId} role="button" tabIndex={0}
                      onPointerDown={e => onTimedPointerDown?.(e, chip)}
                      onClick={() => { if (!suppressClickRef?.current) onOpen(chip.ev.pageId); }}
                      onKeyDown={e => { if (e.key === 'Enter') onOpen(chip.ev.pageId); }}
                      className={cn(`absolute rounded px-1.5 py-0.5 text-[11px] overflow-hidden cursor-grab
                        active:cursor-grabbing select-none hover:shadow-sm
                        ${data.color.tint ? 'text-ink-body' : data.color.className || 'bg-accent-soft text-accent-text'}
                        ${isDragSource ? 'opacity-40' : ''}`)}
                      style={style}>
                      <span className={cn("opacity-70 tabular-nums mr-1")}>
                        {format(new Date(chip.ev.startIso), 'HH:mm')}
                      </span>
                      {data.title}
                      <span data-cal-time-resize role="presentation"
                        onPointerDown={e => onTimedResizePointerDown?.(e, chip)}
                        className={cn("absolute inset-x-0 bottom-0 h-1.5 cursor-row-resize")} />
                    </div>
                  );
                })}
                {liveDrag && (
                  <div aria-hidden="true"
                    className={cn("absolute inset-x-0.5 rounded bg-accent-soft ring-1 ring-ring-accent-muted pointer-events-none")}
                    style={{
                      top: minutesToOffsetPx(liveDrag.startMin, HOUR_HEIGHT),
                      height: Math.max(minutesToOffsetPx(liveDrag.endMin - liveDrag.startMin, HOUR_HEIGHT), 12),
                    }} />
                )}
                {nowMin !== null && (
                  <div data-cal-now-line aria-hidden="true"
                    className={cn("absolute inset-x-0 pointer-events-none")}
                    style={{ top: minutesToOffsetPx(nowMin, HOUR_HEIGHT) }}>
                    <div className={cn("h-0.5 bg-danger-text")} />
                    <div className={cn("w-2 h-2 rounded-full bg-danger-text -mt-1.5 -ml-1")} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
