/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ChartCanvasHelpers.ts                              :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/10 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── ChartCanvasHelpers — shared pure helpers for chart components ──────────

import type { ChartResult } from '../../../lib/chart/chartTypes';
import { VALUE_SERIES_KEY } from '../../../lib/chart/chartTypes';
import type { ViewSettings } from '../../../types/database';
import { colorAt } from './chartPalette';
import type { LegendItem } from './ChartLegend';

/** Chart heights for the S/M/L/XL setting (Notion parity). */
const HEIGHTS: Record<string, number> = { small: 240, medium: 320, large: 420, xl: 560 };

/** Resolves the pixel height for a chart from its settings. */
export function heightFor(settings: ViewSettings): number {
  return HEIGHTS[settings.chartHeight ?? 'medium'] ?? HEIGHTS.medium;
}

/** Y-axis domain from the range setting ('auto' parts let recharts decide). */
export function yAxisDomain(
  settings: ViewSettings,
): [number | 'auto', number | 'auto'] | undefined {
  switch (settings.yAxisRange) {
    case '0-100': return [0, 100];
    case '0-1000': return [0, 1000];
    case 'custom': return [settings.yAxisRangeMin ?? 0, settings.yAxisRangeMax ?? 'auto'];
    default: return undefined;
  }
}

/** True when the result has no breakdown (one synthetic 'value' series). */
export function isSingleSeries(result: ChartResult): boolean {
  return result.series.length === 1 && result.series[0].key === VALUE_SERIES_KEY;
}

/**
 * Builds the legend: visible groups (series in breakdown mode, categories
 * otherwise) plus the currently hidden ones so they can be re-enabled.
 */
export function legendItems(
  result: ChartResult,
  settings: ViewSettings,
  hiddenLabelFor: (key: string) => string,
): LegendItem[] {
  const palette = settings.colorPalette;
  const visible: LegendItem[] = isSingleSeries(result)
    ? result.categories.map((c, i) => ({
      key: c.key, label: c.label, color: c.color || colorAt(palette, i), hidden: false,
    }))
    : result.series.map((s, i) => ({
      key: s.key, label: s.label, color: s.color || colorAt(palette, i), hidden: false,
    }));
  const visibleKeys = new Set(visible.map(v => v.key));
  const hidden: LegendItem[] = (settings.hiddenGroups ?? [])
    .filter(key => !visibleKeys.has(key))
    .map(key => ({ key, label: hiddenLabelFor(key), color: '', hidden: true }));
  return [...visible, ...hidden];
}
