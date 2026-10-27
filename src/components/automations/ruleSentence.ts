/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ruleSentence.ts                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/10/27 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/10/27 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { AutomationRuleV2, SchemaProperty, SelectOption } from '../../types/database';

const OPERATOR_PHRASE: Record<string, string> = {
  equals: 'is',
  not_equals: 'is not',
  contains: 'contains',
  not_contains: 'does not contain',
  starts_with: 'starts with',
  ends_with: 'ends with',
  is_empty: 'is empty',
  is_not_empty: 'is not empty',
  greater_than: 'is greater than',
  less_than: 'is less than',
  greater_than_or_equal: 'is at least',
  less_than_or_equal: 'is at most',
  is_before: 'is before',
  is_after: 'is after',
  is_on_or_before: 'is on or before',
  is_on_or_after: 'is on or after',
  is_between: 'is between',
  is_relative_to_today: 'is relative to today',
  is_checked: 'is checked',
  is_not_checked: 'is not checked',
};

function optionLabel(property: SchemaProperty | undefined, value: unknown): string {
  if (property?.options) {
    const found = property.options.find((option: SelectOption) => option.id === value);
    if (found) return found.value;
  }
  if (value === null || value === undefined) return '';
  return String(value);
}

function triggerPhrase(rule: AutomationRuleV2, properties: Record<string, SchemaProperty>): string {
  const trigger = rule.trigger;
  if (trigger.type === 'row_added') return 'When a row is added';
  if (trigger.type === 'row_deleted') return 'When a row is deleted';
  // property_changed
  if (!trigger.propertyId) return 'When any property changes';
  const property = properties[trigger.propertyId];
  if (!property) return 'When a deleted property changes';
  let phrase = `When ${property.name} changes`;
  if (trigger.from !== undefined) phrase += ` from ${optionLabel(property, trigger.from)}`;
  if (trigger.to !== undefined) phrase += ` to ${optionLabel(property, trigger.to)}`;
  return phrase;
}

function conditionPhrase(condition: { propertyId: string; operator: string; value: unknown }, properties: Record<string, SchemaProperty>): string {
  const property = properties[condition.propertyId];
  const name = property ? property.name : 'a deleted property';
  const op = OPERATOR_PHRASE[condition.operator] ?? condition.operator;
  const valueless = new Set(['is_empty', 'is_not_empty', 'is_checked', 'is_not_checked', 'is_relative_to_today']);
  if (valueless.has(condition.operator)) return `${name} ${op}`;
  return `${name} ${op} ${optionLabel(property, condition.value)}`.trim();
}

function conditionsPhrase(rule: AutomationRuleV2, properties: Record<string, SchemaProperty>): string {
  if (rule.conditions.length === 0) return '';
  const parts = rule.conditions.map((condition) => conditionPhrase(condition, properties));
  const joiner = rule.conjunction === 'or' ? ' or ' : ' and ';
  return parts.join(joiner);
}

function stepPhrase(step: { op: string; [key: string]: unknown }, properties: Record<string, SchemaProperty>): string {
  if (step.op !== 'action') return String(step.op);
  const action = step.action as { type: string; property?: string; message?: unknown; url?: string };
  if (action.type === 'set_property') {
    const property = action.property ? properties[action.property] : undefined;
    const name = property ? property.name : (action.property || 'a property');
    return `set ${name}`;
  }
  if (action.type === 'notify') return 'show a message';
  if (action.type === 'webhook') return 'call a webhook';
  return action.type.replace(/_/g, ' ');
}

function doPhrase(rule: AutomationRuleV2, properties: Record<string, SchemaProperty>): string {
  const steps = rule.program?.steps ?? [];
  if (steps.length === 0) return 'do nothing yet';
  return steps.map((step) => stepPhrase(step as { op: string }, properties)).join(', ');
}

export function ruleSentence(rule: AutomationRuleV2, properties: Record<string, SchemaProperty>): string {
  const trigger = triggerPhrase(rule, properties);
  const conditions = conditionsPhrase(rule, properties);
  const action = doPhrase(rule, properties);
  if (conditions) return `${trigger}, if ${conditions}: ${action}`;
  return `${trigger}: ${action}`;
}