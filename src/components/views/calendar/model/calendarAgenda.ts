/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   calendarAgenda.ts                                   :+:      :+:    :+:  */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── calendarAgenda — Google-Schedule-style day-grouped upcoming list ───────
// Pure (no React/DOM). Multi-day events appear on every day they cover, so
// scanning any day answers "what's happening?" without back-tracking.

import type { CalEvent, DayKey } from './calendarTypes';
import { addDaysToKey } from './calendarGrid';
import { eventsOnDay } from './calendarEvents';

export interface AgendaSection {
  key: DayKey;
  events: CalEvent[];
}

/**
 * Day sections from `fromKey` over `days` days; empty days are skipped
 * (Google's Schedule view convention).
 */
export function buildAgenda(
  events: readonly CalEvent[],
  fromKey: DayKey,
  days: number,
): AgendaSection[] {
  const sections: AgendaSection[] = [];
  for (let i = 0; i < days; i++) {
    const key = i === 0 ? fromKey : addDaysToKey(fromKey, i);
    const dayEvents = eventsOnDay(events, key);
    if (dayEvents.length > 0) sections.push({ key, events: dayEvents });
  }
  return sections;
}
