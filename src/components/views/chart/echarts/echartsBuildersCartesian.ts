/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   echartsBuildersCartesian.ts                        :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 12:00:00 by dlesieur          #+#    #+#             */
/*                                                +#+#+#+#+#+   +#+           */
/* ************************************************************************** */

// ─── Cartesian builders: bar, line/area, scatter, combo, lollipop ───────────

import { matrixGrid, percentGrid } from '../../../../lib/chart/chartEchartsData';
import { baseOption, axisPair, dataLabel, type BuilderCtx, type EOption } from './echartsBuildersCore';

export function buildBar(ctx: BuilderCtx): EOption {
  const { result, settings, def } = ctx;
  const horizontal = def.id.endsWith('_h');
  const percent = def.id.startsWith('percent');
  const stacked = percent || def.id.startsWith('stacked');
  const grid = percent ? percentGrid(result) : matrixGrid(result);
  return {
    ...baseOption(ctx),
    ...axisPair(ctx, horizontal),
    series: result.series.map((series, index) => ({
      name: series.label, type: 'bar',
      stack: stacked ? 'total' : undefined,
      data: grid[index],
      barWidth: def.id === 'thin_bars' ? '30%' : undefined,
      barCategoryGap: def.id === 'compact_columns' ? '10%' : undefined,
      itemStyle: { color: series.color || undefined, borderRadius: settings.roundedBars === false ? 0 : 3 },
      label: dataLabel(settings),
    })),
  };
}

export function buildLine(ctx: BuilderCtx): EOption {
  const { result, settings, def } = ctx;
  const grid = def.id === 'percent_area' ? percentGrid(result) : matrixGrid(result);
  const isArea = ['area', 'smooth_area', 'step_area', 'stacked_area', 'percent_area', 'gradient_area'].includes(def.id);
  return {
    ...baseOption(ctx),
    ...axisPair(ctx, false),
    series: result.series.map((series, index) => ({
      name: series.label, type: 'line',
      smooth: def.id.includes('smooth') || settings.smoothLine === true,
      step: def.id.includes('step') ? 'middle' : undefined,
      stack: ['stacked_area', 'percent_area', 'stacked_line'].includes(def.id) ? 'total' : undefined,
      showSymbol: def.id === 'line_markers',
      data: grid[index],
      itemStyle: { color: series.color || undefined },
      areaStyle: isArea
        ? { opacity: def.id === 'gradient_area' || settings.gradientFill === true ? 0.6 : 0.25 }
        : undefined,
      label: dataLabel(settings),
    })),
  };
}

export function buildScatter(ctx: BuilderCtx): EOption {
  const { result, def } = ctx;
  const grid = matrixGrid(result);
  const max = Math.max(1, ...grid.flat());
  return {
    ...baseOption(ctx),
    tooltip: { trigger: 'item', confine: true },
    ...axisPair(ctx, false),
    series: result.series.map((series, index) => ({
      name: series.label,
      type: def.id === 'effect_scatter' ? 'effectScatter' : 'scatter',
      data: grid[index].map((value, col) => [col, value]),
      symbolSize: def.id === 'bubble'
        ? (point: number[]) => 8 + (point[1] / max) * 32
        : (def.id === 'dot_strip' ? 7 : 12),
      itemStyle: { color: series.color || undefined, opacity: 0.85 },
    })),
  };
}

export function buildCombo(ctx: BuilderCtx): EOption {
  const grid = matrixGrid(ctx.result);
  return {
    ...baseOption(ctx),
    ...axisPair(ctx, false),
    series: ctx.result.series.map((series, index) => ({
      name: series.label,
      type: index === 0 ? 'bar' : 'line',
      smooth: true,
      data: grid[index],
      itemStyle: { color: series.color || undefined, borderRadius: 3 },
    })),
  };
}

export function buildLollipop(ctx: BuilderCtx): EOption {
  const totals = ctx.result.categories.map((category) => category.total);
  return {
    ...baseOption(ctx),
    legend: { show: false },
    ...axisPair(ctx, false),
    series: [
      { type: 'bar', barWidth: 3, data: totals, itemStyle: { borderRadius: 2 } },
      { type: 'scatter', symbolSize: 12, data: totals, tooltip: { show: false } },
    ],
  };
}
