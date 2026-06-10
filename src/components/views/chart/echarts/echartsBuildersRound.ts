/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   echartsBuildersRound.ts                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 12:00:00 by dlesieur          #+#    #+#             */
/*                                                +#+#+#+#+#+   +#+           */
/* ************************************************************************** */

// ─── Round builders: pie variants, radar, polar/radial bar, gauges ──────────

import { matrixGrid } from '../../../../lib/chart/chartEchartsData';
import { baseOption, type BuilderCtx, type EOption } from './echartsBuildersCore';

export function buildPie(ctx: BuilderCtx): EOption {
  const { result, settings, def } = ctx;
  const half = def.id === 'half_donut';
  const ringish = ['donut', 'ring', 'half_donut', 'donut_rose'].includes(def.id);
  return {
    ...baseOption(ctx),
    tooltip: { trigger: 'item', confine: true },
    series: [{
      type: 'pie',
      radius: ringish ? ['52%', '78%'] : [0, '78%'],
      center: ['50%', half ? '70%' : '50%'],
      startAngle: half ? 180 : 90,
      endAngle: half ? 360 : 'auto',
      roseType: def.id === 'rose' || def.id === 'donut_rose' ? 'radius' : undefined,
      data: result.categories.map((category) => ({
        name: category.label, value: category.total,
        itemStyle: category.color ? { color: category.color } : undefined,
      })),
      label: { show: settings.showDataLabels !== false, formatter: '{b}: {c}' },
    }],
  };
}

export function buildRadar(ctx: BuilderCtx): EOption {
  const { result, def } = ctx;
  const grid = matrixGrid(result);
  const max = Math.max(1, ...grid.flat());
  return {
    ...baseOption(ctx),
    tooltip: { trigger: 'item', confine: true },
    radar: {
      indicator: result.categories.map((category) => ({ name: category.label, max: max * 1.1 })),
      shape: def.id === 'radar_polygon' ? 'polygon' : 'circle',
    },
    series: [{
      type: 'radar',
      data: result.series.map((series, index) => ({
        name: series.label, value: grid[index],
        areaStyle: def.id === 'filled_radar' ? { opacity: 0.3 } : undefined,
      })),
    }],
  };
}

export function buildPolar(ctx: BuilderCtx): EOption {
  const { result, def } = ctx;
  const radial = def.builder === 'radial';
  const totals = result.categories.map((category) => category.total);
  const labels = result.categories.map((category) => category.label);
  return {
    ...baseOption(ctx),
    legend: { show: false },
    tooltip: { trigger: 'item', confine: true },
    polar: { radius: ['12%', '82%'] },
    angleAxis: radial ? { max: Math.max(1, ...totals) * 1.15, startAngle: 90 } : { type: 'category', data: labels },
    radiusAxis: radial ? { type: 'category', data: labels } : {},
    series: [{ type: 'bar', coordinateSystem: 'polar', data: totals, itemStyle: { borderRadius: 3 } }],
  };
}

export function buildGauge(ctx: BuilderCtx): EOption {
  const { result, settings, def } = ctx;
  const value = result.total;
  const max = settings.yAxisRange === 'custom' && settings.yAxisRangeMax
    ? settings.yAxisRangeMax
    : Math.max(1, Math.ceil(value * 1.25));
  const progress = def.id === 'progress_gauge';
  const speedo = def.id === 'speedometer';
  return {
    color: [...ctx.colors],
    series: [{
      type: 'gauge', min: 0, max,
      startAngle: progress ? 90 : 220, endAngle: progress ? -270 : -40,
      progress: { show: true, roundCap: true, width: progress ? 14 : 8 },
      pointer: { show: speedo },
      axisTick: { show: speedo },
      splitLine: { show: speedo },
      axisLabel: { show: speedo },
      detail: { valueAnimation: true, fontSize: 28, offsetCenter: [0, progress ? 0 : '30%'] },
      data: [{ value, name: settings.yAxisTitle ?? '' }],
    }],
  };
}
