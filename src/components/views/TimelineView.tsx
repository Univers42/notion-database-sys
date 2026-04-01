/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   TimelineView.tsx                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:38:51 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 19:40:54 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState, useRef, useCallback } from 'react';
import { useDatabaseStore } from '../../store/useDatabaseStore';
import { useActiveViewId } from '../../hooks/useDatabaseScope';
import { format, addDays, startOfWeek, eachDayOfInterval, differenceInDays, startOfMonth, endOfMonth, eachWeekOfInterval, addWeeks, subWeeks } from 'date-fns';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { getTimelineConfig, getBarStyle } from './TimelineViewHelpers';
import type { TimelineConfig } from './TimelineViewHelpers';

export function TimelineView() {
  const activeViewId = useActiveViewId();
  const { views, databases, getPagesForView, updatePageProperty, openPage, getPageTitle } = useDatabaseStore();
  const view = activeViewId ? views[activeViewId] : null;
  const database = view ? databases[view.databaseId] : null;
  const [offset, setOffset] = useState(0); // scroll offset in units

  if (!view || !database) return null;

  const pages = getPagesForView(view.id);
  const settings = view.settings || {};
  const showTable = settings.showTable !== false;
  const zoomLevel = settings.zoomLevel || 'week';
  const loadLimit = settings.loadLimit || 50;
  const displayedPages = pages.slice(0, loadLimit);

  const dateProperty = Object.values(database.properties).find(p => p.type === 'date');
  if (!dateProperty) {
    return <div className="flex-1 flex items-center justify-center text-ink-secondary">Timeline view requires a date property.</div>;
  }

  // Calculate timeline range based on zoom level
  const today = new Date();

  const config = getTimelineConfig(zoomLevel);
  const startDate = addDays(startOfWeek(today, { weekStartsOn: 1 }), offset);
  const endDate = addDays(startDate, config.daysToShow);
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  // Today marker position
  const todayIdx = days.findIndex(d =>
    d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
  );

  const handleZoom = (level: 'day' | 'week' | 'month') => {
    useDatabaseStore.getState().updateViewSettings(view.id, { zoomLevel: level });
  };

  // Drag to move task on timeline
  const handleBarDrag = (e: React.DragEvent, pageId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', pageId);
  };

  const handleDrop = (e: React.DragEvent, dayIdx: number) => {
    e.preventDefault();
    const pageId = e.dataTransfer.getData('text/plain');
    if (pageId) {
      updatePageProperty(pageId, dateProperty.id, days[dayIdx].toISOString());
    }
  };

  return (
    <div className="flex-1 overflow-hidden bg-surface-primary flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-line bg-surface-secondary shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => setOffset(o => o - config.daysToShow)} className="p-1 hover:bg-hover-surface3 rounded text-ink-secondary"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={() => setOffset(0)} className="px-2 py-1 hover:bg-hover-surface3 rounded text-xs font-medium text-ink-body-light">Today</button>
          <button onClick={() => setOffset(o => o + config.daysToShow)} className="p-1 hover:bg-hover-surface3 rounded text-ink-secondary"><ChevronRight className="w-4 h-4" /></button>
        </div>
        <div className="flex items-center gap-1 bg-surface-muted rounded p-0.5">
          {(['day', 'week', 'month'] as const).map(level => (
            <button key={level} onClick={() => handleZoom(level)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                zoomLevel === level ? 'bg-surface-primary shadow-sm text-ink' : 'text-ink-body-light hover:text-hover-text-bolder'
              }`}>
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel: Page list */}
        {showTable && (
          <div className="w-56 border-r border-line shrink-0 flex flex-col bg-surface-secondary">
            <div className="h-16 border-b border-line flex items-end px-3 pb-2 font-medium text-xs text-ink-secondary uppercase tracking-wider">
              Pages
            </div>
            <div className="flex-1 overflow-y-auto">
              {displayedPages.map(page => {
                const title = getPageTitle(page);
                return (
                  <div key={page.id} onClick={() => openPage(page.id)}
                    className="h-10 border-b border-line-light flex items-center px-3 text-sm text-ink truncate hover:bg-hover-surface2 cursor-pointer">
                    {page.icon && <span className="mr-1.5">{page.icon}</span>}
                    {title || <span className="text-ink-muted">Untitled</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Right panel: Timeline */}
        <div className="flex-1 overflow-x-auto flex flex-col">
          {/* Day headers */}
          <div className="h-16 border-b border-line flex shrink-0">
            {days.map((day, i) => {
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;
              const isTodayCol = todayIdx === i;
              return (
                <div key={day.toISOString()}
                  className={`shrink-0 border-r border-line flex flex-col items-center justify-end pb-2 text-xs ${
                    isTodayCol ? 'bg-accent-soft' : isWeekend ? 'bg-surface-secondary-soft2' : 'bg-surface-primary'
                  }`}
                  style={{ width: config.cellWidth }}>
                  <span className="text-ink-muted text-[10px]">{format(day, 'EEE')}</span>
                  <span className={`font-medium ${isTodayCol ? 'text-accent-text-light bg-accent-muted w-6 h-6 rounded-full flex items-center justify-center' : 'text-ink-body'}`}>
                    {format(day, 'd')}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Timeline rows */}
          <div className="flex-1 overflow-y-auto relative">
            {/* Today marker */}
            {todayIdx >= 0 && todayIdx < days.length && (
              <div className="absolute top-0 bottom-0 w-0.5 bg-danger-vivid z-20 pointer-events-none"
                style={{ left: todayIdx * config.cellWidth + config.cellWidth / 2 }} />
            )}

            {displayedPages.map(page => {
              const barStyle = getBarStyle(page, dateProperty.id, startDate, config, zoomLevel);
              const title = getPageTitle(page);

              // Get status color
              const statusProp = Object.values(database.properties).find(p => p.type === 'select' && p.name.toLowerCase().includes('status'));
              const statusVal = statusProp ? page.properties[statusProp.id] : null;
              const statusOpt = statusProp?.options?.find(o => o.id === statusVal);
              const barColor = statusOpt
                ? statusOpt.color.includes('green') ? 'bg-success' : statusOpt.color.includes('blue') ? 'bg-accent' : statusOpt.color.includes('yellow') ? 'bg-warning' : statusOpt.color.includes('red') ? 'bg-danger' : 'bg-purple'
                : 'bg-accent';

              return (
                <div key={page.id} className="h-10 border-b border-line-light flex items-center relative group hover:bg-hover-surface-soft">
                  {/* Grid lines */}
                  <div className="absolute left-0 right-0 h-full flex pointer-events-none">
                    {days.map((day, i) => (
                      <div key={day.toISOString()}
                        className={`shrink-0 border-r border-line-light h-full ${
                          todayIdx === i ? 'bg-accent-soft5' : (day.getDay() === 0 || day.getDay() === 6) ? 'bg-surface-secondary-soft4' : ''
                        }`}
                        style={{ width: config.cellWidth }}
                        onDragOver={e => e.preventDefault()}
                        onDrop={e => handleDrop(e, i)} />
                    ))}
                  </div>

                  {/* Bar */}
                  {barStyle && barStyle.visible && (
                    <div draggable onDragStart={e => handleBarDrag(e, page.id)}
                      onClick={() => openPage(page.id)}
                      className={`absolute h-6 ${barColor} rounded-full flex items-center px-3 text-xs text-ink-inverse font-medium shadow-sm z-10 cursor-pointer hover:brightness-110 transition-all truncate`}
                      style={{ left: barStyle.left, width: barStyle.width }}>
                      {page.icon && <span className="mr-1">{page.icon}</span>}
                      {title || 'Untitled'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
