/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   pageAutomations.ts                                 :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 12:00:00 by dlesieur          #+#    #+#             */
/*                                                +#+#+#+#+#+   +#+           */
/* ************************************************************************** */

/**
 * Local-database automation hook for the page slice: after addPage /
 * updatePageProperty commit, the rules stored across this database's views
 * are planned (pure, no chaining) and the planned writes land in ONE extra
 * setState — never re-entering the planner (loop safety). Live mounts are
 * skipped entirely: their rules run SERVER-side in the query-router.
 * Notifications surface as a `nds:automation-fired` CustomEvent.
 */

import { planAutomations, type AutomationEvent } from '../../lib/automations/automationRunner';
import { parseLiveDatabaseId } from '../live/liveTypes';
import type { Page } from '../../component/types';
import type { StoreSet, StoreGet, DatabaseState } from '../dbms/hardcoded/storeTypes';

export function runLocalAutomations(
  set: StoreSet,
  get: StoreGet,
  event: AutomationEvent,
): void {
  const databaseId = event.page.databaseId;
  if (parseLiveDatabaseId(databaseId)) return; // server-side territory
  const state = get();
  const rules = Object.values(state.views)
    .filter((view) => view.databaseId === databaseId)
    .flatMap((view) => view.settings?.automations ?? []);
  if (rules.length === 0) return;
  const plan = planAutomations(rules, event);
  if (plan.writes.length > 0) {
    set((current: DatabaseState) => {
      const pages: Record<string, Page> = { ...current.pages };
      for (const write of plan.writes) {
        const page = pages[write.pageId];
        if (!page) continue;
        pages[write.pageId] = {
          ...page,
          properties: { ...page.properties, [write.propertyId]: write.value },
          updatedAt: new Date().toISOString(),
          lastEditedBy: 'Automation',
        };
      }
      return { pages };
    });
  }
  if (globalThis.window !== undefined) {
    for (const notification of plan.notifications) {
      globalThis.dispatchEvent(new CustomEvent('nds:automation-fired', { detail: notification }));
    }
  }
}
