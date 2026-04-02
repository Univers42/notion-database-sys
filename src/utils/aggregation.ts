/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   aggregation.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/03 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 13:16:04 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/** Standard descriptive statistics for a numeric array. */
export interface NumericAgg {
  sum: number;
  count: number;
  min: number;
  max: number;
  average: number;
  median: number;
}

/**
 * Computes standard descriptive statistics for a numeric array.
 *
 * Returns zeroed stats for empty arrays. Median uses the sorted mid-point
 * for odd counts and the average of the two middle values for even counts.
 *
 * @param values - Array of numbers to aggregate.
 * @returns Object with sum, count, min, max, average, and median.
 */
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

/**
 * Counts occurrences of each string value in an array.
 *
 * @returns Record mapping each unique string to its occurrence count.
 */
export function countByValue(values: readonly string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const v of values) {
    counts[v] = (counts[v] ?? 0) + 1;
  }
  return counts;
}

/**
 * Groups an array of items by the result of a key function.
 *
 * @param items - Items to group.
 * @param keyFn - Function that returns the grouping key for each item.
 * @returns Record mapping each key to its array of items.
 */
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
