/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ruleMatch.ts                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/10/27 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/10/27 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { AutomationRuleV2, Filter, Page, SchemaProperty } from '../../types/database';
import { matchesPropertyFilter } from '../filter/evaluateFilter';
import { isIncompleteFilter } from '../filter/filterHelpers';

/** A change to one row of a database, as the automations see it. */
export interface AutomationEventV2 {
  type: 'row_added' | 'property_changed' | 'row_deleted';
  /** The row after the change; for `row_deleted`, the row that was removed. */
  page: Page;
  /** `property_changed`: the row before the change. */
  before?: Page;
  /** `property_changed`: the ids of the properties that changed. */
  changed?: string[];
}

type Properties = Readonly<Record<string, SchemaProperty>>;

// The comparison the view filters make (loose, same-day dates, a select option
// by id or text), never `===` on objects: `to: "Done"` matches the stored "done".
const sameValue = (value: unknown, expected: unknown, property: SchemaProperty | undefined) =>
  matchesPropertyFilter(value, { operator: 'equals', value: expected }, property);

function triggerHolds(rule: AutomationRuleV2, event: AutomationEventV2, properties: Properties): boolean {
  const { trigger } = rule;
  if (trigger.type !== event.type) return false;
  if (trigger.type !== 'property_changed' || !trigger.propertyId) return true;
  const { propertyId, from, to } = trigger;
  if (!event.changed?.includes(propertyId)) return false;
  if (from !== undefined && !sameValue(event.before?.properties[propertyId], from, properties[propertyId])) return false;
  return to === undefined || sameValue(event.page.properties[propertyId], to, properties[propertyId]);
}

// A half-built condition (an operator still waiting for its value) never
// holds. A view skips one, but a rule that skipped it would run on every row.
function conditionsHold(rule: AutomationRuleV2, page: Page, properties: Properties): boolean {
  const { conditions } = rule;
  if (conditions.length === 0) return true;
  const holds = (condition: Filter) =>
    !isIncompleteFilter(condition)
    && matchesPropertyFilter(page.properties[condition.propertyId], condition, properties[condition.propertyId]);
  return rule.conjunction === 'or' ? conditions.some(holds) : conditions.every(holds);
}

/** `properties` is the database's schema; without it values compare as stored. */
export function ruleMatches(rule: AutomationRuleV2, event: AutomationEventV2, properties: Properties = {}): boolean {
  return rule.enabled && triggerHolds(rule, event, properties) && conditionsHold(rule, event.page, properties);
}
