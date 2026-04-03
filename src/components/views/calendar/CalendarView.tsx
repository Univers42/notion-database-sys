/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   CalendarView.tsx                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:38:04 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/03 00:11:32 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState } from 'react';
import { useDatabaseStore } from '../../../store/dbms/hardcoded/useDatabaseStore';
import { useActiveViewId } from '../../../hooks/useDatabaseScope';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, endOfWeek, addMonths, subMonths, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

function getDayNumberStyle(dayIsToday: boolean, isCurrentMonth: boolean): string {
  if (dayIsToday) return 'bg-accent text-ink-inverse';
  if (isCurrentMonth) return 'text-ink-body';
  return 'text-ink-muted';
}

export function CalendarView() {
  const activeViewId = useActiveViewId();
  const { views, databases, getPagesForView, updatePageProperty, openPage, addPage, getPageTitle } = useDatabaseStore();
  const view = activeViewId ? views[activeViewId] : null;
  const database = view ? databases[view.databaseId] : null;
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [_dragPageId, setDragPageId] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);

  if (!view || !database) return null;

  const pages = getPagesForView(view.id);
  const settings = view.settings || {};
  const showWeekends = settings.showWeekends !== false;
  const wrapTitles = settings.wrapPageTitles !== false;

  // Find date property
  const dateProperty = Object.values(database.properties).find(p => p.type === 'date');
  if (!dateProperty) {
    return <div className="flex-1 flex items-center justify-center text-ink-secondary">Calendar view requires a date property.</div>;
  }

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  let days = eachDayOfInterval({ start: calStart, end: calEnd });

  if (!showWeekends) {
    days = days.filter(d => d.getDay() !== 0 && d.getDay() !== 6);
  }

  const weekDays = showWeekends ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const cols = showWeekends ? 7 : 5;

  // Drag to reschedule
  const handleDragStart = (e: React.DragEvent, pageId: string) => {
    setDragPageId(pageId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', pageId);
  };

  const handleDrop = (e: React.DragEvent, day: Date) => {
    e.preventDefault();
    setDragOverDay(null);
    const pageId = e.dataTransfer.getData('text/plain');
    if (pageId && dateProperty) {
      updatePageProperty(pageId, dateProperty.id, day.toISOString());
    }
    setDragPageId(null);
  };

  const handleDragOver = (e: React.DragEvent, dayKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDay(dayKey);
  };

  return (
    <div className="flex-1 overflow-auto p-4 bg-surface-primary flex flex-col h-full">
      {/* Navigation header */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-ink">{format(currentMonth, 'MMMM yyyy')}</h2>
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-1 hover:bg-hover-surface2 rounded text-ink-secondary transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setCurrentMonth(new Date())}
              className="px-2 py-1 hover:bg-hover-surface2 rounded text-xs font-medium text-ink-body-light transition-colors">
              Today
            </button>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-1 hover:bg-hover-surface2 rounded text-ink-secondary transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 border border-line rounded-lg overflow-hidden flex flex-col">
        {/* Day headers */}
        <div className={`grid bg-surface-secondary border-b border-line shrink-0`}
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {weekDays.map(day => (
            <div key={day} className="py-2 text-center text-xs font-medium text-ink-secondary border-r border-line last:border-r-0">
              {day}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="flex-1 grid auto-rows-fr" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {days.map((day, _i) => {
            const dayKey = day.toISOString();
            const dayPages = pages.filter(page => {
              const val = page.properties[dateProperty.id];
              if (!val) return false;
              return isSameDay(new Date(val), day);
            });
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isDragTarget = dragOverDay === dayKey;

            return (
              <div key={dayKey}
                className={`min-h-[90px] p-1 border-b border-r border-line transition-colors ${
                  !isCurrentMonth ? 'bg-surface-secondary-soft3' : 'bg-surface-primary'
                } ${isDragTarget ? 'bg-accent-soft ring-1 ring-inset ring-ring-accent-muted' : ''}`}
                onDrop={e => handleDrop(e, day)}
                onDragOver={e => handleDragOver(e, dayKey)}
                onDragLeave={() => setDragOverDay(null)}>

                <div className="flex items-center justify-between px-1 mb-1">
                  <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                    getDayNumberStyle(isToday(day), isCurrentMonth)
                  }`}>
                    {format(day, 'd')}
                  </span>
                  <button onClick={() => addPage(database.id, { [dateProperty.id]: day.toISOString() })}
                    className="p-0.5 text-ink-disabled hover:text-hover-text-muted hover:bg-hover-surface2 rounded opacity-0 hover:opacity-100 transition-all">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex flex-col gap-0.5">
                  {dayPages.slice(0, 3).map(page => {
                    const title = getPageTitle(page);
                    // Find status for color coding
                    const statusProp = Object.values(database.properties).find(p => p.type === 'select' && p.id !== dateProperty.id);
                    const statusVal = statusProp ? page.properties[statusProp.id] : null;
                    const statusOpt = statusProp?.options?.find(o => o.id === statusVal);

                    return (
                      <div key={page.id} draggable
                        onDragStart={e => handleDragStart(e, page.id)}
                        onClick={() => openPage(page.id)}
                        className={`px-1.5 py-0.5 rounded text-xs cursor-grab active:cursor-grabbing hover:shadow-sm transition-all ${
                          statusOpt ? statusOpt.color : 'bg-accent-soft text-accent-text'
                        }`}>
                        <span className={wrapTitles ? 'whitespace-pre-wrap break-words' : 'truncate block'}>
                          {page.icon && <span className="mr-0.5">{page.icon}</span>}
                          {title || 'Untitled'}
                        </span>
                      </div>
                    );
                  })}
                  {dayPages.length > 3 && (
                    <span className="text-xs text-ink-muted px-1">+{dayPages.length - 3} more</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
