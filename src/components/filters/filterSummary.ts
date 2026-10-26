/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   filterSummary.ts                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/10/27 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/10/27 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { FilterOperator, PropertyValue, SchemaProperty } from '../../types/database';
import { getOperatorsForType, needsValue } from './constants';

type SummaryProperty = Pick<SchemaProperty, 'name' | 'type'> & { options?: readonly { id: string; value: string }[] };

function valueText(property: SummaryProperty, value: PropertyValue): string {
  const optionName = (id: unknown) => property.options?.find(o => o.id === id)?.value ?? String(id);
  if (Array.isArray(value)) return value.map(optionName).join(', ');
  if (value && typeof value === 'object') {
    const { start, end } = value as { start?: unknown; end?: unknown };
    return [start, end].filter(Boolean).join(' – ');
  }
  if (value === '' || value === null || value === undefined) return '';
  return property.options ? optionName(value) : String(value);
}

/** The rule a filter applies, in words: "Name contains al", "Done is checked". */
export function filterSummary(property: SummaryProperty, operator: FilterOperator, value: PropertyValue): string {
  const label = getOperatorsForType(property.type).find(o => o.value === operator)?.label ?? operator;
  if (!needsValue(operator)) return `${property.name} ${label.toLowerCase()}`;
  const text = valueText(property, value);
  return text ? `${property.name} ${label.toLowerCase()} ${text}` : property.name;
}
