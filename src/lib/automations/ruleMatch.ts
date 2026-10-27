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

import type { AutomationRuleV2, Filter, Page } from '../../types/database';
import { matchesFilterValue } from '../filter/evaluateFilter';
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

// The comparison the view filters make (loose, same-day dates), never `===`
// on objects: `to: "Done"` matches the stored "done".
const sameValue = (value: unknown, expected: unknown) =>
  matchesFilterValue(value, { operator: 'equals', value: expected });

function triggerHolds(rule: AutomationRuleV2, event: AutomationEventV2): boolean {
  const { trigger } = rule;
  if (trigger.type !== event.type) return false;
  if (trigger.type !== 'property_changed' || !trigger.propertyId) return true;
  const { propertyId, from, to } = trigger;
  if (!event.changed?.includes(propertyId)) return false;
  if (from !== undefined && !sameValue(event.before?.properties[propertyId], from)) return false;
  return to === undefined || sameValue(event.page.properties[propertyId], to);
}

// A half-built condition (an operator still waiting for its value) never
// holds. A view skips one, but a rule that skipped it would run on every row.
function conditionsHold(rule: AutomationRuleV2, page: Page): boolean {
  const { conditions } = rule;
  if (conditions.length === 0) return true;
  const holds = (condition: Filter) =>
    !isIncompleteFilter(condition) && matchesFilterValue(page.properties[condition.propertyId], condition);
  return rule.conjunction === 'or' ? conditions.some(holds) : conditions.every(holds);
}

export function ruleMatches(rule: AutomationRuleV2, event: AutomationEventV2): boolean {
  return rule.enabled && triggerHolds(rule, event) && conditionsHold(rule, event.page);
}
