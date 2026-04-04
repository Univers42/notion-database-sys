/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   TimelineDayHeaders.tsx                             :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 23:30:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 23:30:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { format, isToday as isTodayFn } from 'date-fns';
import {
  getDayHeaderBg, type TimelineConfig, type MonthGroup, type ZoomLevel,
} from './TimelineViewHelpers';
import { cn } from '../../../utils/cn';

interface TimelineDayHeadersProps {
  readonly monthGroups: MonthGroup[];
  readonly days: Date[];
  readonly config: TimelineConfig;
  readonly zoomLevel: ZoomLevel;
}

export function TimelineDayHeaders({
  monthGroups, days, config, zoomLevel,
}: TimelineDayHeadersProps) {
  return (
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
  );
}
