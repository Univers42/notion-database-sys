/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useCalendarKeyboard.ts                              :+:      :+:    :+:  */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── useCalendarKeyboard — Google's shortcuts, scoped to THIS calendar ──────
// The app is multi-pane (several calendars can mount): only the calendar the
// pointer is over — or that contains focus — reacts. Typing targets and
// modifier chords never trigger (resolver guards, unit-tested).

import { useEffect, useRef } from 'react';
import { isTypingTarget, resolveCalendarShortcut } from './model/calendarKeyboard';
import type { CalendarAction } from './model/calendarTypes';

export function useCalendarKeyboard(
  rootRef: React.RefObject<HTMLElement | null>,
  onAction: (action: CalendarAction) => void,
): void {
  const hoveredRef = useRef(false);
  const actionRef = useRef(onAction);
  actionRef.current = onAction;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onEnter = (): void => { hoveredRef.current = true; };
    const onLeave = (): void => { hoveredRef.current = false; };
    root.addEventListener('pointerenter', onEnter);
    root.addEventListener('pointerleave', onLeave);

    const onKeyDown = (e: KeyboardEvent): void => {
      const scoped = hoveredRef.current || root.contains(document.activeElement);
      if (!scoped) return;
      const target = e.target as HTMLElement | null;
      const action = resolveCalendarShortcut(e.key, {
        metaOrCtrl: e.metaKey || e.ctrlKey,
        alt: e.altKey,
        typing: !!target && isTypingTarget(target.tagName, target.isContentEditable),
      });
      if (!action) return;
      e.preventDefault();
      actionRef.current(action);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      root.removeEventListener('pointerenter', onEnter);
      root.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [rootRef]);
}
