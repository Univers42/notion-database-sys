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
  getDayHeaderBg, getDayRuleClass, type TimelineConfig, type MonthGroup, type ZoomLevel,
} from './TimelineViewHelpers';
import { cn } from '../../../utils/cn';

/** Today's number, Notion's: a red pill that matches the today line. */
const TODAY_PILL = 'min-w-5 h-5 px-1 rounded-full bg-danger-vivid text-ink-inverse font-medium flex items-center justify-center';

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
    <div className={cn("shrink-0 sticky top-0 z-30 bg-surface-primary border-b border-line")}>
      {/* Month groups */}
      <div className={cn("flex h-6")}>
        {monthGroups.map((g, idx) => (
          <div
            key={`${g.year}-${g.month}-${idx}`}
            className={cn(`shrink-0 text-xs font-medium text-ink whitespace-nowrap overflow-hidden
                       flex items-center px-2`)}
            style={{ width: g.colSpan * config.cellWidth }}
          >
            {g.colSpan * config.cellWidth < 72 ? g.label.split(' ')[0] : g.label}
          </div>
        ))}
      </div>

      {/* Day columns */}
      <div className={cn("flex h-[26px]")}>
        {days.map(day => {
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
          const isTodayCol = isTodayFn(day);
          return (
            <div
              key={day.toISOString()}
              className={cn(`shrink-0 flex items-center justify-center text-[11px] tabular-nums
                          ${getDayRuleClass(day, zoomLevel)} ${getDayHeaderBg(isWeekend)}`)}
              style={{ width: config.cellWidth }}
            >
              {(() => {
                if (zoomLevel === 'day') {
                  return (
                    <div className={cn("flex flex-col items-center leading-tight")}>
                      <span className={cn("text-ink-muted")}>{format(day, 'EEE')}</span>
                      <span className={cn(isTodayCol ? TODAY_PILL : 'text-ink-body')}>{format(day, 'd')}</span>
                    </div>
                  );
                }
                if (zoomLevel === 'month') {
                  // 18px columns: number the week starts (and today), not every day.
                  if (isTodayCol) return <span className={cn(TODAY_PILL)}>{format(day, 'd')}</span>;
                  return (
                    <span className={cn("text-ink-muted")}>
                      {day.getDay() === 1 ? format(day, 'd') : ''}
                    </span>
                  );
                }
                return (
                  <span className={cn(isTodayCol ? TODAY_PILL : 'text-ink-muted')}>{format(day, 'd')}</span>
                );
              })()}
            </div>
          );
        })}
      </div>
    </div>
  );
}
