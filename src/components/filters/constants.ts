/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   constants.ts                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:36:13 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/03 16:15:46 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ═══════════════════════════════════════════════════════════════════════════════
// Filter constants, operators, and utilities
// ═══════════════════════════════════════════════════════════════════════════════

import type { FilterOperator } from '../../types/database';

// ─── Atomic operator definitions — single source of truth ────────────────────

const OP = {
  contains:                { label: 'Contains',             value: 'contains'              as FilterOperator },
  not_contains:            { label: 'Does not contain',     value: 'not_contains'          as FilterOperator },
  equals:                  { label: 'Equals',               value: 'equals'                as FilterOperator },
  not_equals:              { label: 'Not equals',           value: 'not_equals'            as FilterOperator },
  starts_with:             { label: 'Starts with',          value: 'starts_with'           as FilterOperator },
  ends_with:               { label: 'Ends with',            value: 'ends_with'             as FilterOperator },
  is_empty:                { label: 'Is empty',             value: 'is_empty'              as FilterOperator },
  is_not_empty:            { label: 'Is not empty',         value: 'is_not_empty'          as FilterOperator },
  greater_than:            { label: '>',                    value: 'greater_than'          as FilterOperator },
  less_than:               { label: '<',                    value: 'less_than'             as FilterOperator },
  greater_than_or_equal:   { label: '≥',                    value: 'greater_than_or_equal' as FilterOperator },
  less_than_or_equal:      { label: '≤',                    value: 'less_than_or_equal'    as FilterOperator },
  is_before:               { label: 'Is before',            value: 'is_before'             as FilterOperator },
  is_after:                { label: 'Is after',             value: 'is_after'              as FilterOperator },
  is_on_or_before:         { label: 'Is on or before',      value: 'is_on_or_before'       as FilterOperator },
  is_on_or_after:          { label: 'Is on or after',       value: 'is_on_or_after'        as FilterOperator },
  is_between:              { label: 'Is between',           value: 'is_between'            as FilterOperator },
  is_relative_to_today:    { label: 'Is relative to today', value: 'is_relative_to_today'  as FilterOperator },
  is_checked:              { label: 'Is checked',           value: 'is_checked'            as FilterOperator },
  is_not_checked:          { label: 'Is not checked',       value: 'is_not_checked'        as FilterOperator },
  // Aliases — same operator value, different display label for context
  is:                      { label: 'Is',                   value: 'equals'                as FilterOperator },
  is_not:                  { label: 'Is not',               value: 'not_equals'            as FilterOperator },
  eq_symbol:               { label: '=',                    value: 'equals'                as FilterOperator },
  neq_symbol:              { label: '≠',                    value: 'not_equals'            as FilterOperator },
} as const;

const pick = (...keys: (keyof typeof OP)[]) => keys.map(k => OP[k]);

export const FILTER_OPERATORS: Record<string, { label: string; value: FilterOperator }[]> = {
  text:             pick('contains', 'not_contains', 'equals', 'not_equals', 'starts_with', 'ends_with', 'is_empty', 'is_not_empty'),
  title:            pick('contains', 'not_contains', 'equals', 'is_empty', 'is_not_empty'),
  number:           pick('eq_symbol', 'neq_symbol', 'greater_than', 'less_than', 'greater_than_or_equal', 'less_than_or_equal', 'is_empty', 'is_not_empty'),
  select:           pick('is', 'is_not', 'is_empty', 'is_not_empty'),
  status:           pick('is', 'is_not', 'is_empty', 'is_not_empty'),
  multi_select:     pick('contains', 'not_contains', 'is_empty', 'is_not_empty'),
  date:             pick('is', 'is_before', 'is_after', 'is_on_or_before', 'is_on_or_after', 'is_between', 'is_relative_to_today', 'is_empty', 'is_not_empty'),
  checkbox:         pick('is_checked', 'is_not_checked'),
  user:             pick('is', 'is_not', 'is_empty', 'is_not_empty'),
  person:           pick('is', 'is_not', 'is_empty', 'is_not_empty'),
  url:              pick('equals', 'contains', 'is_empty', 'is_not_empty'),
  email:            pick('equals', 'contains', 'is_empty', 'is_not_empty'),
  phone:            pick('equals', 'is_empty'),
  created_time:     pick('is_before', 'is_after', 'is_on_or_before', 'is_on_or_after'),
  last_edited_time: pick('is_before', 'is_after', 'is_on_or_before', 'is_on_or_after'),
};

export function getOperatorsForType(type: string) {
  return FILTER_OPERATORS[type] || FILTER_OPERATORS.text;
}

export function needsValue(op: FilterOperator) {
  return !['is_empty', 'is_not_empty', 'is_checked', 'is_not_checked', 'is_relative_to_today'].includes(op);
}

export const DATE_PRESETS = [
  'Today', 'Tomorrow', 'Yesterday', 'One week ago',
  'One week from now', 'One month ago', 'One month from now', 'Custom date',
] as const;
