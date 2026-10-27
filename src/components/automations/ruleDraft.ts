/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ruleDraft.ts                                        :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/10/27 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/10/27 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { AutomationRuleV2, SchemaProperty } from '../../types/database';
import { isWritableType } from '../../store/validation';
import { isIncompleteFilter } from '../../lib/filter/filterHelpers';

export interface RuleDraftContext {
  newId: () => string;
  ownerId: string | null;
  now: string;
}

export function blankRule(ctx: RuleDraftContext): AutomationRuleV2 {
  return {
    version: 2,
    id: ctx.newId(),
    name: '',
    enabled: true,
    ownerId: ctx.ownerId,
    trigger: { type: 'row_added' },
    conditions: [],
    conjunction: 'and',
    program: { version: 1, steps: [] },
    updatedAt: ctx.now,
  };
}

function propertyName(properties: Record<string, SchemaProperty>, id: string): string {
  return properties[id]?.name ?? id;
}

function isEmptyValue(value: unknown): boolean {
  return value === null || value === undefined || value === '' ||
    (typeof value === 'string' && value.trim() === '');
}

export function draftProblems(rule: AutomationRuleV2, properties: Record<string, SchemaProperty>): string[] {
  const problems: string[] = [];
  if (isEmptyValue(rule.name)) problems.push('Give the automation a name');

  for (const condition of rule.conditions) {
    if (isIncompleteFilter(condition)) {
      problems.push(`Finish the condition on ${propertyName(properties, condition.propertyId)}`);
    }
  }

  const steps = rule.program?.steps ?? [];
  for (const step of steps) {
    if (step.op !== 'action') continue;
    const action = (step as { action: { type: string; property?: string; value?: unknown; url?: string; message?: unknown } }).action;
    if (action.type === 'set_property') {
      if (!action.property) {
        problems.push('Choose the property to set');
      } else {
        const property = properties[action.property];
        if (property && !isWritableType(property.type)) {
          problems.push(`${property.name} is computed and cannot be set`);
        } else if (!property) {
          problems.push('Choose the property to set');
        }
      }
    } else if (action.type === 'webhook') {
      if (typeof action.url !== 'string' || !action.url.startsWith('https://')) {
        problems.push('A webhook needs an https:// address');
      }
    } else if (action.type === 'notify') {
      if (isEmptyValue(action.message)) problems.push('Write the message to show');
    }
  }

  if (steps.length === 0) problems.push('Add at least one action');

  return problems;
}