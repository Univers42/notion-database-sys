/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useDateReminders.ts                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { useEffect, useRef } from 'react';
import { useStoreApi } from '../../../store/dbms/hardcoded/useDatabaseStore';
import { REMIND_OFFSET_MIN } from './timelineDatePickerTypes';

// Only reminders firing within this window get a live timer — bounds the number
// of scheduled timeouts and setTimeout's practical range. Re-evaluated on every
// store change and once an hour, so later reminders arm as their window opens.
const WINDOW_MS = 24 * 60 * 60 * 1000;
const SWEEP_MS = 60 * 60 * 1000;

interface Timer { id: ReturnType<typeof setTimeout>; }

/**
 * Best-effort in-session reminders for date properties whose panel "Remind" is
 * set. A date property carries a per-property remind offset (dateRemind); every
 * page value on it schedules a browser Notification at (event − offset).
 *
 * Scope is honest: this fires only while the app is OPEN (a client object DB has
 * no server push). Permission is requested lazily the first time a reminder is
 * armed; if denied/unavailable the hook no-ops. Fires are deduped for the
 * session so a re-render never double-notifies.
 */
export function useDateReminders(): void {
  const storeApi = useStoreApi();
  const timers = useRef(new Map<string, Timer>());
  const fired = useRef(new Set<string>());

  useEffect(() => {
    const canNotify = typeof Notification !== 'undefined';

    const notify = (title: string, when: Date) => {
      if (!canNotify || Notification.permission !== 'granted') return;
      try {
        // eslint-disable-next-line no-new
        new Notification('Reminder', { body: `${title} — ${when.toLocaleString()}` });
      } catch {
        /* notification construction can throw in some embeddings — ignore */
      }
    };

    const schedule = () => {
      const state = storeApi.getState();
      const now = Date.now();
      const wanted = new Map<string, { title: string; at: number; when: Date }>();

      for (const db of Object.values(state.databases)) {
        for (const prop of Object.values(db.properties)) {
          const offset = prop.dateRemind ? REMIND_OFFSET_MIN[prop.dateRemind] : -1;
          if (offset === undefined || offset < 0) continue; // 'None' / unset
          for (const page of Object.values(state.pages)) {
            if (page.databaseId !== db.id || page.archived) continue;
            const raw = page.properties[prop.id];
            if (!raw) continue;
            const event = new Date(raw);
            if (Number.isNaN(event.getTime())) continue;
            const at = event.getTime() - offset * 60_000;
            if (at <= now || at - now > WINDOW_MS) continue;
            const key = `${page.id}:${prop.id}:${at}`;
            if (fired.current.has(key)) continue;
            wanted.set(key, { title: state.getPageTitle?.(page) ?? 'Event', at, when: event });
          }
        }
      }

      // Drop timers no longer wanted.
      for (const [key, t] of timers.current) {
        if (!wanted.has(key)) { clearTimeout(t.id); timers.current.delete(key); }
      }
      // Arm new ones (request permission lazily on first need).
      if (wanted.size > 0 && canNotify && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => undefined);
      }
      for (const [key, w] of wanted) {
        if (timers.current.has(key)) continue;
        const id = setTimeout(() => {
          fired.current.add(key);
          timers.current.delete(key);
          notify(w.title, w.when);
        }, Math.max(0, w.at - Date.now()));
        timers.current.set(key, { id });
      }
    };

    schedule();
    const unsub = storeApi.subscribe(schedule);
    const sweep = setInterval(schedule, SWEEP_MS);
    const snapshot = timers.current;
    return () => {
      unsub();
      clearInterval(sweep);
      for (const t of snapshot.values()) clearTimeout(t.id);
      snapshot.clear();
    };
  }, [storeApi]);
}
