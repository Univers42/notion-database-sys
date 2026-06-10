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

export function baseOption(ctx: BuilderCtx): EOption {
  const { settings, colors } = ctx;
  return {
    color: [...colors],
    tooltip: { trigger: 'axis', confine: true },
    legend: settings.showLegend === false || ctx.result.series.length <= 1
      ? { show: false }
      : { show: true, bottom: 0, type: 'scroll', icon: 'circle' },
    grid: { left: 48, right: 24, top: 24, bottom: settings.showLegend === false ? 28 : 48 },
  };
}

/** Category/value axis pair, swapped for the horizontal variants. */
export function axisPair(ctx: BuilderCtx, horizontal: boolean): EOption {
  const { result, settings } = ctx;
  const categoryAxis = {
    type: 'category',
    data: result.categories.map((category) => category.label),
    name: settings.xAxisTitle, nameLocation: 'middle', nameGap: 32,
    axisLabel: { hideOverlap: true },
  };
  const valueAxis = {
    type: 'value',
    name: settings.yAxisTitle, nameLocation: 'middle', nameGap: 44,
    splitLine: { show: settings.showGridLines !== false },
  };
  return horizontal
    ? { xAxis: valueAxis, yAxis: categoryAxis }
    : { xAxis: categoryAxis, yAxis: valueAxis };
}

export function dataLabel(settings: ViewSettings): EOption {
  return settings.showDataLabels ? { show: true, position: 'top' } : { show: false };
}
