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

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useDatabaseStore } from '../../../store/dbms/hardcoded/useDatabaseStore';
import { useActiveViewId } from '../../../hooks/useDatabaseScope';
import {
  addDays, startOfWeek, eachDayOfInterval, format, isToday as isTodayFn,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import {
  getTimelineConfig, getBarGeometry, getBarColorSet, getDayHeaderBg,
  getGridCellBg, getMonthGroups, findDateProperties, clampDuration,
  computeBarVerbosity, compactDateRange,
  type ZoomLevel, type BarGeometry, type BarColorSet,
} from './TimelineViewHelpers';
import { TimelineDatePicker } from './TimelineDatePicker';
import { cn } from '../../../utils/cn';


type DragKind = 'move' | 'resize-left' | 'resize-right';

interface DragState {
  pageId: string;
  kind: DragKind;
  originDayIdx: number;
  originBar: BarGeometry;
  liveLeft: number;
  liveWidth: number;
  /** Track if user actually moved to suppress click-open */
  hasMoved: boolean;
}


interface DatePickerState {
  pageId: string;
  anchorRect: DOMRect;
}


const RESIZE_HANDLE_WIDTH = 10;
const LEFT_PANEL_WIDTH = 240;
const BAR_V_PADDING = 6; // top+bottom inside the row
const EDGE_SCROLL_ZONE = 40; // px from viewport edge to trigger auto-scroll
const EDGE_SCROLL_SPEED = 12; // px per frame

/** Handle edge auto-scrolling during a drag operation. */
function handleAutoScroll(
  clientX: number,
  scrollEl: HTMLDivElement | null,
  autoScrollRef: React.RefObject<number | null>,
  dragActive: boolean,
): void {
  if (!scrollEl) return;
  const rect = scrollEl.getBoundingClientRect();
  const xInContainer = clientX - rect.left;
  if (autoScrollRef.current) cancelAnimationFrame(autoScrollRef.current);

  if (xInContainer < EDGE_SCROLL_ZONE) {
    const step = () => {
      if (!scrollEl || !dragActive) return;
      scrollEl.scrollLeft = Math.max(0, scrollEl.scrollLeft - EDGE_SCROLL_SPEED);
      autoScrollRef.current = requestAnimationFrame(step);
    };
    autoScrollRef.current = requestAnimationFrame(step);
  } else if (xInContainer > rect.width - EDGE_SCROLL_ZONE) {
    const step = () => {
      if (!scrollEl || !dragActive) return;
      scrollEl.scrollLeft += EDGE_SCROLL_SPEED;
      autoScrollRef.current = requestAnimationFrame(step);
    };
    autoScrollRef.current = requestAnimationFrame(step);
  } else {
    autoScrollRef.current = null;
  }
}

/** Compute the drag position (left/width) based on drag kind and delta. */
function computeDragPosition(
  kind: DragKind,
  originBar: BarGeometry,
  delta: number,
  cellWidth: number,
): { liveLeft: number; liveWidth: number } {
  if (kind === 'move') {
    return {
      liveLeft: (originBar.startDay + delta) * cellWidth,
      liveWidth: originBar.width,
    };
  }
  if (kind === 'resize-left') {
    const { s, e } = clampDuration(originBar.startDay + delta, originBar.endDay);
    return { liveLeft: s * cellWidth, liveWidth: (e - s) * cellWidth };
  }
  // resize-right
  const { s, e } = clampDuration(originBar.startDay, originBar.endDay + delta);
  return { liveLeft: s * cellWidth, liveWidth: (e - s) * cellWidth };
}

/** Renders the vertical "today" marker line. */
function TodayMarker({ todayIdx, cellWidth }: Readonly<{ todayIdx: number; cellWidth: number }>) {
  return (
    <div
      className={cn("absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none")}
      style={{ left: todayIdx * cellWidth + cellWidth / 2 }}
    />
  );
}

/** Compute status/title/date metadata for a timeline bar. */
function computeBarMeta(
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
function computeDragOverrides(
  pageId: string, dragState: DragState | null, bar: BarGeometry | null,
): { isDragging: boolean; displayLeft: number; displayWidth: number } {
  const isDragging = dragState?.pageId === pageId;
  const displayLeft = isDragging && dragState ? dragState.liveLeft : bar?.left ?? 0;
  const displayWidth = isDragging && dragState ? dragState.liveWidth : bar?.width ?? 0;
  return { isDragging, displayLeft, displayWidth };
}

/** Renders adaptive bar content based on available width. */
function BarContent({ verbosity, statusLabel, dateLabel, icon }: Readonly<{
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


function BarTooltip({
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

/** Apply drag delta for the 'move' kind. */
function applyMoveDrag(
  originBar: BarGeometry, delta: number, pageId: string,
  startDate: Date, startPropId: string,
  updateProp: (pid: string, propId: string, val: string) => void,
  ensureEndProp: () => { id: string } | null,
): void {
  const newStart = addDays(startDate, originBar.startDay + delta);
  updateProp(pageId, startPropId, newStart.toISOString());
  if (!originBar.hasEndDate) return;
  const ep = ensureEndProp();
  if (!ep) return;
  const newEnd = addDays(startDate, originBar.endDay + delta);
  updateProp(pageId, ep.id, newEnd.toISOString());
}

/** Apply drag delta for the 'resize-left' kind. */
function applyResizeLeftDrag(
  originBar: BarGeometry, delta: number, pageId: string,
  startDate: Date, startPropId: string,
  updateProp: (pid: string, propId: string, val: string) => void,
  ensureEndProp: () => { id: string } | null,
): void {
  const { s } = clampDuration(originBar.startDay + delta, originBar.endDay);
  updateProp(pageId, startPropId, addDays(startDate, s).toISOString());
  if (originBar.hasEndDate) return;
  const ep = ensureEndProp();
  if (!ep) return;
  updateProp(pageId, ep.id, addDays(startDate, originBar.endDay).toISOString());
}

/** Apply drag delta for the 'resize-right' kind. */
function applyResizeRightDrag(
  originBar: BarGeometry, delta: number, pageId: string,
  startDate: Date,
  updateProp: (pid: string, propId: string, val: string) => void,
  ensureEndProp: () => { id: string } | null,
): void {
  const { e: end } = clampDuration(originBar.startDay, originBar.endDay + delta);
  const ep = ensureEndProp();
  if (!ep) return;
  updateProp(pageId, ep.id, addDays(startDate, end).toISOString());
}

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
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [hoverRow, setHoverRow] = useState<string | null>(null);
  const [datePicker, setDatePicker] = useState<DatePickerState | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef<number | null>(null);

  const pages = view ? getPagesForView(view.id) : [];
  const settings = view?.settings || {};
  const showTable = settings.showTable !== false;
  const zoomLevel = (settings.zoomLevel || 'week') as ZoomLevel;
  const loadLimit = settings.loadLimit || 100;
  const displayedPages = pages.slice(0, loadLimit);

  const dateProps = database
    ? findDateProperties(database.properties)
    : { startProp: null, endProp: null };
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
    () =>
      database?.properties
        ? Object.values(database.properties).find(
            p =>
              p.type === 'status' ||
              (p.type === 'select' && p.name.toLowerCase().includes('status')),
          )
        : undefined,
    [database?.properties],
  );

  const getDayFromMouse = useCallback(
    (clientX: number): number => {
      if (!scrollRef.current) return 0;
      return Math.floor((clientX - scrollRef.current.getBoundingClientRect().left + scrollRef.current.scrollLeft) / config.cellWidth);
    },
    [config.cellWidth],
  );

  const findEndProp = useCallback((): import('../../../types/database').SchemaProperty | null => {
    if (!dbId) return null;
    const freshDb = useDatabaseStore.getState().databases[dbId];
    if (!freshDb) return null;
    const { endProp } = findDateProperties(freshDb.properties);
    if (endProp) return endProp;
    return Object.values(freshDb.properties).find(
      p => p.name === 'End Date' && (p.type === 'date' || p.type === 'due_date'),
    ) ?? null;
  }, [dbId]);

  const ensureEndProp = useCallback((): import('../../../types/database').SchemaProperty | null => {
    if (!dbId) return null;
    const existing = findEndProp();
    if (existing) return existing;
    useDatabaseStore.getState().addProperty(dbId, 'End Date', 'date');
    const updatedDb = useDatabaseStore.getState().databases[dbId];
    if (!updatedDb) return null;
    return Object.values(updatedDb.properties).find(
      p => p.name === 'End Date' && (p.type === 'date' || p.type === 'due_date'),
    ) ?? null;
  }, [dbId, findEndProp]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, pageId: string, kind: DragKind, bar: BarGeometry) => {
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setDragState({
        pageId,
        kind,
        originDayIdx: getDayFromMouse(e.clientX),
        originBar: bar,
        liveLeft: bar.left,
        liveWidth: bar.width,
        hasMoved: false,
      });
    },
    [getDayFromMouse],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState) return;
      const currentDay = getDayFromMouse(e.clientX);
      const delta = currentDay - dragState.originDayIdx;
      if (delta === 0 && !dragState.hasMoved) return;

      handleAutoScroll(e.clientX, scrollRef.current, autoScrollRef, !!dragState);

      const pos = computeDragPosition(dragState.kind, dragState.originBar, delta, config.cellWidth);
      setDragState(prev => prev ? { ...prev, ...pos, hasMoved: true } : null);
    },
    [dragState, getDayFromMouse, config.cellWidth],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState || !startProp) return;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);

      // Stop auto-scroll
      if (autoScrollRef.current) {
        cancelAnimationFrame(autoScrollRef.current);
        autoScrollRef.current = null;
      }

      const currentDay = getDayFromMouse(e.clientX);
      const delta = currentDay - dragState.originDayIdx;
      const { originBar, pageId, kind, hasMoved } = dragState;

      if (hasMoved && delta !== 0) {
        if (kind === 'move') {
          applyMoveDrag(originBar, delta, pageId, startDate, startProp.id, updatePageProperty, ensureEndProp);
        } else if (kind === 'resize-left') {
          applyResizeLeftDrag(originBar, delta, pageId, startDate, startProp.id, updatePageProperty, ensureEndProp);
        } else {
          applyResizeRightDrag(originBar, delta, pageId, startDate, updatePageProperty, ensureEndProp);
        }
      }

      setDragState(null);
    },
    [dragState, getDayFromMouse, startDate, startProp, updatePageProperty, ensureEndProp],
  );

  const handleGridCellClick = useCallback(
    (dayIdx: number) => {
      if (dragState || !startProp || !dbId) return;
      const clickDate = addDays(startDate, dayIdx);
      addPage(dbId, { [startProp.id]: clickDate.toISOString() });
    },
    [dragState, startDate, startProp, dbId, addPage],
  );

  const openDatePicker = useCallback(
    (pageId: string, rect: DOMRect) => {
      setDatePicker({ pageId, anchorRect: rect });
    },
    [],
  );

  const dpPage = datePicker
    ? pages.find(p => p.id === datePicker.pageId) ?? null
    : null;

  let dpStartDate: Date | null = null;
  if (dpPage && startProp && dpPage.properties[startProp.id]) {
    dpStartDate = new Date(dpPage.properties[startProp.id]);
  }

  let dpEndDate: Date | null = null;
  if (dpPage && endProp && dpPage.properties[endProp.id]) {
    dpEndDate = new Date(dpPage.properties[endProp.id]);
  }

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

      <div className={cn("flex items-center justify-between px-4 py-2 border-b border-line bg-surface-secondary shrink-0")}>
        <div className={cn("flex items-center gap-2")}>
          <button
            onClick={() => setOffset(o => o - navStep)}
            className={cn("p-1 hover:bg-hover-surface3 rounded text-ink-secondary transition-colors")}
          >
            <ChevronLeft className={cn("w-4 h-4")} />
          </button>
          <button
            onClick={() => setOffset(0)}
            className={cn("px-2 py-1 hover:bg-hover-surface3 rounded text-xs font-medium text-ink-body-light transition-colors")}
          >
            Today
          </button>
          <button
            onClick={() => setOffset(o => o + navStep)}
            className={cn("p-1 hover:bg-hover-surface3 rounded text-ink-secondary transition-colors")}
          >
            <ChevronRight className={cn("w-4 h-4")} />
          </button>
          <span className={cn("text-xs font-medium text-ink-secondary ml-2")}>
            {format(startDate, 'MMM d')} – {format(endDate, 'MMM d, yyyy')}
          </span>
        </div>

        {/* Zoom toggle */}
        <div className={cn("flex items-center gap-1 bg-surface-muted rounded-md p-0.5")}>
          {(['day', 'week', 'month'] as const).map(level => (
            <button
              key={level}
              onClick={() => handleZoom(level)}
              className={cn(`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                zoomLevel === level
                  ? 'bg-surface-primary shadow-sm text-ink'
                  : 'text-ink-body-light hover:text-hover-text-bolder'
              }`)}
            >
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className={cn("flex-1 flex overflow-hidden")}>
        {showTable && (
          <div
            className={cn("border-r border-line shrink-0 flex flex-col bg-surface-secondary")}
            style={{ width: LEFT_PANEL_WIDTH }}
          >
            <div className={cn("h-[52px] border-b border-line flex items-end px-3 pb-2")}>
              <span className={cn("font-medium text-xs text-ink-secondary uppercase tracking-wider")}>
                Pages
              </span>
            </div>

            <div className={cn("flex-1 overflow-y-auto")}>
              {displayedPages.map(page => {
                const title = getPageTitle(page);
                return (
                  <button
                    type="button"
                    key={page.id}
                    className={cn(`flex items-center px-3 text-sm border-b border-line-light
                                cursor-pointer transition-colors text-left ${
                      hoverRow === page.id ? 'bg-hover-surface2' : 'hover:bg-hover-surface-soft'
                    }`)}
                    style={{ height: config.rowHeight }}
                    onClick={() => openPage(page.id)}
                    onMouseEnter={() => setHoverRow(page.id)}
                    onMouseLeave={() => setHoverRow(null)}
                  >
                    {page.icon && (
                      <span className={cn("mr-1.5 shrink-0")}>{page.icon}</span>
                    )}
                    <span className={cn("truncate text-ink")}>
                      {title || <span className={cn("text-ink-muted")}>Untitled</span>}
                    </span>
                  </button>
                );
              })}

              <button
                onClick={() => {
                  addPage(database.id, { [startProp.id]: today.toISOString() });
                }}
                className={cn(`flex items-center gap-2 w-full px-3 py-2 text-sm text-ink-muted
                           hover:text-hover-text hover:bg-hover-surface2 transition-colors`)}
              >
                <Plus className={cn("w-4 h-4")} /> New
              </button>
            </div>
          </div>
        )}

        <div
          ref={scrollRef}
          className={cn("flex-1 overflow-x-auto overflow-y-auto flex flex-col")}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <div className={cn("shrink-0 sticky top-0 z-30 bg-surface-secondary border-b border-line")}>
            {/* Month groups */}
            <div className={cn("flex h-6 border-b border-line-light")}>
              {monthGroups.map((g, idx) => (
                <div
                  key={`${g.year}-${g.month}-${idx}`}
                  className={cn(`shrink-0 text-[10px] font-semibold text-ink-secondary
                             flex items-center px-2 border-r border-line-light`)}
                  style={{ width: g.colSpan * config.cellWidth }}
                >
                  {g.label}
                </div>
              ))}
            </div>

            {/* Day columns */}
            <div className={cn("flex h-[26px]")}>
              {days.map((day, i) => {
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                const isTodayCol = isTodayFn(day);
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(`shrink-0 border-r border-line-light flex items-center justify-center
                                text-[10px] ${getDayHeaderBg(isTodayCol, isWeekend)}`)}
                    style={{ width: config.cellWidth }}
                  >
                    {(() => {
                      if (zoomLevel === 'day') {
                        return (
                          <div className={cn("flex flex-col items-center leading-tight")}>
                            <span className={cn("text-ink-muted")}>{format(day, 'EEE')}</span>
                            <span
                              className={cn(`font-medium ${
                                isTodayCol
                                  ? 'text-accent-text-light bg-accent-muted w-5 h-5 rounded-full flex items-center justify-center text-[10px]'
                                  : 'text-ink-body'
                              }`)}
                            >
                              {format(day, 'd')}
                            </span>
                          </div>
                        );
                      }
                      if (zoomLevel === 'month') {
                        return (
                          <span
                            className={cn(`font-medium ${
                              isTodayCol ? 'text-accent-text-light' : 'text-ink-muted'
                            }`)}
                          >
                            {day.getDate() === 1 || i === 0 ? format(day, 'd') : ''}
                          </span>
                        );
                      }
                      return (
                        <span
                          className={cn(`font-medium ${
                            isTodayCol ? 'text-accent-text-light' : 'text-ink-body'
                          }`)}
                        >
                          {format(day, 'd')}
                        </span>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          </div>


          <div className={cn("relative overflow-hidden")} style={{ width: totalWidth }}>
            {/* Today marker */}
            {todayIdx >= 0 && (
              <TodayMarker todayIdx={todayIdx} cellWidth={config.cellWidth} />
            )}

            {displayedPages.map(page => {
              const bar = getBarGeometry(
                page, startProp.id, endProp?.id ?? null,
                startDate, config, zoomLevel,
              );

              const { colorSet, statusLabel, dateLabel } = computeBarMeta(
                page.properties, startProp.id, endProp?.id ?? null, statusProp, getPageTitle(page),
              );
              const title = getPageTitle(page);
              const { isDragging, displayLeft, displayWidth } = computeDragOverrides(
                page.id, dragState, bar,
              );

              // Adaptive verbosity
              const verbosity = computeBarVerbosity(displayWidth, config.cellWidth);

              const barHeight = config.rowHeight - BAR_V_PADDING * 2;

              return (
                <div // NOSONAR - timeline row pattern requires role="row"
                  key={page.id}
                  role="row"
                  tabIndex={0}
                  className={cn(`relative flex items-center border-b border-line-light transition-colors ${
                    hoverRow === page.id ? 'bg-hover-surface-soft' : ''
                  }`)}
                  style={{ height: config.rowHeight }}
                  onMouseEnter={() => setHoverRow(page.id)}
                  onMouseLeave={() => setHoverRow(null)}
                >
                  {/* Background grid cells */}
                  <div className={cn("absolute inset-0 flex pointer-events-none")}>
                    {days.map((day, i) => (
                      <div // NOSONAR - timeline grid cell pattern
                        key={day.toISOString()}
                        role="gridcell"
                        tabIndex={0}
                        className={cn(`shrink-0 border-r border-line-light h-full pointer-events-auto
                                    cursor-cell ${
                          getGridCellBg(todayIdx === i, day.getDay() === 0 || day.getDay() === 6)
                        }`)}
                        style={{ width: config.cellWidth }}
                        onClick={() => handleGridCellClick(i)}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleGridCellClick(i); } }}
                      />
                    ))}
                  </div>

                  {(bar?.visible || isDragging) && (
                    <div
                      className={cn(`group/bar absolute z-10 flex items-center
                                  ${colorSet.bg} ${colorSet.text}
                                  ${bar?.isPoint && !isDragging ? 'rounded-full' : 'rounded-md'}
                                  ${isDragging ? 'opacity-80 ring-2 ring-accent-border' : ''}
                                  shadow-sm transition-shadow`)}
                      style={{
                        left: displayLeft,
                        width: Math.max(displayWidth, barHeight),
                        height: barHeight,
                        top: BAR_V_PADDING,
                      }}
                    >
                      {/* Tooltip (always shows on hover) */}
                      <BarTooltip
                        title={title || 'Untitled'}
                        statusLabel={statusLabel || 'No status'}
                        dateLabel={dateLabel}
                        colorSet={colorSet}
                      />

                      {/* Left resize handle — always visible */}
                      <div
                        className={cn(`absolute left-0 top-0 bottom-0 cursor-col-resize z-20
                                   hover:bg-white/30 rounded-l-md transition-colors`)}
                        style={{ width: RESIZE_HANDLE_WIDTH }}
                        onPointerDown={e =>
                          bar && handlePointerDown(e, page.id, 'resize-left', bar)
                        }
                      />

                      {/* Bar body — point bars drag to resize, range bars drag to move */}
                      <button
                        type="button"
                        className={cn(`flex-1 flex items-center justify-center overflow-hidden
                                    h-full ${bar?.isPoint && !isDragging
                                      ? 'cursor-ew-resize'
                                      : 'cursor-grab active:cursor-grabbing'}`)}
                        style={{
                          marginLeft: RESIZE_HANDLE_WIDTH,
                          marginRight: RESIZE_HANDLE_WIDTH,
                        }}
                        onPointerDown={e => {
                          if (bar) {
                            // Point bars: body drag extends into a date range
                            const kind: DragKind = bar.isPoint ? 'resize-right' : 'move';
                            handlePointerDown(e, page.id, kind, bar);
                          }
                        }}
                        onClick={e => {
                          if (dragState?.hasMoved) return;
                          e.stopPropagation();
                          // Open date picker on bar click
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                          openDatePicker(page.id, rect);
                        }}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const rect = e.currentTarget.getBoundingClientRect(); openDatePicker(page.id, rect); } }}
                      >
                        <BarContent
                          verbosity={verbosity}
                          statusLabel={statusLabel}
                          dateLabel={dateLabel}
                          icon={page.icon}
                        />
                      </button>

                      {/* Right resize handle */}
                      <div
                        className={cn(`absolute right-0 top-0 bottom-0 cursor-col-resize z-20
                                   hover:bg-white/30 rounded-r-md transition-colors`)}
                        style={{ width: RESIZE_HANDLE_WIDTH }}
                        onPointerDown={e =>
                          bar && handlePointerDown(e, page.id, 'resize-right', bar)
                        }
                      />
                    </div>
                  )}

                  {/* No-date indicator */}
                  {!bar && !isDragging && (
                    <div
                      className={cn("absolute left-2 text-[10px] text-ink-disabled italic z-10 pointer-events-none")}
                      style={{ top: (config.rowHeight - 14) / 2 }}
                    >
                      No date
                    </div>
                  )}
                </div>
              );
            })}

            {/* "New" row */}
            <button
              type="button"
              className={cn(`flex items-center border-b border-line-light text-ink-muted
                         hover:bg-hover-surface-soft cursor-pointer transition-colors text-left`)}
              style={{ height: config.rowHeight }}
              onClick={() => {
                addPage(database.id, { [startProp.id]: today.toISOString() });
              }}
            >
              <div className={cn("flex items-center gap-1 px-3 text-xs")}>
                <Plus className={cn("w-3.5 h-3.5")} />
                <span>New</span>
              </div>
            </button>
          </div>
        </div>
      </div>


      {datePicker && dpPage && (
        <TimelineDatePicker
          anchorRect={datePicker.anchorRect}
          startDate={dpStartDate}
          endDate={dpEndDate}
          hasEndDate={dpHasEnd}
          onChangeStart={d => {
            updatePageProperty(datePicker.pageId, startProp.id, d.toISOString());
          }}
          onChangeEnd={d => {
            if (d) {
              const ep = ensureEndProp();
              if (ep) updatePageProperty(datePicker.pageId, ep.id, d.toISOString());
            } else {
              const ep = findEndProp();
              if (ep) updatePageProperty(datePicker.pageId, ep.id, null);
            }
          }}
          onToggleEndDate={enabled => {
            if (enabled && dpStartDate) {
              const ep = ensureEndProp();
              if (ep) {
                updatePageProperty(
                  datePicker.pageId,
                  ep.id,
                  addDays(dpStartDate, 3).toISOString(),
                );
              }
            } else {
              const ep = findEndProp();
              if (ep) updatePageProperty(datePicker.pageId, ep.id, null);
            }
          }}
          onClear={() => {
            updatePageProperty(datePicker.pageId, startProp.id, null);
            const ep = findEndProp();
            if (ep) updatePageProperty(datePicker.pageId, ep.id, null);
          }}
          onClose={() => setDatePicker(null)}
        />
      )}
    </div>
  );
}
