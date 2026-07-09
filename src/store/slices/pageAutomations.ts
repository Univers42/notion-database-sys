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

import { planAutomations, AUTOMATION_FIRED_EVENT, type AutomationEvent, type AutomationPlan } from '../../lib/automations/automationRunner';
import { dispatchAutomationWebhook } from '../../lib/automations/webhookTransport';
import { parseLiveDatabaseId } from '../live/liveTypes';
import type { Page } from '../../component/types';
import type { StoreSet, StoreGet, DatabaseState } from '../dbms/hardcoded/storeTypes';

const EMPTY_PLAN: AutomationPlan = { writes: [], notifications: [], webhooks: [] };

export function runLocalAutomations(
  set: StoreSet,
  get: StoreGet,
  event: AutomationEvent,
): AutomationPlan {
  const databaseId = event.page.databaseId;
  if (parseLiveDatabaseId(databaseId)) return EMPTY_PLAN; // server-side territory
  const state = get();
  const rules = Object.values(state.views)
    .filter((view) => view.databaseId === databaseId)
    .flatMap((view) => view.settings?.automations ?? []);
  if (rules.length === 0) return EMPTY_PLAN;
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
      globalThis.dispatchEvent(new CustomEvent(AUTOMATION_FIRED_EVENT, { detail: notification }));
    }
  }
  for (const hook of plan.webhooks) {
    dispatchAutomationWebhook(hook.url, {
      source: { automationId: hook.ruleId, databaseId },
      data: { trigger: event.type, pageId: event.page.id, properties: event.page.properties },
    });
  }
  // Returned so the effective store layer can persist the planned writes.
  return plan;
}
