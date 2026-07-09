/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   CalendarView.tsx                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:38:04 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── CalendarView — orchestrator: settings → models → mode views ────────────
// All layout math lives in ./model (pure, unit-tested); this file wires store
// data into it, hosts the drag machine + popovers + shortcuts, and dispatches
// month / week / day / agenda.

import React, { useMemo, useRef, useState } from 'react';
import { addMonths, addWeeks, addDays } from 'date-fns';
import { useDatabaseStore } from '../../../store/dbms/hardcoded/useDatabaseStore';
import { useActiveViewId } from '../../../hooks/useDatabaseScope';
import { useViewPages } from '../../../hooks/useViewPages';
import { CalendarHeader } from './CalendarHeader';
import { CalendarMonthGrid } from './CalendarMonthGrid';
import { CalendarTimeGridHost } from './CalendarTimeGridHost';
import { CalendarAgendaView } from './CalendarAgendaView';
import { CalendarDayPopover } from './CalendarDayPopover';
import { CalendarEventPopover } from './CalendarEventPopover';
import { useCalendarChips } from './useCalendarChips';
import { useCalendarDrag } from './useCalendarDrag';
import { useCalendarEndProp } from './useCalendarEndProp';
import { useCalendarKeyboard } from './useCalendarKeyboard';
import { buildMonthGrid, buildWeekGrid, buildDayGrid } from './model/calendarGrid';
import { resolveCalendarProps, pageToEvent, eventsOnDay } from './model/calendarEvents';
import { segmentIntoWeeks, packWeekLanes, visibleSegments, overflowByDay } from './model/calendarLanes';
import { MAX_VISIBLE_LANES } from './model/calendarTypes';
import type { CalendarAction, CalendarMode, CalEvent, DayInfo } from './model/calendarTypes';
import type { GhostSegment } from './CalendarWeekRow';
import { AGENDA_DAYS } from './calendarConfig';
import { cn } from '../../../utils/cn';

const NAV_STEP: Record<CalendarMode, (d: Date, dir: number) => Date> = {
  month: (d, dir) => addMonths(d, dir),
  week: (d, dir) => addWeeks(d, dir),
  day: (d, dir) => addDays(d, dir),
  agenda: (d, dir) => addDays(d, dir * AGENDA_DAYS),
};

const MODE_ACTIONS: Partial<Record<CalendarAction, CalendarMode>> = {
  'month-mode': 'month', 'week-mode': 'week', 'day-mode': 'day', 'agenda-mode': 'agenda',
};

interface DayPopoverState { day: DayInfo; anchorRect: DOMRect }
interface EventPopoverState { pageId: string; anchorRect: DOMRect }

