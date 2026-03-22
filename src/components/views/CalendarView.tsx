import React, { useState } from 'react';
import { useDatabaseStore } from '../../store/useDatabaseStore';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, endOfWeek, addMonths, subMonths, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

export function CalendarView() {
  const { activeViewId, views, databases, getPagesForView, updatePageProperty, openPage, addPage, getPageTitle } = useDatabaseStore();
  const view = activeViewId ? views[activeViewId] : null;
  const database = view ? databases[view.databaseId] : null;
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [, setDragPageId] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);

  if (!view || !database) return null;

  const pages = getPagesForView(view.id);
  const settings = view.settings || {};
  const showWeekends = settings.showWeekends !== false;
  const wrapTitles = settings.wrapPageTitles !== false;

  // Find date property
  const dateProperty = Object.values(database.properties).find(p => p.type === 'date');
  if (!dateProperty) {
    return <div className="flex-1 flex items-center justify-center text-gray-500">Calendar view requires a date property.</div>;
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
    <div className="flex-1 overflow-auto p-4 bg-white flex flex-col h-full">
      {/* Navigation header */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900">{format(currentMonth, 'MMMM yyyy')}</h2>
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-1 hover:bg-gray-100 rounded text-gray-500 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setCurrentMonth(new Date())}
              className="px-2 py-1 hover:bg-gray-100 rounded text-xs font-medium text-gray-600 transition-colors">
              Today
            </button>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-1 hover:bg-gray-100 rounded text-gray-500 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 border border-gray-200 rounded-lg overflow-hidden flex flex-col">
        {/* Day headers */}
        <div className={`grid bg-gray-50 border-b border-gray-200 shrink-0`}
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {weekDays.map(day => (
            <div key={day} className="py-2 text-center text-xs font-medium text-gray-500 border-r border-gray-200 last:border-r-0">
              {day}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="flex-1 grid auto-rows-fr" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {days.map((day, i) => {
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
                className={`min-h-[90px] p-1 border-b border-r border-gray-200 transition-colors ${
                  !isCurrentMonth ? 'bg-gray-50/60' : 'bg-white'
                } ${isDragTarget ? 'bg-blue-50 ring-1 ring-inset ring-blue-300' : ''}`}
                onDrop={e => handleDrop(e, day)}
                onDragOver={e => handleDragOver(e, dayKey)}
                onDragLeave={() => setDragOverDay(null)}>

                <div className="flex items-center justify-between px-1 mb-1">
                  <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday(day) ? 'bg-blue-500 text-white' : isCurrentMonth ? 'text-gray-700' : 'text-gray-400'
                  }`}>
                    {format(day, 'd')}
                  </span>
                  <button onClick={() => addPage(database.id, { [dateProperty.id]: day.toISOString() })}
                    className="p-0.5 text-gray-300 hover:text-gray-500 hover:bg-gray-100 rounded opacity-0 hover:opacity-100 transition-all">
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
                          statusOpt ? statusOpt.color : 'bg-blue-50 text-blue-700'
                        }`}>
                        <span className={wrapTitles ? 'whitespace-pre-wrap break-words' : 'truncate block'}>
                          {page.icon && <span className="mr-0.5">{page.icon}</span>}
                          {title || 'Untitled'}
                        </span>
                      </div>
                    );
                  })}
                  {dayPages.length > 3 && (
                    <span className="text-xs text-gray-400 px-1">+{dayPages.length - 3} more</span>
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
