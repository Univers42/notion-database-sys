/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   CalendarAgendaView.tsx                              :+:      :+:    :+:  */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── CalendarAgendaView — Google-Schedule-style upcoming list ───────────────
// Chronological day sections (empty days skipped); every covered day lists a
// multi-day event, so any day answers "what's on?" at a glance.

import React, { useMemo } from 'react';
import { format, isToday } from 'date-fns';
import { Plus } from 'lucide-react';
import type { ChipData } from './CalendarWeekRow';
import { buildAgenda } from './model/calendarAgenda';
import { fromDayKey, toDayKey } from './model/calendarGrid';
import type { CalEvent } from './model/calendarTypes';
import { AGENDA_DAYS } from './calendarConfig';
import { cn } from '../../../utils/cn';

export function CalendarAgendaView({
  events, chipData, anchor, onOpen, onQuickCreate,
}: Readonly<{
  events: CalEvent[];
  chipData: Map<string, ChipData>;
  anchor: Date;
  onOpen: (pageId: string) => void;
  onQuickCreate: (date: Date) => void;
}>) {
  const sections = useMemo(
    () => buildAgenda(events, toDayKey(anchor), AGENDA_DAYS),
    [events, anchor],
  );

  return (
    <div data-cal-agenda className={cn("flex-1 min-h-0 overflow-y-auto border border-line rounded-lg")}>
      {sections.length === 0 && (
        <div className={cn("h-40 flex flex-col items-center justify-center gap-2 text-ink-muted")}>
          <p className={cn("text-sm")}>Nothing scheduled in the next {AGENDA_DAYS} days.</p>
          <button type="button" onClick={() => onQuickCreate(anchor)}
            className={cn("flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-accent-soft text-accent-text hover:bg-accent-soft3 transition-colors")}>
            <Plus className={cn("w-3.5 h-3.5")} /> New event
          </button>
        </div>
      )}
      {sections.map(section => {
        const date = fromDayKey(section.key);
        const today = isToday(date);
        return (
          <div key={section.key} className={cn("flex gap-3 px-4 py-2 border-b border-line-faint last:border-b-0")}>
            <div className={cn("w-16 shrink-0 text-right")}>
              <div className={cn(`text-lg font-semibold leading-tight ${today ? 'text-accent-text' : 'text-ink'}`)}>
                {format(date, 'd')}
              </div>
              <div className={cn(`text-[11px] uppercase ${today ? 'text-accent-text' : 'text-ink-muted'}`)}>
                {format(date, 'EEE MMM')}
              </div>
            </div>
            <div className={cn("flex-1 min-w-0 flex flex-col gap-1 py-0.5")}>
              {section.events.map(ev => {
                const chip = chipData.get(ev.pageId);
                const style: React.CSSProperties | undefined = chip?.color.tint
                  ? { background: chip.color.tint, boxShadow: `inset 2px 0 0 ${chip.color.accent}` }
                  : undefined;
                return (
                  <button key={ev.pageId} type="button" onClick={() => onOpen(ev.pageId)}
                    className={cn(`px-2 py-1 rounded text-xs text-left truncate
                      ${chip?.color.tint ? 'text-ink-body' : chip?.color.className || 'bg-accent-soft text-accent-text'}
                      hover:shadow-sm transition-shadow`)}
                    style={style}>
                    {chip?.icon && <span className={cn("mr-1")}>{chip.icon}</span>}
                    {chip?.timeLabel && <span className={cn("mr-1 opacity-70 tabular-nums")}>{chip.timeLabel}</span>}
                    {chip?.title || 'Untitled'}
                    {ev.isRanged && ev.startKey !== ev.endKey && (
                      <span className={cn("ml-1 opacity-60")}>
                        ({format(fromDayKey(ev.startKey), 'MMM d')} → {format(fromDayKey(ev.endKey), 'MMM d')})
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
