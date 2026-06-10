/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   chartEngine.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/10 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── chartEngine — orchestrates collect → aggregate → assemble ──────────────

import { collectCells, aggregateCells } from './chartAggregate';
import { assembleChartResult } from './chartAssemble';
import type { ChartEngineInput, ChartResult } from './chartTypes';
import { EMPTY_CHART_RESULT } from './chartTypes';

/**
 * Computes a complete chart from pages — the client-side data path.
 * Pure and synchronous: same input, same output. The server path builds an
 * {@link AggregatedMatrix} from op=aggregate rows and calls
 * {@link assembleChartResult} directly, sharing every later stage.
 */
export function buildChartData(input: ChartEngineInput): ChartResult {
  if (!input.xProp) return EMPTY_CHART_RESULT;
  const matrix = aggregateCells(collectCells(input), input.aggregation);
  return assembleChartResult(matrix, input);
}

/**
 * Flattens a ChartResult into recharts rows:
 * `[{ key, label, <seriesKey>: number, ... }, …]`.
 * Stacked bars render one <Bar dataKey={series.key} stackId="stack"> each.
 */
export function toRechartsRows(
  result: ChartResult,
): Array<Record<string, string | number>> {
  return result.categories.map(cat => {
    const row: Record<string, string | number> = { key: cat.key, label: cat.label };
    for (const s of result.series) row[s.key] = cat.values[s.key] ?? 0;
    return row;
  });
}
