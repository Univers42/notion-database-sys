/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   TimelineView.tsx                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:38:51 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 23:28:30 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useDatabaseStore } from '../../../store/dbms/hardcoded/useDatabaseStore';
import { useActiveViewId } from '../../../hooks/useDatabaseScope';
import { addDays, startOfWeek, eachDayOfInterval, isToday as isTodayFn } from 'date-fns';
import { Plus } from 'lucide-react';
import {
  getTimelineConfig, getMonthGroups, findDateProperties,
  type ZoomLevel,
} from './TimelineViewHelpers';
import { TimelineDatePicker } from './TimelineDatePicker';
import type { DatePickerState } from './timelineTypes';
import { useTimelineDrag } from './useTimelineDrag';
import { TimelineToolbar } from './TimelineToolbar';
import { TimelineLeftPanel } from './TimelineLeftPanel';
import { TimelineDayHeaders } from './TimelineDayHeaders';
import { TimelineRow } from './TimelineRow';
import { TodayMarker } from './TimelineBarComponents';
import { cn } from '../../../utils/cn';

/** Renders a drag-and-drop timeline (Gantt) view for date-based database pages. */
export function TimelineView() {
  const activeViewId = useActiveViewId();
  const {
    views, databases, getPagesForView, updatePageProperty,
    openPage, addPage, getPageTitle,
  } = useDatabaseStore();
  const view = activeViewId ? views[activeViewId] : null;
  const database = view ? databases[view.databaseId] : null;

  const [offset, setOffset] = useState(0);
  const [hoverRow, setHoverRow] = useState<string | null>(null);
  const [datePicker, setDatePicker] = useState<DatePickerState | null>(null);

  const pages = view ? getPagesForView(view.id) : [];
  const settings = view?.settings || {};
  const showTable = settings.showTable !== false;
  const zoomLevel = (settings.zoomLevel || 'week') as ZoomLevel;
  const loadLimit = settings.loadLimit || 100;
  const displayedPages = pages.slice(0, loadLimit);

  const dateProps = database ? findDateProperties(database.properties) : { startProp: null, endProp: null };
  const startProp = dateProps.startProp;
  const endProp = dateProps.endProp;
  const dbId = database?.id ?? '';

  const today = new Date();
  const config = getTimelineConfig(zoomLevel);
  const startDate = addDays(startOfWeek(today, { weekStartsOn: 1 }), offset);
  const endDate = addDays(startDate, config.daysToShow - 1);
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const totalWidth = days.length * config.cellWidth;
  const monthGroups = getMonthGroups(days);
  const todayIdx = days.findIndex(d => isTodayFn(d));

  const handleZoom = (level: ZoomLevel) => {
    if (!view) return;
    useDatabaseStore.getState().updateViewSettings(view.id, { zoomLevel: level });
  };
  const navStep = Math.max(7, Math.floor(config.daysToShow / 3));

  const statusProp = useMemo(
    () => database?.properties
      ? Object.values(database.properties).find(
          p => p.type === 'status' || (p.type === 'select' && p.name.toLowerCase().includes('status')),
        )
      : undefined,
    [database?.properties],
  );

  const { dragState, scrollRef, findEndProp, ensureEndProp, handlePointerDown, handlePointerMove, handlePointerUp } =
    useTimelineDrag({ cellWidth: config.cellWidth, startDate, startPropId: startProp?.id ?? '', dbId, updatePageProperty });

  const handleGridCellClick = useCallback(
    (dayIdx: number) => {
      if (dragState || !startProp || !dbId) return;
      const clickDate = addDays(startDate, dayIdx);
      addPage(dbId, { [startProp.id]: clickDate.toISOString() });
    },
    [dragState, startDate, startProp, dbId, addPage],
  );

  const openDatePicker = useCallback(
    (pageId: string, rect: DOMRect) => { setDatePicker({ pageId, anchorRect: rect }); },
    [],
  );

  const dpPage = datePicker ? pages.find(p => p.id === datePicker.pageId) ?? null : null;
  let dpStartDate: Date | null = null;
  if (dpPage && startProp && dpPage.properties[startProp.id]) dpStartDate = new Date(dpPage.properties[startProp.id]);
  let dpEndDate: Date | null = null;
  if (dpPage && endProp && dpPage.properties[endProp.id]) dpEndDate = new Date(dpPage.properties[endProp.id]);
  const dpHasEnd = dpEndDate !== null && dpEndDate !== undefined;

  useEffect(() => {
    if (scrollRef.current && todayIdx >= 0) {
      const targetLeft = todayIdx * config.cellWidth - scrollRef.current.clientWidth / 3;
      scrollRef.current.scrollLeft = Math.max(0, targetLeft);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomLevel]);

  if (!view || !database) return null;
  if (!startProp) {
    return (
      <div className={cn("flex-1 flex items-center justify-center text-ink-secondary")}>
        Timeline view requires at least one date property.
      </div>
    );
  }

  return (
    <div className={cn("flex-1 overflow-hidden bg-surface-primary flex h-full flex-col select-none")}>
      <TimelineToolbar
        startDate={startDate} endDate={endDate} zoomLevel={zoomLevel} navStep={navStep}
        onOffsetChange={d => setOffset(o => o + d)} onResetOffset={() => setOffset(0)} onZoom={handleZoom}
      />
      <div className={cn("flex-1 flex overflow-hidden")}>
        {showTable && (
          <TimelineLeftPanel
            displayedPages={displayedPages} config={config} hoverRow={hoverRow}
            getPageTitle={getPageTitle} openPage={openPage} setHoverRow={setHoverRow}
            onAddPage={() => addPage(database.id, { [startProp.id]: today.toISOString() })}
          />
        )}
        <div ref={scrollRef} className={cn("flex-1 overflow-x-auto overflow-y-auto flex flex-col")}
          onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}
        >
          <TimelineDayHeaders monthGroups={monthGroups} days={days} config={config} zoomLevel={zoomLevel} />
          <div className={cn("relative overflow-hidden")} style={{ width: totalWidth }}>
            {todayIdx >= 0 && <TodayMarker todayIdx={todayIdx} cellWidth={config.cellWidth} />}
            {displayedPages.map(page => (
              <TimelineRow
                key={page.id} page={page} startPropId={startProp.id} endPropId={endProp?.id ?? null}
                startDate={startDate} config={config} zoomLevel={zoomLevel} statusProp={statusProp}
                getPageTitle={getPageTitle} dragState={dragState} hoverRow={hoverRow}
                setHoverRow={setHoverRow} days={days} todayIdx={todayIdx}
                handleGridCellClick={handleGridCellClick} handlePointerDown={handlePointerDown}
                openDatePicker={openDatePicker}
              />
            ))}
            <button type="button"
              className={cn(`flex items-center border-b border-line-light text-ink-muted
                         hover:bg-hover-surface-soft cursor-pointer transition-colors text-left`)}
              style={{ height: config.rowHeight }}
              onClick={() => addPage(database.id, { [startProp.id]: today.toISOString() })}
            >
              <div className={cn("flex items-center gap-1 px-3 text-xs")}>
                <Plus className={cn("w-3.5 h-3.5")} /><span>New</span>
              </div>
            </button>
          </div>
        </div>
      </div>
      {datePicker && dpPage && (
        <TimelineDatePicker
          anchorRect={datePicker.anchorRect} startDate={dpStartDate} endDate={dpEndDate} hasEndDate={dpHasEnd}
          onChangeStart={d => updatePageProperty(datePicker.pageId, startProp.id, d.toISOString())}
          onChangeEnd={d => {
            if (d) { const ep = ensureEndProp(); if (ep) updatePageProperty(datePicker.pageId, ep.id, d.toISOString()); }
            else { const ep = findEndProp(); if (ep) updatePageProperty(datePicker.pageId, ep.id, null); }
          }}
          onToggleEndDate={enabled => {
            if (enabled && dpStartDate) { const ep = ensureEndProp(); if (ep) updatePageProperty(datePicker.pageId, ep.id, addDays(dpStartDate, 3).toISOString()); }
            else { const ep = findEndProp(); if (ep) updatePageProperty(datePicker.pageId, ep.id, null); }
          }}
          onClear={() => { updatePageProperty(datePicker.pageId, startProp.id, null); const ep = findEndProp(); if (ep) updatePageProperty(datePicker.pageId, ep.id, null); }}
          onClose={() => setDatePicker(null)}
        />
      )}
    </div>
  );
}
