/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   CalendarHeader.tsx                                  :+:      :+:    :+:  */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── CalendarHeader — title, navigation, and the mode segmented control ─────

import React from 'react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { CalendarMode } from './model/calendarTypes';
import { cn } from '../../../utils/cn';

const MODES: { value: CalendarMode; label: string }[] = [
  { value: 'month', label: 'Month' },
  { value: 'week', label: 'Week' },
  { value: 'day', label: 'Day' },
  { value: 'agenda', label: 'Agenda' },
];

function titleFor(mode: CalendarMode, anchor: Date, weekStartsOn: 0 | 1): string {
  if (mode === 'month') return format(anchor, 'MMMM yyyy');
  if (mode === 'week') {
    const first = startOfWeek(anchor, { weekStartsOn });
    const last = endOfWeek(anchor, { weekStartsOn });
    return first.getMonth() === last.getMonth()
      ? `${format(first, 'MMM d')} – ${format(last, 'd, yyyy')}`
      : `${format(first, 'MMM d')} – ${format(last, 'MMM d, yyyy')}`;
  }
  if (mode === 'day') return format(anchor, 'EEEE, MMMM d, yyyy');
  return `From ${format(anchor, 'MMM d, yyyy')}`;
}

export function CalendarHeader({
  mode, anchor, weekStartsOn, onNavigate, onToday, onModeChange,
}: Readonly<{
  mode: CalendarMode;
  anchor: Date;
  weekStartsOn: 0 | 1;
  onNavigate: (direction: -1 | 1) => void;
  onToday: () => void;
  onModeChange: (mode: CalendarMode) => void;
}>) {
  return (
    <div className={cn("flex items-center justify-between gap-2 mb-3 px-2 flex-wrap")}>
      <div className={cn("flex items-center gap-3 min-w-0")}>
        <h2 className={cn("text-lg font-semibold text-ink truncate")}>
          {titleFor(mode, anchor, weekStartsOn)}
        </h2>
        <div className={cn("flex items-center gap-1")}>
          <button type="button" onClick={() => onNavigate(-1)} aria-label="Previous"
            className={cn("p-1 hover:bg-hover-surface2 rounded text-ink-secondary transition-colors")}>
            <ChevronLeft className={cn("w-4 h-4")} />
          </button>
          <button type="button" onClick={onToday}
            className={cn("px-2 py-1 hover:bg-hover-surface2 rounded text-xs font-medium text-ink-body-light transition-colors")}>
            Today
          </button>
          <button type="button" onClick={() => onNavigate(1)} aria-label="Next"
            className={cn("p-1 hover:bg-hover-surface2 rounded text-ink-secondary transition-colors")}>
            <ChevronRight className={cn("w-4 h-4")} />
          </button>
        </div>
      </div>
      <div role="radiogroup" aria-label="Calendar mode"
        className={cn("flex items-center gap-0.5 p-0.5 rounded-lg bg-surface-secondary")}>
        {MODES.map(({ value, label }) => (
          <button key={value} type="button" role="radio" aria-checked={mode === value}
            onClick={() => onModeChange(value)}
            className={cn(`px-2 py-1 text-xs rounded-md transition-colors ${
              mode === value
                ? 'bg-surface-primary text-ink font-medium shadow-sm'
                : 'text-ink-secondary hover:text-ink'
            }`)}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
