/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   aggregation.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/03 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/03 16:15:45 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ═══════════════════════════════════════════════════════════════════════════════
// Numeric aggregation and grouping utilities
// ═══════════════════════════════════════════════════════════════════════════════

export interface NumericAgg {
  sum: number;
  count: number;
  min: number;
  max: number;
  average: number;
  median: number;
}

/** Computes standard descriptive statistics for a numeric array */
export function aggregateNumbers(values: readonly number[]): NumericAgg {
  if (values.length === 0) {
    return { sum: 0, count: 0, min: 0, max: 0, average: 0, median: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((s, v) => s + v, 0);
  const count = values.length;
  const mid = Math.floor(count / 2);
  const median = count % 2
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
  return {
    sum,
    count,
    min: sorted[0],
    max: sorted[count - 1],
    average: sum / count,
    median,
  };
}

/** Counts occurrences of each string value */
export function countByValue(values: readonly string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const v of values) {
    counts[v] = (counts[v] ?? 0) + 1;
  }
  return counts;
}

/** Groups an array of items by the result of a key function */
export function groupBy<T>(
  items: readonly T[],
  keyFn: (item: T) => string,
): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  for (const item of items) {
    const key = keyFn(item);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}
