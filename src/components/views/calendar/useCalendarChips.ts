/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useCalendarChips.ts                                 :+:      :+:    :+:  */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── useCalendarChips — per-event display data (title/icon/time/color) ──────
// Color precedence: conditional-color rules → first select option's class →
// the accent default (same ladder the table/board/gallery apply).

import { useMemo } from 'react';
import { format } from 'date-fns';
import { colorForPage } from '../../../lib/conditionalColor';
import type { ConditionalColorRule } from '@notion-db/contract-types';
import type { DatabaseSchema, Page, SchemaProperty } from '../../../types/database';
import type { ChipData } from './CalendarWeekRow';
import { eventDurationDays } from './model/calendarEvents';
import type { CalEvent } from './model/calendarTypes';

export function useCalendarChips(
  events: readonly CalEvent[],
  pages: readonly Page[],
  database: DatabaseSchema | null,
  startProp: SchemaProperty | null,
  conditionalColors: readonly ConditionalColorRule[] | undefined,
  getPageTitle: (page: Page) => string,
): Map<string, ChipData> {
  return useMemo(() => {
    const map = new Map<string, ChipData>();
    if (!database || !startProp) return map;
    const byId = new Map(pages.map(p => [p.id, p]));
    const selectProp = Object.values(database.properties)
      .find(p => p.type === 'select' && p.id !== startProp.id);
    for (const ev of events) {
      const page = byId.get(ev.pageId);
      if (!page) continue;
      const token = colorForPage(page, conditionalColors, database.properties);
      const optId = selectProp ? page.properties[selectProp.id] : null;
      const opt = selectProp?.options?.find(o => o.id === optId);
      map.set(ev.pageId, {
        title: getPageTitle(page),
        icon: page.icon,
        timeLabel: startProp.dateIncludeTime && !ev.isRanged
          ? format(new Date(ev.startIso), 'HH:mm')
          : null,
        color: token
          ? { tint: token.tint, accent: token.accent }
          : { className: opt?.color },
        isRanged: ev.isRanged,
        spanDays: eventDurationDays(ev),
      });
    }
    return map;
  }, [events, pages, database, startProp, conditionalColors, getPageTitle]);
}
