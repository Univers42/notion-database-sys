/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   runAutomations.ts                                  :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/10/27 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/10/27 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * Runs a database's automations for one row change: each matching rule's
 * program goes through the button interpreter, with its budgets. A write a
 * run makes is a change too, so it can start other rules, to a chain depth
 * of 3; a rule never runs twice on the same row in one chain, which is what
 * stops two rules that set each other's property.
 *
 * The host owns everything outside the pure logic: the rules, the formula
 * engine, and how an action is carried out.
 */

import type { AutomationRuleV2 } from '../../types/database';
import { DESTRUCTIVE_PAGE_ACTIONS } from '../program/buttonProgram';
import {
  runButtonProgram,
  type ActionOutcome,
  type LogEntry,
  type PropertyMap,
  type ResolvedAction,
} from '../program/interpreter';
import { ruleMatches, type AutomationEventV2 } from './ruleMatch';

export type { AutomationEventV2 };

export const MAX_CHAIN_DEPTH = 3;

export interface AutomationActionRun {
  rule: AutomationRuleV2;
  event: AutomationEventV2;
}

/** An action's outcome; a write reports the change it made, so the chain can go on. */
export type AutomationOutcome = ActionOutcome & { caused?: AutomationEventV2 };

export interface AutomationHost {
  rules(databaseId: string): readonly AutomationRuleV2[];
  /** The values the program's formulas read for this row. */
  propsOf(event: AutomationEventV2): PropertyMap;
  evaluateFormula(formula: string, props: PropertyMap): unknown;
  runAction(action: ResolvedAction, run: AutomationActionRun): Promise<AutomationOutcome>;
  now(): number;
}

export interface AutomationRun {
  ruleId: string;
  pageId: string;
  trigger: AutomationEventV2['type'];
  depth: number;
  startedAt: number;
  durationMs: number;
  status: 'ok' | 'failed' | 'blocked' | 'stopped';
  log: LogEntry[];
}

const BLOCKED: ActionOutcome = { status: 'blocked', detail: 'a rule cannot run this; it needs a person to confirm' };

async function runRule(
  rule: AutomationRuleV2,
  event: AutomationEventV2,
  depth: number,
  host: AutomationHost,
  caused: AutomationEventV2[],
): Promise<AutomationRun> {
  const startedAt = host.now();
  const result = await runButtonProgram(rule.program, {
    props: host.propsOf(event),
    evaluateFormula: (formula, props) => host.evaluateFormula(formula, props),
    now: () => host.now(),
    async runAction(action) {
      if (action.type === 'page_action' && DESTRUCTIVE_PAGE_ACTIONS[action.name] === true) return BLOCKED;
      const outcome = await host.runAction(action, { rule, event });
      if (outcome.caused) caused.push(outcome.caused);
      return outcome;
    },
  });
  const failed = result.log.some((entry) => entry.status === 'failed');
  let status: AutomationRun['status'] = failed ? 'failed' : 'ok';
  if (!result.ok) status = result.stoppedBy === 'budget' ? 'stopped' : 'blocked';
  return {
    ruleId: rule.id,
    pageId: event.page.id,
    trigger: event.type,
    depth,
    startedAt,
    durationMs: host.now() - startedAt,
    status,
    log: result.log,
  };
}

/** Breadth first: every rule the user's change starts runs before the rules
 *  their writes start. */
export async function runAutomations(event: AutomationEventV2, host: AutomationHost): Promise<AutomationRun[]> {
  const runs: AutomationRun[] = [];
  const ran = new Set<string>();
  let wave = [event];
  for (let depth = 1; depth <= MAX_CHAIN_DEPTH && wave.length > 0; depth += 1) {
    const next: AutomationEventV2[] = [];
    for (const current of wave) {
      for (const rule of host.rules(current.page.databaseId)) {
        const key = `${rule.id}\u0000${current.page.id}`;
        if (ran.has(key) || !ruleMatches(rule, current)) continue;
        ran.add(key);
        runs.push(await runRule(rule, current, depth, host, next));
      }
    }
    wave = next;
  }
  return runs;
}
