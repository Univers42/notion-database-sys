/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   actionExecutor.ts                                   :+:      :+:    :+:  */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 18:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 18:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── Button action executor (Notion database buttons) ───────────────────────
// Runs a ButtonConfig's action list against the clicked row. set_property goes
// through the store's updatePageProperty, so validation/persistence apply and
// AUTOMATION RULES FIRE ONCE for the button's write (Notion parity: buttons
// can start automations); rule-planned writes never chain further — the
// planner's single-pass batch is the loop-safety mechanism.

import type { AutomationAction, Page } from '@notion-db/contract-types';
import type { DatabaseStoreApi } from '../../store/useDatabaseStore';
import { AUTOMATION_FIRED_EVENT } from './automationRunner';
import { dispatchAutomationWebhook } from './webhookTransport';

export interface ButtonActionContext {
  storeApi: DatabaseStoreApi;
  page: Page;
  databaseId: string;
}

/** Execute a button's actions against its row. Every action is independent —
 *  one failing/no-op action never blocks the rest. */
export function executeButtonActions(
  actions: readonly AutomationAction[],
  ctx: ButtonActionContext,
  buttonLabel: string,
): void {
  const state = ctx.storeApi.getState();
  for (const action of actions) {
    switch (action.type) {
      case 'set_property':
        if (action.column) state.updatePageProperty(ctx.page.id, action.column, action.value ?? null);
        break;
      case 'add_page':
        state.addPage(action.targetDatabaseId ?? ctx.databaseId, action.properties ?? {});
        break;
      case 'notify':
        if (globalThis.window !== undefined) {
          globalThis.dispatchEvent(new CustomEvent(AUTOMATION_FIRED_EVENT, {
            detail: { ruleId: `button:${ctx.page.id}`, ruleName: buttonLabel, message: action.message ?? buttonLabel },
          }));
        }
        break;
      case 'webhook':
        if (action.url) {
          dispatchAutomationWebhook(action.url, {
            source: { button: buttonLabel, databaseId: ctx.databaseId },
            data: { trigger: 'button', pageId: ctx.page.id, properties: ctx.page.properties },
          });
        }
        break;
      case 'open_url':
        if (action.url) window.open(action.url, '_blank', 'noopener');
        break;
    }
  }
}
