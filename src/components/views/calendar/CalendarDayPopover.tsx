/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   CalendarDayPopover.tsx                              :+:      :+:    :+:  */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── CalendarDayPopover — the "+N more" day expansion ───────────────────────
// Notion-style: a card over the day cell with the big day number and EVERY
// event of that day (packing order). Click opens the page; the footer adds
// a record pre-dated to this day.

import React from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { Plus } from 'lucide-react';
import { PortalBackdrop } from '../../ui/PortalBackdrop';
import { Z } from '../../../utils/geometry';
import type { ChipData } from './CalendarWeekRow';
import type { CalEvent, DayInfo } from './model/calendarTypes';
import { cn } from '../../../utils/cn';

const PANEL_WIDTH = 260;

export function CalendarDayPopover({
  day, anchorRect, events, chipData, onOpen, onQuickCreate, onClose,
}: Readonly<{
  day: DayInfo;
  anchorRect: DOMRect;
  events: CalEvent[];
  chipData: Map<string, ChipData>;
  onOpen: (pageId: string) => void;
  onQuickCreate: () => void;
  onClose: () => void;
}>) {
  const left = Math.max(8, Math.min(
    anchorRect.left + anchorRect.width / 2 - PANEL_WIDTH / 2,
    window.innerWidth - PANEL_WIDTH - 8,
  ));
  const top = Math.max(8, Math.min(anchorRect.top - 8, window.innerHeight - 320));

  return createPortal(
    <>
      <PortalBackdrop onClose={onClose} />
      <dialog open data-cal-day-popover
        onKeyDown={e => { if (e.key === 'Escape') onClose(); }}
        className={cn("odb-pop-in fixed m-0 p-0 bg-surface-primary shadow-xl border border-line rounded-lg overflow-hidden")}
        style={{ left, top, width: PANEL_WIDTH, zIndex: Z.CELL_EDITOR }}>
        <div className={cn("px-3 pt-2 pb-1 text-center")}>
          <div className={cn("text-[11px] uppercase text-ink-muted")}>{format(day.date, 'EEE')}</div>
          <div className={cn("text-xl font-semibold text-ink")}>{format(day.date, 'd')}</div>
        </div>
        <div className={cn("max-h-64 overflow-y-auto px-2 pb-1 flex flex-col gap-1")}>
          {events.map(ev => {
            const chip = chipData.get(ev.pageId);
            const style: React.CSSProperties | undefined = chip?.color.tint
              ? { background: chip.color.tint, boxShadow: `inset 2px 0 0 ${chip.color.accent}` }
              : undefined;
            return (
              <button key={ev.pageId} type="button"
                onClick={() => { onOpen(ev.pageId); onClose(); }}
                className={cn(`px-2 py-1 rounded text-xs text-left truncate
                  ${chip?.color.tint ? 'text-ink-body' : chip?.color.className || 'bg-accent-soft text-accent-text'}
                  hover:shadow-sm transition-shadow`)}
                style={style}>
                {chip?.icon && <span className={cn("mr-1")}>{chip.icon}</span>}
                {chip?.timeLabel && <span className={cn("mr-1 opacity-70 tabular-nums")}>{chip.timeLabel}</span>}
                {chip?.title || 'Untitled'}
              </button>
            );
          })}
          {events.length === 0 && (
            <div className={cn("text-xs text-ink-muted text-center py-3")}>No events</div>
          )}
        </div>
        <button type="button" onClick={() => { onQuickCreate(); onClose(); }}
          className={cn(`w-full flex items-center gap-1.5 px-3 py-2 border-t border-line text-xs
            text-ink-secondary hover:bg-hover-surface transition-colors`)}>
          <Plus className={cn("w-3.5 h-3.5")} /> New
        </button>
      </dialog>
    </>,
    document.body,
  );
}
