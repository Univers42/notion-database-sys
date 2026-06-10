/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   automationRunner.ts                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 12:00:00 by dlesieur          #+#    #+#             */
/*                                                +#+#+#+#+#+   +#+           */
/* ************************************************************************** */

/**
 * Client-side automation fallback for LOCAL databases (live mounts run the
 * same rules SERVER-side, where they fire for every client). Pure planner:
 * (rules, mutation event, page) → the property writes + notifications to
 * apply. No chaining — planned writes never re-enter the planner (loop
 * safety mirrors the server's automationDepth guard). Honest limit: local
 * rules only see mutations made in THIS session.
 */

import type { AutomationRule, Page } from '@notion-db/contract-types';

export interface AutomationEvent {
  type: 'row_added' | 'row_updated' | 'row_deleted';
  page: Page;
  changedPropertyId?: string;
}

export interface PlannedWrite { pageId: string; propertyId: string; value: unknown }
export interface PlannedNotification { ruleId: string; ruleName: string; message: string }

export interface AutomationPlan {
  writes: PlannedWrite[];
  notifications: PlannedNotification[];
}

function conditionHolds(page: Page, condition: NonNullable<AutomationRule['condition']>): boolean {
  const value = page.properties[condition.column];
  const empty = value === undefined || value === null || value === '';
  switch (condition.operator) {
    case 'is_empty': return empty;
    case 'is_not_empty': return !empty;
    case 'equals': return value === condition.value || String(value) === String(condition.value);
    case 'not_equals': return !(value === condition.value || String(value) === String(condition.value));
    case 'contains':
      return String(value ?? '').toLowerCase().includes(String(condition.value ?? '').toLowerCase());
    case 'greater_than': return Number(value) > Number(condition.value);
    case 'less_than': return Number(value) < Number(condition.value);
    default: return false;
  }
}

/** The writes/notifications this event implies. Single pass, no chaining;
 *  webhook actions are SKIPPED client-side (server-only capability). */
export function planAutomations(
  rules: readonly AutomationRule[] | undefined,
  event: AutomationEvent,
): AutomationPlan {
  const plan: AutomationPlan = { writes: [], notifications: [] };
  for (const rule of rules ?? []) {
    if (!rule.enabled || rule.trigger !== event.type) continue;
    if (rule.condition && !conditionHolds(event.page, rule.condition)) continue;
    for (const action of rule.actions) {
      if (action.type === 'set_property' && action.column && event.type !== 'row_deleted') {
        // The planned write never re-triggers (no chaining).
        plan.writes.push({ pageId: event.page.id, propertyId: action.column, value: action.value ?? null });
      } else if (action.type === 'notify') {
        plan.notifications.push({ ruleId: rule.id, ruleName: rule.name, message: action.message ?? rule.name });
      }
    }
  }
  return plan;
}
