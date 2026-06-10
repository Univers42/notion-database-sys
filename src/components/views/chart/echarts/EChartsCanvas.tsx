/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   EChartsCanvas.tsx                                  :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 12:00:00 by dlesieur          #+#    #+#             */
/*                                                +#+#+#+#+#+   +#+           */
/* ************************************************************************** */

/**
 * The extended chart renderer: one ECharts instance over the shared chart
 * engine output. Tree-shaken `echarts/core` + SVG renderer only — this file
 * sits behind React.lazy in ChartView so the whole echarts chunk loads only
 * when an extended chart type is actually selected (recharts keeps its own
 * separate lazy chunk for the legacy five).
 */

import React from 'react';
import * as echarts from 'echarts/core';
import {
  BarChart, LineChart, PieChart, ScatterChart, EffectScatterChart,
  RadarChart, HeatmapChart, TreemapChart, SunburstChart, FunnelChart,
  SankeyChart, GraphChart, GaugeChart, ThemeRiverChart, PictorialBarChart,
} from 'echarts/charts';
import {
  GridComponent, TooltipComponent, LegendComponent, PolarComponent,
  VisualMapComponent, CalendarComponent, SingleAxisComponent,
} from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';
import { getChartTypeDef } from '../../../../lib/chart/chartTypeRegistry';
import { paletteColors } from '../chartPalette';
import { heightFor } from '../ChartCanvasHelpers';
import { buildEChartsOption } from './echartsBuilderRegistry';
import { registerChartInstance } from './echartsInstanceRegistry';
import type { ChartResult } from '../../../../lib/chart/chartTypes';
import type { ViewSettings } from '../../../../types/database';

echarts.use([
  BarChart, LineChart, PieChart, ScatterChart, EffectScatterChart,
  RadarChart, HeatmapChart, TreemapChart, SunburstChart, FunnelChart,
  SankeyChart, GraphChart, GaugeChart, ThemeRiverChart, PictorialBarChart,
  GridComponent, TooltipComponent, LegendComponent, PolarComponent,
  VisualMapComponent, CalendarComponent, SingleAxisComponent, SVGRenderer,
]);

export interface EChartsCanvasProps {
  viewId: string;
  result: ChartResult;
  settings: ViewSettings;
}

/** Mounts/updates one ECharts instance for the view's chart settings. */
export default function EChartsCanvas({ viewId, result, settings }: Readonly<EChartsCanvasProps>) {
  const hostRef = React.useRef<HTMLDivElement>(null);
  const chartRef = React.useRef<echarts.ECharts | null>(null);

  React.useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    const chart = echarts.init(host, undefined, { renderer: 'svg' });
    chartRef.current = chart;
    const unregister = registerChartInstance(viewId, chart);
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(host);
    return () => {
      observer.disconnect();
      unregister();
      chart.dispose();
      chartRef.current = null;
    };
  }, [viewId]);

  React.useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const def = getChartTypeDef(settings.chartType);
    const option = buildEChartsOption({
      result, settings, def, colors: paletteColors(settings.colorPalette),
    });
    chart.setOption(option as Parameters<typeof chart.setOption>[0], { notMerge: true });
  }, [result, settings]);

  return (
    <div className="flex-1 min-h-0 bg-surface-primary p-2" data-chart-export-root data-engine="echarts">
      <div ref={hostRef} style={{ width: '100%', height: heightFor(settings) }} role="img" aria-label="Chart" />
    </div>
  );
}