/** Notion/Google-parity calendar over the view's date property. */
export function CalendarView() {
  const activeViewId = useActiveViewId();
  const views = useDatabaseStore(s => s.views);
  const databases = useDatabaseStore(s => s.databases);
  const updatePageProperty = useDatabaseStore(s => s.updatePageProperty);
  const updateViewSettings = useDatabaseStore(s => s.updateViewSettings);
  const openPage = useDatabaseStore(s => s.openPage);
  const addPage = useDatabaseStore(s => s.addPage);
  const getPageTitle = useDatabaseStore(s => s.getPageTitle);
  const view = activeViewId ? views[activeViewId] : null;
  const database = view ? databases[view.databaseId] : null;
  const rootRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState(new Date());
  const [dayPopover, setDayPopover] = useState<DayPopoverState | null>(null);
  const [eventPopover, setEventPopover] = useState<EventPopoverState | null>(null);

  const pages = useViewPages(view?.id);
  const settings = view?.settings || {};
  const mode = ((settings.calendarMode ?? settings.showCalendarAs ?? 'month') as CalendarMode);
  const weekStartsOn: 0 | 1 = settings.weekStartsOn === 0 ? 0 : 1;
  const showWeekends = settings.showWeekends !== false;

  const { startProp, endProp } = useMemo(
    () => resolveCalendarProps(database?.properties ?? {}, settings.showCalendarBy),
    [database?.properties, settings.showCalendarBy],
  );

  const events = useMemo<CalEvent[]>(() => {
    if (!startProp) return [];
    return pages
      .map(page => pageToEvent(page, startProp.id, endProp?.id ?? null))
      .filter((ev): ev is CalEvent => ev !== null);
  }, [pages, startProp, endProp]);

  const grid = useMemo(() => {
    const opts = { weekStartsOn, showWeekends };
    if (mode === 'week') return buildWeekGrid(anchor, opts);
    if (mode === 'day') return buildDayGrid(anchor);
    return buildMonthGrid(anchor, opts);
  }, [mode, anchor, weekStartsOn, showWeekends]);

  const packed = useMemo(
    () => packWeekLanes(segmentIntoWeeks(events, grid), events),
    [events, grid],
  );
  const bars = useMemo(() => visibleSegments(packed, MAX_VISIBLE_LANES), [packed]);
  const overflow = useMemo(
    () => overflowByDay(packed, grid, MAX_VISIBLE_LANES),
    [packed, grid],
  );

  const chipData = useCalendarChips(
    events, pages, database, startProp, settings.conditionalColors, getPageTitle,
  );

  const { ensureEndProp } = useCalendarEndProp(database?.id, startProp?.id);
  const navigate = (dir: -1 | 1): void => setAnchor(a => NAV_STEP[mode](a, dir));
  const { drag, suppressClickRef, begin, handlePointerMove, handlePointerUp } = useCalendarDrag({
    rootRef,
    startPropId: startProp?.id,
    endPropId: endProp?.id ?? null,
    databaseId: database?.id,
    updatePageProperty, addPage, ensureEndProp,
    onNavigate: navigate,
  });

  // The in-flight drag previews as ghost segments over the same lane model.
  const ghosts = useMemo<GhostSegment[]>(() => {
    if (!drag?.hasMoved) return [];
    const preview: CalEvent = {
      pageId: '__ghost__', startKey: drag.preview.startKey, endKey: drag.preview.endKey,
      isRanged: drag.preview.endKey !== drag.preview.startKey, startIso: '', endIso: null,
    };
    return segmentIntoWeeks([preview], grid)
      .map(seg => ({ startCol: seg.startCol, endCol: seg.endCol, weekIndex: seg.weekIndex }));
  }, [drag, grid]);

  const quickCreate = (day: DayInfo | Date): void => {
    if (!database || !startProp) return;
    const date = day instanceof Date ? day : day.date;
    addPage(database.id, { [startProp.id]: date.toISOString() });
  };

  useCalendarKeyboard(rootRef, action => {
    if (!view) return;
    if (action === 'today') setAnchor(new Date());
    else if (action === 'prev') navigate(-1);
    else if (action === 'next') navigate(1);
    else if (action === 'create') quickCreate(anchor);
    else {
      const next = MODE_ACTIONS[action];
      if (next) updateViewSettings(view.id, { calendarMode: next });
    }
  });

  if (!view || !database) return null;
  if (!startProp) {
    return (
      <div className={cn("flex-1 flex items-center justify-center text-ink-secondary")}>
        Calendar view requires a date property.
      </div>
    );
  }

  const chipDown = (e: React.PointerEvent, pageId: string): void => {
    const ev = events.find(item => item.pageId === pageId);
    if (ev) begin(e, 'move', ev.startKey, ev);
  };
  const handleDown = (e: React.PointerEvent, pageId: string, side: 'left' | 'right'): void => {
    const ev = events.find(item => item.pageId === pageId);
    if (ev) begin(e, side === 'left' ? 'resize-left' : 'resize-right', side === 'left' ? ev.startKey : ev.endKey, ev);
  };
  const eventPopoverPage = eventPopover ? pages.find(p => p.id === eventPopover.pageId) : null;

  return (
    <div ref={rootRef} data-cal-root data-cal-mode={mode} tabIndex={-1}
      onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}
      className={cn("flex-1 overflow-auto p-4 bg-surface-primary flex flex-col h-full outline-none")}>
      <CalendarHeader mode={mode} anchor={anchor} weekStartsOn={weekStartsOn}
        onNavigate={navigate}
        onToday={() => setAnchor(new Date())}
        onModeChange={next => updateViewSettings(view.id, { calendarMode: next })} />
      {mode === 'month' && (
        <CalendarMonthGrid grid={grid}
          showWeekNumbers={!!settings.showWeekNumbers}
          wrapTitles={!!settings.wrapPageTitles}
          segments={bars} chipData={chipData} ghosts={ghosts} overflow={overflow}
          draggingPageId={drag?.hasMoved ? drag.pageId : null}
          onOpen={openPage}
          onEditDates={(pageId, anchorRect) => setEventPopover({ pageId, anchorRect })}
          onQuickCreate={quickCreate}
          onExpandDay={(day, anchorRect) => setDayPopover({ day, anchorRect })}
          onChipPointerDown={chipDown}
          onHandlePointerDown={handleDown}
          onEmptyPointerDown={(e, day) => begin(e, 'create', day.key, null)}
          suppressClickRef={suppressClickRef} />
      )}
      {(mode === 'week' || mode === 'day') && (
        <CalendarTimeGridHost grid={grid} events={events} chipData={chipData}
          includeTime={!!startProp.dateIncludeTime}
          startPropId={startProp.id} databaseId={database.id}
          updatePageProperty={updatePageProperty} addPage={addPage} ensureEndProp={ensureEndProp}
          monthGhosts={ghosts} monthDragPageId={drag?.hasMoved ? drag.pageId : null}
          onOpen={openPage}
          onEditDates={(pageId, anchorRect) => setEventPopover({ pageId, anchorRect })}
          onQuickCreate={quickCreate}
          onExpandDay={(day, anchorRect) => setDayPopover({ day, anchorRect })}
          onBandChipPointerDown={chipDown}
          onBandHandlePointerDown={handleDown}
          bandSuppressClickRef={suppressClickRef} />
      )}
      {mode === 'agenda' && (
        <CalendarAgendaView events={events} chipData={chipData} anchor={anchor}
          onOpen={openPage} onQuickCreate={quickCreate} />
      )}
      {dayPopover && (
        <CalendarDayPopover day={dayPopover.day} anchorRect={dayPopover.anchorRect}
          events={eventsOnDay(events, dayPopover.day.key)} chipData={chipData}
          onOpen={openPage}
          onQuickCreate={() => quickCreate(dayPopover.day)}
          onClose={() => setDayPopover(null)} />
      )}
      {eventPopover && eventPopoverPage && (
        <CalendarEventPopover page={eventPopoverPage} anchorRect={eventPopover.anchorRect}
          startProp={startProp} databaseId={database.id}
          updatePageProperty={updatePageProperty} ensureEndProp={ensureEndProp}
          onClose={() => setEventPopover(null)} />
      )}
    </div>
  );
}
