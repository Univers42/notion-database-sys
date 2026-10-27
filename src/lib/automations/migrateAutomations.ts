/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   migrateAutomations.ts                              :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/10/27 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/10/27 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * v1 automations lived in `view.settings.automations`, one copy per view; a
 * database's rules were the union of its views'. They move onto the database
 * as v2 rules (a trigger, conditions and a program), once: a database that
 * already has `automations` is left as it is, and so is its views' state.
 * Returns the same objects when nothing moves.
 */

import type {
  AutomationAction,
  AutomationRule,
  AutomationRuleV2,
  AutomationTrigger,
  DatabaseSchema,
  ProgramStep,
  ProgramValue,
  ViewConfig,
} from '../../types/database';

interface AutomationState {
  databases: Record<string, DatabaseSchema>;
  views: Record<string, ViewConfig>;
}

const MIGRATED_AT = '1970-01-01T00:00:00.000Z';

function triggerOf(rule: AutomationRule): AutomationTrigger {
  if (rule.trigger === 'row_added' || rule.trigger === 'row_deleted') return { type: rule.trigger };
  return rule.watchColumn ? { type: 'property_changed', propertyId: rule.watchColumn } : { type: 'property_changed' };
}

// Caveat: the v1 editor only wrote text, so a value that is not a scalar can
// only come from hand-edited state; it is kept as its JSON text.
function programValue(value: unknown): ProgramValue {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  return JSON.stringify(value);
}

// open_url and add_page were button-only; v1 rules ignored them, so do these.
function stepOf(action: AutomationAction, rule: AutomationRule): ProgramStep | null {
  if (action.type === 'set_property' && action.column) {
    return { op: 'action', action: { type: 'set_property', property: action.column, value: programValue(action.value) } };
  }
  if (action.type === 'notify') return { op: 'action', action: { type: 'notify', message: action.message ?? rule.name } };
  if (action.type === 'webhook' && action.url) return { op: 'action', action: { type: 'webhook', url: action.url } };
  return null;
}

function ruleV2(rule: AutomationRule): AutomationRuleV2 {
  const { condition } = rule;
  return {
    version: 2,
    id: rule.id,
    name: rule.name,
    enabled: rule.enabled,
    ownerId: null,
    trigger: triggerOf(rule),
    conditions: condition
      ? [{ id: `${rule.id}-condition`, propertyId: condition.column, operator: condition.operator, value: condition.value ?? null }]
      : [],
    conjunction: 'and',
    program: { version: 1, steps: rule.actions.map((action) => stepOf(action, rule)).filter((step) => step !== null) },
    updatedAt: MIGRATED_AT,
  };
}

function withoutAutomations(view: ViewConfig): ViewConfig {
  const settings = { ...view.settings };
  delete settings.automations;
  return { ...view, settings };
}

export function migrateAutomations<State extends AutomationState>(state: State): State {
  let databases: Record<string, DatabaseSchema> | null = null;
  let views: Record<string, ViewConfig> | null = null;
  for (const database of Object.values(state.databases)) {
    if (database.automations) continue;
    const holders = Object.values(state.views).filter(
      (view) => view.databaseId === database.id && (view.settings?.automations?.length ?? 0) > 0);
    if (holders.length === 0) continue;
    const byId = new Map<string, AutomationRule>();
    for (const view of holders) for (const rule of view.settings?.automations ?? []) if (!byId.has(rule.id)) byId.set(rule.id, rule);
    databases ??= { ...state.databases };
    databases[database.id] = { ...database, automations: [...byId.values()].map(ruleV2) };
    views ??= { ...state.views };
    for (const view of holders) views[view.id] = withoutAutomations(view);
  }
  return databases && views ? { ...state, databases, views } : state;
}
