/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   calendarKeyboard.ts                                 :+:      :+:    :+:  */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── calendarKeyboard — Google Calendar's shortcut vocabulary, pure ─────────
// t today · j/n next · k/p prev · m/w/d/a view modes · c create.
// Never fires while typing or with a modifier held.

import type { CalendarAction } from './calendarTypes';

const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

export function isTypingTarget(tagName: string | undefined, isContentEditable: boolean): boolean {
  // tagName is absent when the event target is document/window (not an element).
  return isContentEditable || (!!tagName && TYPING_TAGS.has(tagName.toUpperCase()));
}

const SHORTCUTS: Record<string, CalendarAction> = {
  t: 'today',
  j: 'next',
  n: 'next',
  k: 'prev',
  p: 'prev',
  m: 'month-mode',
  w: 'week-mode',
  d: 'day-mode',
  a: 'agenda-mode',
  c: 'create',
};

export function resolveCalendarShortcut(
  key: string,
  opts: { metaOrCtrl: boolean; alt: boolean; typing: boolean },
): CalendarAction | null {
  if (opts.typing || opts.metaOrCtrl || opts.alt) return null;
  return SHORTCUTS[key.toLowerCase()] ?? null;
}
