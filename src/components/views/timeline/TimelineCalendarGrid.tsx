/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   TimelineCalendarGrid.tsx                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 23:14:06 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 23:14:06 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { format, isSameMonth, isToday as isTodayFn, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../../utils/cn';


interface TimelineCalendarGridProps {
  currentMonth: Date;
  onMonthChange: (m: Date) => void;
  calDays: Date[];
  onDayClick: (day: Date) => void;
  inRange: (day: Date) => boolean;
  isStart: (day: Date) => boolean;
  isEnd: (day: Date) => boolean;
}

export function TimelineCalendarGrid({
  currentMonth, onMonthChange, calDays, onDayClick, inRange, isStart, isEnd,
}: Readonly<TimelineCalendarGridProps>) {
  return (
    <div className={cn("px-2 pb-1 text-center")}>
      {/* Caption: month label + Today + nav */}
      <div className={cn("flex items-center justify-between mb-1")}>
        <h2 className={cn("text-sm font-semibold text-ink")} aria-live="polite" aria-atomic>
          {format(currentMonth, 'MMM yyyy')}
        </h2>
        <div className={cn("flex items-center gap-2")}>
          <button
            type="button"
            onClick={() => onMonthChange(new Date())}
            className={cn(`flex items-center justify-center rounded-[3px] h-5 px-2
                       text-[12px] font-medium text-ink-secondary
                       hover:bg-hover-surface2 transition-colors`)}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => onMonthChange(subMonths(currentMonth, 1))}
            className={cn(`flex items-center justify-center rounded-[3px] w-5 h-5
                       hover:bg-hover-surface2 transition-colors`)}
          >
            <ChevronLeft className={cn("w-[11px] h-[17px] text-ink-muted")} />
          </button>
          <button
            type="button"
            onClick={() => onMonthChange(addMonths(currentMonth, 1))}
            className={cn(`flex items-center justify-center rounded-[3px] w-5 h-5
                       hover:bg-hover-surface2 transition-colors`)}
          >
            <ChevronRight className={cn("w-[11px] h-[17px] text-ink-muted")} />
          </button>
        </div>
      </div>

      {/* Weekday headers (Mo–Su) */}
      <table className={cn("w-full border-collapse")}>
        <thead>
          <tr>
            {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
              <th
                key={d}
                scope="col"
                className={cn("h-6 text-center text-[10px] font-medium text-ink-muted")}
              >
                <span aria-hidden="true">{d}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 6 }, (_, week) => (
            <tr key={week}>
              {calDays.slice(week * 7, week * 7 + 7).map(day => {
                const inMonth = isSameMonth(day, currentMonth);
                const today = isTodayFn(day);
                const start = isStart(day);
                const end = isEnd(day);
                const range = inRange(day);

                /* Cell classes matching Notion's styles */
                let btnCls = 'text-ink-body hover:bg-hover-surface2';
                if (!inMonth) btnCls = 'text-ink-muted/50 hover:bg-hover-surface-soft';
                if (range)
                  btnCls = 'bg-accent-soft/40 text-accent-text hover:bg-accent-soft';
                if (start || end)
                  btnCls = 'bg-blue-500 text-white hover:bg-blue-600';

                return (
                  <td key={day.toISOString()} className={cn("p-0 relative")}>
                    <button
                      name="day"
                      type="button"
                      aria-label={format(day, 'do MMMM (EEEE)')}
                      aria-pressed={start || end || undefined}
                      tabIndex={start ? 0 : -1}
                      onClick={() => onDayClick(day)}
                      className={cn(`w-full h-8 flex items-center justify-center text-xs
                                  rounded-md transition-colors cursor-pointer
                                  ${btnCls}
                                  ${today && !start && !end ? 'font-bold' : ''}`)}
                      style={
                        today && start
                          ? { backgroundColor: 'var(--accent, #2383e2)' }
                          : undefined
                      }
                    >
                      {format(day, 'd')}
                    </button>
                    {/* range overflow connector (between start/end) */}
                    {range && <div className={cn("absolute inset-0 bg-accent-soft/20 pointer-events-none")} />}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
