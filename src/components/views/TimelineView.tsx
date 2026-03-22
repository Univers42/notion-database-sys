import React, { useState, useRef, useCallback } from 'react';
import { useDatabaseStore } from '../../store/useDatabaseStore';
import { format, addDays, startOfWeek, eachDayOfInterval, differenceInDays, startOfMonth, endOfMonth, eachWeekOfInterval, addWeeks, subWeeks } from 'date-fns';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';

export function TimelineView() {
  const { activeViewId, views, databases, getPagesForView, updatePageProperty, openPage, getPageTitle } = useDatabaseStore();
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
    return <div className="flex-1 flex items-center justify-center text-gray-500">Timeline view requires a date property.</div>;
  }

  // Calculate timeline range based on zoom level
  const today = new Date();
  const getTimelineConfig = () => {
    switch (zoomLevel) {
      case 'day':
        return { cellWidth: 60, daysToShow: 21, label: (d: Date) => format(d, 'd'), headerLabel: (d: Date) => format(d, 'MMM d') };
      case 'week':
        return { cellWidth: 100, daysToShow: 14, label: (d: Date) => format(d, 'EEE d'), headerLabel: (d: Date) => format(d, 'MMM d') };
      case 'month':
        return { cellWidth: 40, daysToShow: 90, label: (d: Date) => format(d, 'd'), headerLabel: (d: Date) => format(d, 'MMM yyyy') };
      default:
        return { cellWidth: 100, daysToShow: 14, label: (d: Date) => format(d, 'EEE d'), headerLabel: (d: Date) => format(d, 'MMM d') };
    }
  };

  const config = getTimelineConfig();
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

  // Calculate bar position for a page
  const getBarStyle = (page: any) => {
    const val = page.properties[dateProperty.id];
    if (!val) return null;
    const pageDate = new Date(val);
    const dayIdx = differenceInDays(pageDate, startDate);
    if (dayIdx < -2 || dayIdx > config.daysToShow + 2) return null;
    const barWidth = zoomLevel === 'day' ? 2 : zoomLevel === 'week' ? 3 : 5;
    return {
      left: Math.max(0, dayIdx) * config.cellWidth,
      width: barWidth * config.cellWidth,
      visible: dayIdx >= -barWidth && dayIdx <= config.daysToShow
    };
  };

  return (
    <div className="flex-1 overflow-hidden bg-white flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50 shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => setOffset(o => o - config.daysToShow)} className="p-1 hover:bg-gray-200 rounded text-gray-500"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={() => setOffset(0)} className="px-2 py-1 hover:bg-gray-200 rounded text-xs font-medium text-gray-600">Today</button>
          <button onClick={() => setOffset(o => o + config.daysToShow)} className="p-1 hover:bg-gray-200 rounded text-gray-500"><ChevronRight className="w-4 h-4" /></button>
        </div>
        <div className="flex items-center gap-1 bg-gray-200 rounded p-0.5">
          {(['day', 'week', 'month'] as const).map(level => (
            <button key={level} onClick={() => handleZoom(level)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                zoomLevel === level ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-800'
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
          <div className="w-56 border-r border-gray-200 shrink-0 flex flex-col bg-gray-50">
            <div className="h-16 border-b border-gray-200 flex items-end px-3 pb-2 font-medium text-xs text-gray-500 uppercase tracking-wider">
              Pages
            </div>
            <div className="flex-1 overflow-y-auto">
              {displayedPages.map(page => {
                const title = getPageTitle(page);
                return (
                  <div key={page.id} onClick={() => openPage(page.id)}
                    className="h-10 border-b border-gray-100 flex items-center px-3 text-sm text-gray-900 truncate hover:bg-gray-100 cursor-pointer">
                    {page.icon && <span className="mr-1.5">{page.icon}</span>}
                    {title || <span className="text-gray-400">Untitled</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Right panel: Timeline */}
        <div className="flex-1 overflow-x-auto flex flex-col">
          {/* Day headers */}
          <div className="h-16 border-b border-gray-200 flex shrink-0">
            {days.map((day, i) => {
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;
              const isTodayCol = todayIdx === i;
              return (
                <div key={day.toISOString()}
                  className={`shrink-0 border-r border-gray-200 flex flex-col items-center justify-end pb-2 text-xs ${
                    isTodayCol ? 'bg-blue-50' : isWeekend ? 'bg-gray-50/80' : 'bg-white'
                  }`}
                  style={{ width: config.cellWidth }}>
                  <span className="text-gray-400 text-[10px]">{format(day, 'EEE')}</span>
                  <span className={`font-medium ${isTodayCol ? 'text-blue-600 bg-blue-100 w-6 h-6 rounded-full flex items-center justify-center' : 'text-gray-700'}`}>
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
              <div className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-20 pointer-events-none"
                style={{ left: todayIdx * config.cellWidth + config.cellWidth / 2 }} />
            )}

            {displayedPages.map(page => {
              const barStyle = getBarStyle(page);
              const title = getPageTitle(page);

              // Get status color
              const statusProp = Object.values(database.properties).find(p => p.type === 'select' && p.name.toLowerCase().includes('status'));
              const statusVal = statusProp ? page.properties[statusProp.id] : null;
              const statusOpt = statusProp?.options?.find(o => o.id === statusVal);
              const barColor = statusOpt
                ? statusOpt.color.includes('green') ? 'bg-green-500' : statusOpt.color.includes('blue') ? 'bg-blue-500' : statusOpt.color.includes('yellow') ? 'bg-yellow-500' : statusOpt.color.includes('red') ? 'bg-red-500' : 'bg-purple-500'
                : 'bg-blue-500';

              return (
                <div key={page.id} className="h-10 border-b border-gray-100 flex items-center relative group hover:bg-gray-50/50">
                  {/* Grid lines */}
                  <div className="absolute left-0 right-0 h-full flex pointer-events-none">
                    {days.map((day, i) => (
                      <div key={day.toISOString()}
                        className={`shrink-0 border-r border-gray-100 h-full ${
                          todayIdx === i ? 'bg-blue-50/30' : (day.getDay() === 0 || day.getDay() === 6) ? 'bg-gray-50/40' : ''
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
                      className={`absolute h-6 ${barColor} rounded-full flex items-center px-3 text-xs text-white font-medium shadow-sm z-10 cursor-pointer hover:brightness-110 transition-all truncate`}
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
