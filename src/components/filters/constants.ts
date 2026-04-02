/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   constants.ts                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:36:13 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 16:36:14 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ═══════════════════════════════════════════════════════════════════════════════
// Filter constants, operators, and utilities
// ═══════════════════════════════════════════════════════════════════════════════

import type { FilterOperator } from '../../types/database';

export const FILTER_OPERATORS: Record<string, { label: string; value: FilterOperator }[]> = {
  text: [
    { label: 'Contains', value: 'contains' }, { label: 'Does not contain', value: 'not_contains' },
    { label: 'Equals', value: 'equals' }, { label: 'Not equals', value: 'not_equals' },
    { label: 'Starts with', value: 'starts_with' }, { label: 'Ends with', value: 'ends_with' },
    { label: 'Is empty', value: 'is_empty' }, { label: 'Is not empty', value: 'is_not_empty' },
  ],
  title: [
    { label: 'Contains', value: 'contains' }, { label: 'Does not contain', value: 'not_contains' },
    { label: 'Equals', value: 'equals' }, { label: 'Is empty', value: 'is_empty' },
    { label: 'Is not empty', value: 'is_not_empty' },
  ],
  number: [
    { label: '=', value: 'equals' }, { label: '≠', value: 'not_equals' },
    { label: '>', value: 'greater_than' }, { label: '<', value: 'less_than' },
    { label: '≥', value: 'greater_than_or_equal' }, { label: '≤', value: 'less_than_or_equal' },
    { label: 'Is empty', value: 'is_empty' }, { label: 'Is not empty', value: 'is_not_empty' },
  ],
  select: [
    { label: 'Is', value: 'equals' }, { label: 'Is not', value: 'not_equals' },
    { label: 'Is empty', value: 'is_empty' }, { label: 'Is not empty', value: 'is_not_empty' },
  ],
  status: [
    { label: 'Is', value: 'equals' }, { label: 'Is not', value: 'not_equals' },
    { label: 'Is empty', value: 'is_empty' }, { label: 'Is not empty', value: 'is_not_empty' },
  ],
  multi_select: [
    { label: 'Contains', value: 'contains' }, { label: 'Does not contain', value: 'not_contains' },
    { label: 'Is empty', value: 'is_empty' }, { label: 'Is not empty', value: 'is_not_empty' },
  ],
  date: [
    { label: 'Is', value: 'equals' }, { label: 'Is before', value: 'is_before' },
    { label: 'Is after', value: 'is_after' },
    { label: 'Is on or before', value: 'is_on_or_before' }, { label: 'Is on or after', value: 'is_on_or_after' },
    { label: 'Is between', value: 'is_between' }, { label: 'Is relative to today', value: 'is_relative_to_today' },
    { label: 'Is empty', value: 'is_empty' }, { label: 'Is not empty', value: 'is_not_empty' },
  ],
  checkbox: [
    { label: 'Is checked', value: 'is_checked' }, { label: 'Is not checked', value: 'is_not_checked' },
  ],
  user: [
    { label: 'Is', value: 'equals' }, { label: 'Is not', value: 'not_equals' },
    { label: 'Is empty', value: 'is_empty' }, { label: 'Is not empty', value: 'is_not_empty' },
  ],
  person: [
    { label: 'Is', value: 'equals' }, { label: 'Is not', value: 'not_equals' },
    { label: 'Is empty', value: 'is_empty' }, { label: 'Is not empty', value: 'is_not_empty' },
  ],
  url: [
    { label: 'Equals', value: 'equals' }, { label: 'Contains', value: 'contains' },
    { label: 'Is empty', value: 'is_empty' }, { label: 'Is not empty', value: 'is_not_empty' },
  ],
  email: [
    { label: 'Equals', value: 'equals' }, { label: 'Contains', value: 'contains' },
    { label: 'Is empty', value: 'is_empty' }, { label: 'Is not empty', value: 'is_not_empty' },
  ],
  phone: [
    { label: 'Equals', value: 'equals' }, { label: 'Is empty', value: 'is_empty' },
  ],
  created_time: [
    { label: 'Is before', value: 'is_before' }, { label: 'Is after', value: 'is_after' },
    { label: 'Is on or before', value: 'is_on_or_before' }, { label: 'Is on or after', value: 'is_on_or_after' },
  ],
  last_edited_time: [
    { label: 'Is before', value: 'is_before' }, { label: 'Is after', value: 'is_after' },
    { label: 'Is on or before', value: 'is_on_or_before' }, { label: 'Is on or after', value: 'is_on_or_after' },
  ],
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
