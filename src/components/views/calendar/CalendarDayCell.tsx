/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   CalendarDayCell.tsx                                 :+:      :+:    :+:  */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── CalendarDayCell — one day of the month grid ────────────────────────────
// Background layer only: day number + today ring, hover quick-create, the
// "+N more" overflow button, and the empty-area pointerdown that starts a
// drag-create. Event bars render ABOVE in the week row's overlay.

import React from 'react';
import { format } from 'date-fns';
import { Plus } from 'lucide-react';
import { DAY_HEADER_HEIGHT, LANE_HEIGHT } from './calendarConfig';
import type { DayInfo } from './model/calendarTypes';
import { cn } from '../../../utils/cn';
import { useCanCreateRecords } from '../../../hooks/useHostAdapters';

function dayNumberStyle(isToday: boolean, inMonth: boolean): string {
  if (isToday) return 'bg-accent text-ink-inverse';
  if (inMonth) return 'text-ink-body';
  return 'text-ink-muted';
}

export function CalendarDayCell({
  day, isToday, laneCount, overflowCount,
  onQuickCreate, onExpandDay, onEmptyPointerDown,
}: Readonly<{
  day: DayInfo;
  isToday: boolean;
  /** Visible lanes reserved above the overflow line in this week row. */
  laneCount: number;
  overflowCount: number;
  onQuickCreate: () => void;
  onExpandDay: (anchorRect: DOMRect) => void;
  onEmptyPointerDown?: (e: React.PointerEvent) => void;
}>) {
  const canCreate = useCanCreateRecords();
  return (
    <div data-cal-day={day.key}
      role="gridcell"
      onPointerDown={e => {
        // Only truly empty space starts a create-drag — chips/buttons sit in
        // the overlay above and stopPropagation/handle their own pointerdown.
        if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.calDayBody != null) {
          onEmptyPointerDown?.(e);
        }
      }}
      className={cn(`group/day relative min-w-0 border-b border-r border-line transition-colors
        ${day.inMonth ? 'bg-surface-primary' : 'bg-surface-secondary-soft3'}
        ${day.isWeekend && day.inMonth ? 'bg-surface-secondary-soft' : ''}`)}>
      <div className={cn("flex items-center justify-between px-1 pt-0.5")}
        style={{ height: DAY_HEADER_HEIGHT }}>
        {canCreate && <button type="button" onClick={onQuickCreate}
          onPointerDown={e => e.stopPropagation()}
          aria-label={`Add page on ${format(day.date, 'MMMM d, yyyy')}`}
          className={cn(`p-0.5 text-ink-disabled hover:text-hover-text-muted hover:bg-hover-surface2
            rounded opacity-0 group-hover/day:opacity-100 focus-visible:opacity-100 transition-opacity`)}>
          <Plus className={cn("w-3 h-3")} />
        </button>}
        {/* Notion parity: the number sits top-right; the 1st names its month. */}
        <span className={cn(`text-xs min-w-6 h-6 px-1.5 flex items-center justify-center rounded-full tabular-nums
          ${dayNumberStyle(isToday, day.inMonth)}`)}>
          {format(day.date, day.date.getDate() === 1 ? 'MMM d' : 'd')}
        </span>
      </div>
      {/* Lane space: bars paint here from the overlay; this keeps cell height. */}
      <div data-cal-day-body style={{ height: laneCount * LANE_HEIGHT }} />
      {overflowCount > 0 && (
        <button type="button"
          onPointerDown={e => e.stopPropagation()}
          onClick={e => onExpandDay((e.currentTarget.closest('[data-cal-day]') as HTMLElement).getBoundingClientRect())}
          className={cn(`mx-1 px-1 text-[11px] text-ink-muted hover:text-ink hover:bg-hover-surface2
            rounded text-left w-[calc(100%-8px)]`)}>
          +{overflowCount} more
        </button>
      )}
    </div>
  );
}
