/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   conditionalColor.ts                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 12:00:00 by dlesieur          #+#    #+#             */
/*                                                +#+#+#+#+#+   +#+           */
/* ************************************************************************** */

/**
 * Conditional color: a rule is literally a Filter plus a color token —
 * evaluation reuses evaluateFilter verbatim, FIRST matching rule wins.
 * Tokens carry three renditions: `tint` (translucent row background),
 * `accent` (card edge bar) and `chart` (category/series fill), so every
 * surface stays readable on light and dark themes.
 */

import type { ConditionalColorRule } from '@notion-db/contract-types';
import type { ChartResult } from './chart/chartTypes';
import type { Page, SchemaProperty } from '../component/types';
import type { ViewSettings } from '../types/database';
import { evaluateFilter } from './filter/evaluateFilter';

export interface ConditionalColorToken {
  id: string;
  label: string;
  chart: string;
  tint: string;
  accent: string;
}

export const CONDITIONAL_COLOR_TOKENS: readonly ConditionalColorToken[] = [
  { id: 'gray',   label: 'Gray',   chart: '#64748b', tint: 'rgba(100,116,139,0.14)', accent: '#94a3b8' },
  { id: 'red',    label: 'Red',    chart: '#e03131', tint: 'rgba(224,49,49,0.12)',   accent: '#e03131' },
  { id: 'orange', label: 'Orange', chart: '#e8590c', tint: 'rgba(232,89,12,0.12)',   accent: '#e8590c' },
  { id: 'yellow', label: 'Yellow', chart: '#f59f00', tint: 'rgba(245,159,0,0.14)',   accent: '#f59f00' },
  { id: 'green',  label: 'Green',  chart: '#0f9d58', tint: 'rgba(15,157,88,0.12)',   accent: '#0f9d58' },
  { id: 'blue',   label: 'Blue',   chart: '#2383e2', tint: 'rgba(35,131,226,0.12)',  accent: '#2383e2' },
  { id: 'purple', label: 'Purple', chart: '#7048e8', tint: 'rgba(112,72,232,0.12)',  accent: '#7048e8' },
  { id: 'pink',   label: 'Pink',   chart: '#e64980', tint: 'rgba(230,73,128,0.12)',  accent: '#e64980' },
];

export function conditionalColorToken(id: string | null | undefined): ConditionalColorToken | null {
  if (!id) return null;
  return CONDITIONAL_COLOR_TOKENS.find((token) => token.id === id) ?? null;
}

/** Token of the FIRST rule the page matches, or null. Select-ish rule values
 *  are option IDS (the editor stores them) while some sources keep RAW labels
 *  in the cells (workspace/live tables) — both spellings are tried, mirroring
 *  applyGlobalFilters' label matching. */
export function colorForPage(
  page: Page,
  rules: readonly ConditionalColorRule[] | undefined,
  properties: Record<string, SchemaProperty>,
): ConditionalColorToken | null {
  for (const rule of rules ?? []) {
    const property = properties[rule.propertyId];
    if (!property) continue;
    const filter = { id: rule.id, propertyId: rule.propertyId, operator: rule.operator, value: rule.value };
    if (evaluateFilter(page, filter, property)) return conditionalColorToken(rule.color);
    const option = property.options?.find((candidate) => candidate.id === rule.value);
    if (option && option.value !== rule.value
      && evaluateFilter(page, { ...filter, value: option.value }, property)) {
      return conditionalColorToken(rule.color);
    }
  }
  return null;
}

/** `equals` rules keyed by their value — option id or literal — for the
 *  category/series color override (only equality is meaningful per group). */
function equalsColorMap(
  rules: readonly ConditionalColorRule[] | undefined,
  propertyId: string | undefined,
  property: SchemaProperty | undefined,
): Map<string, string> {
  const map = new Map<string, string>();
  if (!propertyId) return map;
  for (const rule of rules ?? []) {
    if (rule.propertyId !== propertyId || rule.operator !== 'equals') continue;
    const token = conditionalColorToken(rule.color);
    if (!token || typeof rule.value !== 'string') continue;
    if (!map.has(rule.value)) map.set(rule.value, token.chart);
    const option = property?.options?.find((candidate) => candidate.id === rule.value);
    if (option && !map.has(option.value)) map.set(option.value, token.chart);
  }
  return map;
}

/** ChartResult with conditional category/series colors injected (the canvas
 *  already prefers `color` over the palette: `c.color || colorAt(...)`). */
export function applyConditionalChartColors(
  result: ChartResult,
  settings: ViewSettings,
  properties: Record<string, SchemaProperty>,
): ChartResult {
  const rules = settings.conditionalColors;
  if (!rules || rules.length === 0) return result;
  const categoryColors = equalsColorMap(rules, settings.xAxisProperty, properties[settings.xAxisProperty ?? '']);
  const seriesColors = equalsColorMap(rules, settings.yAxisGroupBy, properties[settings.yAxisGroupBy ?? '']);
  if (categoryColors.size === 0 && seriesColors.size === 0) return result;
  return {
    ...result,
    categories: result.categories.map((category) => {
      const color = categoryColors.get(category.key) ?? categoryColors.get(category.label);
      return color ? { ...category, color } : category;
    }),
    series: result.series.map((series) => {
      const color = seriesColors.get(series.key) ?? seriesColors.get(series.label);
      return color ? { ...series, color } : series;
    }),
  };
}
