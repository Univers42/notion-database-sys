/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   chartTypePresets.ts                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 12:00:00 by dlesieur          #+#    #+#             */
/*                                                +#+#+#+#+#+   +#+           */
/* ************************************************************************** */

/**
 * The 50+ named chart presets behind the gallery. The first five are the
 * recharts legacy types (untouched render path); the rest dispatch to the
 * ECharts option builders via their `builder` family key. Presets are data,
 * not code — adding one is one line here plus (at most) a builder branch.
 */

import type { ChartTypeDef } from './chartTypeRegistry';

export const CHART_TYPE_PRESETS: readonly ChartTypeDef[] = [
  // ── Legacy recharts five (parity-tested: drilldown, legend, server truth) ──
  { id: 'vertical_bar', label: 'Vertical bar', family: 'bar', engine: 'recharts', builder: 'bar' },
  { id: 'horizontal_bar', label: 'Horizontal bar', family: 'bar', engine: 'recharts', builder: 'bar' },
  { id: 'line', label: 'Line', family: 'line', engine: 'recharts', builder: 'line' },
  { id: 'donut', label: 'Donut', family: 'pie', engine: 'recharts', builder: 'pie' },
  { id: 'number', label: 'Number', family: 'stat', engine: 'recharts', builder: 'stat' },

  // ── Bar family ──────────────────────────────────────────────────────────
  { id: 'grouped_bar', label: 'Grouped bar', family: 'bar', engine: 'echarts', builder: 'bar', needs: { series: true } },
  { id: 'stacked_bar', label: 'Stacked bar', family: 'bar', engine: 'echarts', builder: 'bar', needs: { series: true } },
  { id: 'percent_bar', label: '100% stacked bar', family: 'bar', engine: 'echarts', builder: 'bar', needs: { series: true } },
  { id: 'grouped_bar_h', label: 'Grouped bar (horizontal)', family: 'bar', engine: 'echarts', builder: 'bar', needs: { series: true } },
  { id: 'stacked_bar_h', label: 'Stacked bar (horizontal)', family: 'bar', engine: 'echarts', builder: 'bar', needs: { series: true } },
  { id: 'percent_bar_h', label: '100% stacked bar (horizontal)', family: 'bar', engine: 'echarts', builder: 'bar', needs: { series: true } },
  { id: 'waterfall', label: 'Waterfall', family: 'bar', engine: 'echarts', builder: 'waterfall' },
  { id: 'pictorial_bar', label: 'Pictorial bar', family: 'bar', engine: 'echarts', builder: 'pictorial' },
  { id: 'polar_bar', label: 'Polar bar', family: 'radar', engine: 'echarts', builder: 'polar' },
  { id: 'radial_bar', label: 'Radial bar', family: 'radar', engine: 'echarts', builder: 'radial' },

  // ── Line family ─────────────────────────────────────────────────────────
  { id: 'smooth_line', label: 'Smooth line', family: 'line', engine: 'echarts', builder: 'line' },
  { id: 'step_line', label: 'Step line', family: 'line', engine: 'echarts', builder: 'line' },
  { id: 'multi_line', label: 'Multi line', family: 'line', engine: 'echarts', builder: 'line', needs: { series: true } },
  { id: 'line_markers', label: 'Line with markers', family: 'line', engine: 'echarts', builder: 'line' },

  // ── Area family ─────────────────────────────────────────────────────────
  { id: 'area', label: 'Area', family: 'area', engine: 'echarts', builder: 'line' },
  { id: 'smooth_area', label: 'Smooth area', family: 'area', engine: 'echarts', builder: 'line' },
  { id: 'step_area', label: 'Step area', family: 'area', engine: 'echarts', builder: 'line' },
  { id: 'stacked_area', label: 'Stacked area', family: 'area', engine: 'echarts', builder: 'line', needs: { series: true } },
  { id: 'percent_area', label: '100% stacked area', family: 'area', engine: 'echarts', builder: 'line', needs: { series: true } },
  { id: 'theme_river', label: 'Theme river', family: 'area', engine: 'echarts', builder: 'themeRiver', needs: { series: true, dateX: true } },

  // ── Pie family ──────────────────────────────────────────────────────────
  { id: 'pie', label: 'Pie', family: 'pie', engine: 'echarts', builder: 'pie' },
  { id: 'half_donut', label: 'Half donut', family: 'pie', engine: 'echarts', builder: 'pie' },
  { id: 'rose', label: 'Nightingale rose', family: 'pie', engine: 'echarts', builder: 'pie' },
  { id: 'ring', label: 'Ring', family: 'pie', engine: 'echarts', builder: 'pie' },

  // ── Scatter family ──────────────────────────────────────────────────────
  { id: 'scatter', label: 'Scatter', family: 'scatter', engine: 'echarts', builder: 'scatter' },
  { id: 'bubble', label: 'Bubble', family: 'scatter', engine: 'echarts', builder: 'scatter' },
  { id: 'effect_scatter', label: 'Effect scatter', family: 'scatter', engine: 'echarts', builder: 'scatter' },

  // ── Radar family ────────────────────────────────────────────────────────
  { id: 'radar', label: 'Radar', family: 'radar', engine: 'echarts', builder: 'radar' },
  { id: 'filled_radar', label: 'Filled radar', family: 'radar', engine: 'echarts', builder: 'radar' },

  // ── Heatmap family ──────────────────────────────────────────────────────
  { id: 'heatmap', label: 'Heatmap', family: 'heatmap', engine: 'echarts', builder: 'heatmap', needs: { series: true } },
  { id: 'calendar_heatmap', label: 'Calendar heatmap', family: 'heatmap', engine: 'echarts', builder: 'calendar', needs: { dateX: true } },

  // ── Hierarchy family ────────────────────────────────────────────────────
  { id: 'treemap', label: 'Treemap', family: 'hierarchy', engine: 'echarts', builder: 'treemap' },
  { id: 'sunburst', label: 'Sunburst', family: 'hierarchy', engine: 'echarts', builder: 'sunburst' },

  // ── Flow family ─────────────────────────────────────────────────────────
  { id: 'funnel', label: 'Funnel', family: 'flow', engine: 'echarts', builder: 'funnel' },
  { id: 'pyramid', label: 'Pyramid', family: 'flow', engine: 'echarts', builder: 'funnel' },
  { id: 'sankey', label: 'Sankey', family: 'flow', engine: 'echarts', builder: 'sankey', needs: { series: true } },
  { id: 'chord_graph', label: 'Relation graph', family: 'flow', engine: 'echarts', builder: 'graph', needs: { series: true } },

  // ── Stat family ─────────────────────────────────────────────────────────
  { id: 'gauge', label: 'Gauge', family: 'stat', engine: 'echarts', builder: 'gauge' },
  { id: 'progress_gauge', label: 'Progress gauge', family: 'stat', engine: 'echarts', builder: 'gauge' },
  { id: 'speedometer', label: 'Speedometer', family: 'stat', engine: 'echarts', builder: 'gauge' },

  // ── Special ─────────────────────────────────────────────────────────────
  { id: 'funnel_compare', label: 'Comparison funnel', family: 'flow', engine: 'echarts', builder: 'funnel', needs: { series: true } },
  { id: 'stacked_line', label: 'Stacked line', family: 'line', engine: 'echarts', builder: 'line', needs: { series: true } },
  { id: 'bar_line', label: 'Bar + line combo', family: 'special', engine: 'echarts', builder: 'combo', needs: { series: true } },
  { id: 'donut_rose', label: 'Rose donut', family: 'pie', engine: 'echarts', builder: 'pie' },
  { id: 'gradient_area', label: 'Gradient area', family: 'area', engine: 'echarts', builder: 'line' },
  { id: 'lollipop', label: 'Lollipop', family: 'bar', engine: 'echarts', builder: 'lollipop' },
  { id: 'dot_strip', label: 'Dot strip', family: 'scatter', engine: 'echarts', builder: 'scatter' },
  { id: 'radar_polygon', label: 'Polygon radar', family: 'radar', engine: 'echarts', builder: 'radar' },
  { id: 'compact_columns', label: 'Compact columns', family: 'bar', engine: 'echarts', builder: 'bar' },
  { id: 'thin_bars', label: 'Thin bars', family: 'bar', engine: 'echarts', builder: 'bar' },
];
