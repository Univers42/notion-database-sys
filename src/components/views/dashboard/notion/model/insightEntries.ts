/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   insightEntries.ts                                  :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/10/27 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/10/27 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { SchemaProperty } from '../../../../../types/database';

export interface InsightEntry {
  label: string;
  insight: 'formulas' | 'relations';
}

/** Insight presentations a database's columns allow. The picker and the widget
 *  menu both list these, so a tile one of them builds the other can rebuild. */
export function insightEntries(properties: Record<string, SchemaProperty> | readonly SchemaProperty[]): InsightEntry[] {
  const all = Array.isArray(properties) ? properties : Object.values(properties);
  const hasFormula = all.some(p => p.type === 'formula');
  const hasRelationOrRollup = all.some(p => p.type === 'relation' || p.type === 'rollup');
  const entries: InsightEntry[] = [];
  if (hasFormula) entries.push({ label: 'Formula health', insight: 'formulas' });
  if (hasRelationOrRollup) entries.push({ label: 'Relations & rollups', insight: 'relations' });
  return entries;
}