/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   echartsBuildersCore.ts                             :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 12:00:00 by dlesieur          #+#    #+#             */
/*                                                +#+#+#+#+#+   +#+           */
/* ************************************************************************** */

/**
 * Shared context + option fragments for the ECharts option builders. The
 * builders are pure `(ctx) → option object` functions reading the chart
 * engine's ChartResult, so totals/caps/hidden-groups/server aggregation
 * match the recharts path exactly. No echarts import — DOM-free tests.
 */

import type { ChartResult } from '../../../../lib/chart/chartTypes';
import type { ChartTypeDef } from '../../../../lib/chart/chartTypeRegistry';
import type { ViewSettings } from '../../../../types/database';

export interface BuilderCtx {
  result: ChartResult;
  settings: ViewSettings;
  def: ChartTypeDef;
  colors: readonly string[];
}

/** EChartsOption stays a plain record here — builders are data. */
export type EOption = Record<string, unknown>;

/** Grid metrics shared by every cartesian builder; `extraBottom` absorbs an
 *  extra axis-label line so it cannot collide with legend or axis title. */
function gridFor(settings: ViewSettings, extraBottom = 0): EOption {
  return {
    left: 48, right: 24, top: 24,
    bottom: (settings.showLegend === false ? 28 : 48) + extraBottom,
  };
}

export function baseOption(ctx: BuilderCtx): EOption {
  const { settings, colors } = ctx;
  return {
    color: [...colors],
    tooltip: { trigger: 'axis', confine: true },
    legend: settings.showLegend === false || ctx.result.series.length <= 1
      ? { show: false }
      : { show: true, bottom: 0, type: 'scroll', icon: 'circle' },
    grid: gridFor(settings),
  };
}

const WRAP_LABEL_OVER = 10;

/** A long category name split onto two lines at the space nearest its middle.
 *  Caveat: counts characters, not pixels — a 10-character label in wide glyphs can still
 *  overlap its neighbour; `hideOverlap` stays on as the fallback. */
export function wrapAxisLabel(label: string): string {
  if (label.length <= WRAP_LABEL_OVER) return label;
  const middle = label.length / 2;
  let best = -1;
  let bestDistance = Infinity;
  for (let i = 0; i < label.length; i++) {
    if (label[i] !== ' ') continue;
    const distance = Math.abs(i - middle);
    if (distance < bestDistance) { bestDistance = distance; best = i; }
  }
  if (best < 0) return label;
  return label.slice(0, best) + '\n' + label.slice(best + 1);
}

const ALL_LABELS_UP_TO = 12;
const LABEL_LINE_PX = 14;

/** Category/value axis pair, swapped for the horizontal variants. */
export function axisPair(ctx: BuilderCtx, horizontal: boolean): EOption {
  const { result, settings } = ctx;
  const labels = result.categories.map((category) => category.label);
  const categoryAxis: EOption = {
    type: 'category',
    data: labels,
    name: settings.xAxisTitle, nameLocation: 'middle', nameGap: 32,
    axisLabel: { hideOverlap: true },
  };
  const valueAxis = {
    type: 'value',
    name: settings.yAxisTitle, nameLocation: 'middle', nameGap: 44,
    splitLine: { show: settings.showGridLines !== false },
  };
  if (horizontal) return { xAxis: valueAxis, yAxis: categoryAxis };
  // Vertical: the category axis is xAxis. With `interval: 'auto'` ECharts shows
  // only every other label once names are wider than a category band, so bar
  // readers cannot tell which bar is whose; pin every label up to a dozen
  // categories and let long names wrap onto a second line instead.
  categoryAxis.axisLabel = {
    hideOverlap: true,
    interval: labels.length <= ALL_LABELS_UP_TO ? 0 : 'auto',
    formatter: wrapAxisLabel,
  };
  if (labels.some((label) => wrapAxisLabel(label) !== label)) {
    categoryAxis.nameGap = 32 + LABEL_LINE_PX;
    return { xAxis: categoryAxis, yAxis: valueAxis, grid: gridFor(settings, LABEL_LINE_PX) };
  }
  return { xAxis: categoryAxis, yAxis: valueAxis };
}

export function dataLabel(settings: ViewSettings): EOption {
  return settings.showDataLabels ? { show: true, position: 'top' } : { show: false };
}
