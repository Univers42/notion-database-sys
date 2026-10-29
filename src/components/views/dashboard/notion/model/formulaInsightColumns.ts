/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   formulaInsightColumns.ts                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/10/27 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/10/27 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { SchemaProperty } from '../../../../../types/database';
import type { AnalyticsEntry } from '../../../formulaAnalytics/constants';

export type FormulaAnalyticsMap = Record<string, AnalyticsEntry>;

/** Column ids of the formula columns whose results are number-valued, in
 *  schema order, capped at 6 — one numeric card per entry. */
export function numericFormulaColumns(
  properties: Record<string, SchemaProperty> | readonly SchemaProperty[],
  analytics: FormulaAnalyticsMap = {},
): string[] {
  const all = Array.isArray(properties) ? properties : Object.values(properties);
  return all
    .filter((p) => p.type === 'formula' && p.formulaConfig?.expression)
    .map((p) => p.id)
    .filter((id) => analytics[id]?.resultType === 'number')
    .slice(0, 6);
}

