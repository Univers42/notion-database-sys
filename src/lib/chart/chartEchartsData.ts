/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   chartEchartsData.ts                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 12:00:00 by dlesieur          #+#    #+#             */
/*                                                +#+#+#+#+#+   +#+           */
/* ************************************************************************** */

/**
 * Pure reshapers from the chart engine's ChartResult matrix to the data
 * shapes the extended (ECharts) families need. No echarts imports — these
 * are unit-tested without a DOM and shared by every option builder.
 */

import type { ChartResult } from './chartTypes';
import { VALUE_SERIES_KEY } from './chartTypes';

/** value of one series in one category (0 when absent). */
function cell(result: ChartResult, categoryIndex: number, seriesKey: string): number {
  return result.categories[categoryIndex]?.values[seriesKey] ?? 0;
}

/** Rectangular value grid: one row per series, one column per category. */
export function matrixGrid(result: ChartResult): number[][] {
  return result.series.map((series) =>
    result.categories.map((_, index) => cell(result, index, series.key)));
}

/** Per-category percentage normalization (100% stacked variants). */
export function percentGrid(result: ChartResult): number[][] {
  const grid = matrixGrid(result);
  const totals = result.categories.map((_, col) =>
    grid.reduce((sum, row) => sum + (row[col] ?? 0), 0));
  return grid.map((row) => row.map((value, col) =>
    (totals[col] > 0 ? Math.round((value / totals[col]) * 1000) / 10 : 0)));
}

/** Heatmap cells `[categoryIdx, seriesIdx, value]` + the value extent. */
export function heatmapCells(result: ChartResult): { cells: [number, number, number][]; max: number } {
  const cells: [number, number, number][] = [];
  let max = 0;
  result.series.forEach((series, seriesIdx) => {
    result.categories.forEach((_, categoryIdx) => {
      const value = cell(result, categoryIdx, series.key);
      cells.push([categoryIdx, seriesIdx, value]);
      if (value > max) max = value;
    });
  });
  return { cells, max };
}

export interface HierarchyNode { name: string; value: number; children?: HierarchyNode[] }

/** Category → series two-level hierarchy (single series folds to one level). */
export function hierarchyData(result: ChartResult): HierarchyNode[] {
  const single = result.series.length === 1 && result.series[0].key === VALUE_SERIES_KEY;
  return result.categories.map((category) => {
    if (single) return { name: category.label, value: category.total };
    const children = result.series
      .map((series) => ({ name: series.label, value: category.values[series.key] ?? 0 }))
      .filter((child) => child.value > 0);
    return { name: category.label, value: category.total, children };
  });
}

export interface SankeyData {
  nodes: { name: string }[];
  links: { source: string; target: string; value: number }[];
}

/** Category→series flows (sankey/graph). Names are disambiguated when a
 *  category and a series share a label (sankey nodes must be unique). */
export function sankeyData(result: ChartResult): SankeyData {
  const categoryNames = result.categories.map((category) => category.label);
  const taken = new Set(categoryNames);
  const seriesName = (label: string) => (taken.has(label) ? `${label} ` : label);
  const nodes = [
    ...categoryNames.map((name) => ({ name })),
    ...result.series.map((series) => ({ name: seriesName(series.label) })),
  ];
  const links: SankeyData['links'] = [];
  result.categories.forEach((category, categoryIdx) => {
    result.series.forEach((series) => {
      const value = cell(result, categoryIdx, series.key);
      if (value > 0) links.push({ source: category.label, target: seriesName(series.label), value });
    });
  });
  return { nodes, links };
}

export interface WaterfallSegments { labels: string[]; offsets: number[]; deltas: number[] }

/** Waterfall: per-category totals become floating segments + a final Total. */
export function waterfallSegments(result: ChartResult): WaterfallSegments {
  const labels = result.categories.map((category) => category.label);
  const deltas = result.categories.map((category) => category.total);
  const offsets: number[] = [];
  let running = 0;
  for (const delta of deltas) {
    offsets.push(delta >= 0 ? running : running + delta);
    running += delta;
  }
  labels.push('Total');
  offsets.push(0);
  deltas.push(running);
  return { labels, offsets, deltas };
}

/** Calendar heatmap `[YYYY-MM-DD, value]` pairs (date-keyed categories). */
export function calendarCells(result: ChartResult): [string, number][] {
  return result.categories
    .map((category) => [category.key.slice(0, 10), category.total] as [string, number])
    .filter(([day]) => /^\d{4}-\d{2}-\d{2}$/.test(day));
}
