/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   pageAutomations.ts                                 :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/10/27 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * The store's side of the v2 automations: after a row is added, edited or
 * deleted, the database's rules run (lib/automations/runAutomations.ts), and
 * their writes land in this store, marked as the automation's, so they can
 * start other rules. Live mounts are skipped: their rules run on the server.
 * Notifications surface as an `nds:automation-fired` CustomEvent.
 */

import { AUTOMATION_FIRED_EVENT } from '../../lib/automations/automationRunner';
import { migrateAutomations } from '../../lib/automations/migrateAutomations';
import {
  runAutomations,
  type AutomationActionRun,
  type AutomationEventV2,
  type AutomationHost,
  type AutomationOutcome,
  type AutomationRun,
} from '../../lib/automations/runAutomations';
import { dispatchAutomationWebhook } from '../../lib/automations/webhookTransport';
import { evalFormula, initFormulaEngine } from '../../lib/engine/bridge';
import type { ResolvedAction } from '../../lib/program/interpreter';
import { parseLiveDatabaseId } from '../live/liveTypes';
import { validatePropertyValue } from '../validation';
import { semanticValue } from './cellValues';
import type { AutomationRuleV2, Page, SchemaProperty } from '../../types/database';
import type { StoreSet, StoreGet, DatabaseState } from '../dbms/hardcoded/storeTypes';

type PersistingState = DatabaseState & { persistPageProperty?: (pageId: string, propertyId: string, value: unknown) => void };

/** The database's rules. v1 rules still kept on its views run as v2 until a
 *  save moves them onto the database. */
export function databaseRules(state: DatabaseState, databaseId: string): readonly AutomationRuleV2[] {
  const database = state.databases[databaseId];
  if (!database) return [];
  if (database.automations) return database.automations;
  const views = Object.fromEntries(Object.entries(state.views).filter(([, view]) => view.databaseId === databaseId));
  return migrateAutomations({ databases: { [databaseId]: database }, views }).databases[databaseId].automations ?? [];
}

// A step names its property by id (the rule editor) or by name (a typed one).
function propertyOf(state: DatabaseState, page: Page, key: string): SchemaProperty | undefined {
  const properties = state.databases[page.databaseId]?.properties ?? {};
  return properties[key] ?? Object.values(properties).find((property) => property.name === key);
}

function writeProperty(set: StoreSet, get: StoreGet, run: AutomationActionRun, key: string, value: unknown): AutomationOutcome {
  const state = get();
  const before = state.pages[run.event.page.id];
  if (!before || run.event.type === 'row_deleted') return { status: 'skipped', detail: 'the row is gone' };
  const property = propertyOf(state, before, key);
  if (!property) return { status: 'failed', detail: `no property "${key}"` };
  // A Date (or the value a formula engine hands back as one) lands on a
  // date property as its ISO string, so `{ formula: "now()" }` stores a
  // readable date instead of failing validation.
  let toValidate = value;
  if ((property.type === 'date' || property.type === 'due_date') && value instanceof Date) {
    toValidate = value.toISOString();
  }
  const valid = validatePropertyValue(toValidate, property, state.pages);
  if (!valid.ok) return { status: 'failed', detail: valid.reason };
  const after: Page = {
    ...before,
    properties: { ...before.properties, [property.id]: valid.value },
    updatedAt: new Date().toISOString(),
    lastEditedBy: 'Automation',
  };
  set((current: DatabaseState) => ({ pages: { ...current.pages, [after.id]: after } }));
  (get() as PersistingState).persistPageProperty?.(after.id, property.id, valid.value);
  return { status: 'ok', caused: { type: 'property_changed', page: after, before, changed: [property.id] } };
}

function performAction(set: StoreSet, get: StoreGet, action: ResolvedAction, run: AutomationActionRun): AutomationOutcome {
  const { rule, event } = run;
  switch (action.type) {
    case 'set_property':
      return writeProperty(set, get, run, action.property, action.value);
    case 'notify':
      if (globalThis.window !== undefined) {
        globalThis.dispatchEvent(new CustomEvent(AUTOMATION_FIRED_EVENT, {
          detail: { ruleId: rule.id, ruleName: rule.name, message: String(action.message ?? rule.name) },
        }));
      }
      return { status: 'ok' };
    case 'webhook':
      dispatchAutomationWebhook(action.url, {
        source: { automationId: rule.id, databaseId: event.page.databaseId },
        data: { trigger: event.type, pageId: event.page.id, properties: event.page.properties },
      });
      return { status: 'ok' };
    default:
      return { status: 'skipped', detail: 'not available in an automation' };
  }
}

function storeHost(set: StoreSet, get: StoreGet): AutomationHost {
  return {
    rules: (databaseId) => databaseRules(get(), databaseId),
    // Formulas read properties by name, as a formula column does.
    propsOf: (event) => {
      const state = get();
      const page = state.pages[event.page.id] ?? event.page;
      const properties = state.databases[page.databaseId]?.properties ?? {};
      return Object.fromEntries(Object.values(properties).map((property) => [property.name, semanticValue(state, page, property)]));
    },
    evaluateFormula: evalFormula,
    runAction: async (action, run) => performAction(set, get, action, run),
    now: () => Date.now(),
  };
}

function containsFormula(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(containsFormula);
  if (typeof (value as { formula?: unknown }).formula === 'string') return true;
  return Object.values(value as Record<string, unknown>).some(containsFormula);
}

function programHasFormula(rule: AutomationRuleV2): boolean {
  return containsFormula(rule.program);
}

export async function runStoreAutomations(set: StoreSet, get: StoreGet, event: AutomationEventV2): Promise<AutomationRun[]> {
  if (parseLiveDatabaseId(event.page.databaseId)) return [];
  const rules = databaseRules(get(), event.page.databaseId);
  if (rules.length === 0) return [];
  // A rule whose program holds a formula needs the formula engine ready, so
  // `{ formula: "now()" }` works on the very first run instead of returning
  // the unavailable sentinel. When the engine cannot load, the step fails
  // with a logged reason and writes nothing.
  if (rules.some(programHasFormula)) await initFormulaEngine();
  try {
    return await runAutomations(event, storeHost(set, get));
  } catch (error: unknown) {
    console.warn('[automations] run failed:', error);
    return [];
  }
}
