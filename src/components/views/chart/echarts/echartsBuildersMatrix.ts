/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   echartsBuildersMatrix.ts                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 12:00:00 by dlesieur          #+#    #+#             */
/*                                                +#+#+#+#+#+   +#+           */
/* ************************************************************************** */

// ─── Matrix/density builders: heatmap, calendar, hierarchy, river, pictorial ─

import {
  heatmapCells, hierarchyData, calendarCells,
} from '../../../../lib/chart/chartEchartsData';
import { baseOption, axisPair, type BuilderCtx, type EOption } from './echartsBuildersCore';

export function buildHeatmap(ctx: BuilderCtx): EOption {
  const { result } = ctx;
  const { cells, max } = heatmapCells(result);
  return {
    ...baseOption(ctx),
    legend: { show: false },
    tooltip: { position: 'top', confine: true },
    grid: { left: 90, right: 24, top: 24, bottom: 64 },
    xAxis: { type: 'category', data: result.categories.map((category) => category.label), splitArea: { show: true } },
    yAxis: { type: 'category', data: result.series.map((series) => series.label), splitArea: { show: true } },
    visualMap: { min: 0, max: Math.max(1, max), calculable: true, orient: 'horizontal', left: 'center', bottom: 4 },
    series: [{ type: 'heatmap', data: cells, label: { show: ctx.settings.showDataLabels === true } }],
  };
}

export function buildCalendar(ctx: BuilderCtx): EOption {
  const cells = calendarCells(ctx.result);
  const years = [...new Set(cells.map(([day]) => day.slice(0, 4)))].sort((a, b) => b.localeCompare(a));
  const year = years[0] ?? String(new Date().getFullYear());
  const yearCells = cells.filter(([day]) => day.startsWith(year));
  return {
    color: [...ctx.colors],
    tooltip: { confine: true },
    visualMap: {
      min: 0, max: Math.max(1, ...yearCells.map(([, value]) => value)),
      orient: 'horizontal', left: 'center', bottom: 4,
    },
    calendar: { range: year, cellSize: ['auto', 14], top: 32 },
    series: [{ type: 'heatmap', coordinateSystem: 'calendar', data: yearCells }],
  };
}

export function buildHierarchy(ctx: BuilderCtx): EOption {
  const data = hierarchyData(ctx.result);
  return {
    color: [...ctx.colors],
    tooltip: { confine: true },
    series: [ctx.def.builder === 'sunburst'
      ? { type: 'sunburst', data, radius: [0, '85%'], label: { rotate: 'radial' } }
      : { type: 'treemap', data, roam: false, breadcrumb: { show: false }, label: { show: true, formatter: '{b}' } }],
  };
}

export function buildThemeRiver(ctx: BuilderCtx): EOption {
  const { result } = ctx;
  const data: [string, number, string][] = [];
  for (const category of result.categories) {
    for (const series of result.series) {
      data.push([category.key.slice(0, 10), category.values[series.key] ?? 0, series.label]);
    }
  }
  return {
    color: [...ctx.colors],
    tooltip: { trigger: 'axis', confine: true },
    singleAxis: { type: 'time', bottom: 40 },
    series: [{ type: 'themeRiver', data }],
  };
}

export function buildPictorial(ctx: BuilderCtx): EOption {
  return {
    ...baseOption(ctx),
    legend: { show: false },
    ...axisPair(ctx, false),
    series: [{
      type: 'pictorialBar', symbol: 'roundRect', symbolRepeat: true,
      symbolSize: [18, 5], symbolMargin: 2,
      data: ctx.result.categories.map((category) => category.total),
    }],
  };
}
