/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   rollup.ts                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/03 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 13:16:06 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { RollupFunction } from '../types/database';

/** Metadata for a single rollup aggregation function. */
export interface RollupFunctionMeta {
  value: RollupFunction;
  label: string;
  group: 'Show' | 'Count' | 'Percent' | 'Math';
}

export const ROLLUP_FUNCTIONS: readonly RollupFunctionMeta[] = [
  { value: 'show_original',        label: 'Show original',        group: 'Show' },
  { value: 'show_unique',          label: 'Show unique values',   group: 'Show' },
  { value: 'count_all',            label: 'Count all',            group: 'Count' },
  { value: 'count_values',         label: 'Count values',         group: 'Count' },
  { value: 'count_unique_values',  label: 'Count unique values',  group: 'Count' },
  { value: 'count_empty',          label: 'Count empty',          group: 'Count' },
  { value: 'count_not_empty',      label: 'Count not empty',      group: 'Count' },
  { value: 'percent_empty',        label: 'Percent empty',        group: 'Percent' },
  { value: 'percent_not_empty',    label: 'Percent not empty',    group: 'Percent' },
  { value: 'sum',                  label: 'Sum',                  group: 'Math' },
  { value: 'average',             label: 'Average',              group: 'Math' },
  { value: 'median',              label: 'Median',               group: 'Math' },
  { value: 'min',                 label: 'Min',                  group: 'Math' },
  { value: 'max',                 label: 'Max',                  group: 'Math' },
  { value: 'range',               label: 'Range',                group: 'Math' },
] as const;

/** Returns rollup functions organized by their group key (Show, Count, Percent, Math). */
export function groupedRollupFunctions(): Record<string, readonly RollupFunctionMeta[]> {
  const groups: Record<string, RollupFunctionMeta[]> = {};
  for (const fn of ROLLUP_FUNCTIONS) {
    if (!groups[fn.group]) groups[fn.group] = [];
    groups[fn.group].push(fn);
  }
  return groups;
}

/** Returns the human-readable label for a rollup function value, defaulting to "Show original". */
export function getRollupLabel(value: RollupFunction): string {
  return ROLLUP_FUNCTIONS.find(f => f.value === value)?.label ?? 'Show original';
}
