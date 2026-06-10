/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ChartBars.tsx                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/10 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList, ReferenceLine,
} from 'recharts';
import type { ChartResult } from '../../../lib/chart/chartTypes';
import { VALUE_SERIES_KEY } from '../../../lib/chart/chartTypes';
import type { ViewSettings } from '../../../types/database';
import { toRechartsRows } from '../../../lib/chart/chartEngine';
import { colorAt, valueShade } from './chartPalette';
import { ChartTooltipContent } from './ChartTooltipContent';
import { yAxisDomain } from './ChartCanvasHelpers';

export interface BarsClick { categoryIndex: number; seriesKey: string }

/** Per-bar fill: option color → palette index → value shading when enabled. */
function categoryFill(
  result: ChartResult,
  settings: ViewSettings,
  index: number,
): string {
  const cat = result.categories[index];
  if (settings.colorByValue) {
    const max = Math.max(...result.categories.map(c => c.total), 1);
    return valueShade(settings.colorPalette, cat.total / max);
  }
  return colorAt(settings.colorPalette, index);
}

/** Vertical/horizontal (stacked) bar chart with drilldown clicks. */
export function ChartBarsChart({ result, settings, horizontal, onSliceClick }: Readonly<{
  result: ChartResult;
  settings: ViewSettings;
  horizontal: boolean;
  onSliceClick: (click: BarsClick) => void;
}>) {
  const rows = toRechartsRows(result);
  const single = result.series.length === 1 && result.series[0].key === VALUE_SERIES_KEY;
  const radius = settings.roundedBars !== false ? 6 : 0;
  const domain = yAxisDomain(settings);
  const grid = settings.showGridLines !== false;
  const refLine = settings.showReferenceLine && settings.referenceLineValue != null;

  // Per-Bar clicks give the exact stacked segment; the chart-level handler is
  // the fallback (recharts item events have proven flaky across versions).
  const barHandled = useRef(false);
  const chartClick = (state: unknown) => {
    if (barHandled.current) { barHandled.current = false; return; }
    const s = state as { activeTooltipIndex?: number | string } | null;
    const idx = Number(s?.activeTooltipIndex);
    if (Number.isNaN(idx) || !result.series.length) return;
    onSliceClick({ categoryIndex: idx, seriesKey: result.series[0].key });
  };

  const categoryAxis = (
    <XAxis dataKey="label" type="category" tick={{ fontSize: 11 }} interval="preserveStartEnd"
      label={settings.xAxisTitle ? { value: settings.xAxisTitle, position: 'insideBottom', offset: -4, fontSize: 11 } : undefined} />
  );
  const valueAxis = (
    <YAxis type="number" tick={{ fontSize: 11 }} domain={domain} allowDataOverflow={!!domain}
      label={settings.yAxisTitle ? { value: settings.yAxisTitle, angle: -90, position: 'insideLeft', fontSize: 11 } : undefined} />
  );

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} layout={horizontal ? 'vertical' : 'horizontal'}
        margin={{ top: 12, right: 16, bottom: 8, left: 8 }}
        onClick={chartClick} style={{ cursor: 'pointer' }}>
        {grid && <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid, #e5e5e5)"
          horizontal={!horizontal} vertical={horizontal} />}
        {horizontal
          ? <XAxis type="number" tick={{ fontSize: 11 }} domain={domain} allowDataOverflow={!!domain} />
          : categoryAxis}
        {horizontal
          ? <YAxis dataKey="label" type="category" tick={{ fontSize: 11 }} width={110} />
          : valueAxis}
        <Tooltip content={<ChartTooltipContent />} cursor={{ fill: 'var(--color-chart-cursor, rgba(0,0,0,0.04))' }} />
        {refLine && (
          horizontal
            ? <ReferenceLine x={settings.referenceLineValue as number} stroke="var(--color-chart-ref, #e0563b)" strokeDasharray="4 4" />
            : <ReferenceLine y={settings.referenceLineValue as number} stroke="var(--color-chart-ref, #e0563b)" strokeDasharray="4 4" />
        )}
        {result.series.map((s, si) => {
          const isTop = si === result.series.length - 1;
          const barRadius: [number, number, number, number] = !isTop ? [0, 0, 0, 0]
            : horizontal ? [0, radius, radius, 0] : [radius, radius, 0, 0];
          return (
            <Bar key={s.key} dataKey={s.key} name={s.label}
              stackId={single ? undefined : 'stack'}
              fill={single ? undefined : (s.color || colorAt(settings.colorPalette, si))}
              radius={barRadius} isAnimationActive={false} maxBarSize={64}
              onClick={(_, index) => {
                barHandled.current = true;
                onSliceClick({ categoryIndex: index, seriesKey: s.key });
              }}
              cursor="pointer">
              {single && rows.map((_, i) => (
                <Cell key={result.categories[i].key} fill={categoryFill(result, settings, i)} />
              ))}
              {settings.showDataLabels && isTop && (
                <LabelList dataKey={s.key} position={horizontal ? 'right' : 'top'} fontSize={10}
                  formatter={(v: React.ReactNode) => (typeof v === 'number' && v !== 0 ? v.toLocaleString() : '')} />
              )}
            </Bar>
          );
        })}
      </BarChart>
    </ResponsiveContainer>
  );
}
