/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   echartsBuilderRegistry.ts                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 12:00:00 by dlesieur          #+#    #+#             */
/*                                                +#+#+#+#+#+   +#+           */
/* ************************************************************************** */

// ─── Builder dispatch: ChartTypeDef.builder → option builder ────────────────

import type { BuilderCtx, EOption } from './echartsBuildersCore';
import { buildBar, buildLine, buildScatter, buildCombo, buildLollipop } from './echartsBuildersCartesian';
import { buildPie, buildRadar, buildPolar, buildGauge } from './echartsBuildersRound';
import { buildHeatmap, buildCalendar, buildHierarchy, buildThemeRiver, buildPictorial } from './echartsBuildersMatrix';
import { buildFunnel, buildSankey, buildGraph, buildWaterfall } from './echartsBuildersFlow';

const BUILDERS: Record<string, (ctx: BuilderCtx) => EOption> = {
  bar: buildBar, line: buildLine, scatter: buildScatter,
  combo: buildCombo, lollipop: buildLollipop,
  pie: buildPie, radar: buildRadar, polar: buildPolar, radial: buildPolar, gauge: buildGauge,
  heatmap: buildHeatmap, calendar: buildCalendar,
  treemap: buildHierarchy, sunburst: buildHierarchy,
  themeRiver: buildThemeRiver, pictorial: buildPictorial,
  funnel: buildFunnel, sankey: buildSankey, graph: buildGraph, waterfall: buildWaterfall,
};

/** Option for a builder ctx (bar fallback keeps unknown builders renderable). */
export function buildEChartsOption(ctx: BuilderCtx): EOption {
  return (BUILDERS[ctx.def.builder] ?? buildBar)(ctx);
}
