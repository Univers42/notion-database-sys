/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ChartLine.tsx                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/10 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { ChartResult } from '../../../lib/chart/chartTypes';
import type { ViewSettings } from '../../../types/database';
import { toRechartsRows } from '../../../lib/chart/chartEngine';
import { colorAt } from './chartPalette';
import { ChartTooltipContent } from './ChartTooltipContent';
import { yAxisDomain } from './ChartCanvasHelpers';
import type { BarsClick } from './ChartBars';

/** Line chart (multi-series for breakdowns, gradient area fill optional). */
export function ChartLineChart({ result, settings, onSliceClick }: Readonly<{
  result: ChartResult;
  settings: ViewSettings;
  onSliceClick: (click: BarsClick) => void;
}>) {
  const rows = toRechartsRows(result);
  const lineType = settings.smoothLine ? 'monotone' : 'linear';
  const domain = yAxisDomain(settings);
  const refLine = settings.showReferenceLine && settings.referenceLineValue != null;
  const gradient = !!settings.gradientFill;

  const handleClick = (state: unknown) => {
    const s = state as { activeTooltipIndex?: number | string; activePayload?: { dataKey?: unknown }[] } | null;
    const idx = Number(s?.activeTooltipIndex);
    if (Number.isNaN(idx)) return;
    const dataKey = s?.activePayload?.[0]?.dataKey;
    const seriesKey = typeof dataKey === 'string' ? dataKey : result.series[0]?.key;
    if (seriesKey) onSliceClick({ categoryIndex: idx, seriesKey });
  };

  return (
    <ResponsiveContainer width="100%" height="100%" minHeight={120} debounce={50}>
      <ComposedChart data={rows} margin={{ top: 12, right: 16, bottom: 8, left: 8 }}
        onClick={handleClick} style={{ cursor: 'pointer' }}>
        {gradient && (
          <defs>
            {result.series.map((s, i) => {
              const color = s.color || colorAt(settings.colorPalette, i);
              return (
                <linearGradient key={s.key} id={`chart-grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.02} />
                </linearGradient>
              );
            })}
          </defs>
        )}
        {settings.showGridLines !== false && (
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid, #e5e5e5)" vertical={false} />
        )}
        <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd"
          label={settings.xAxisTitle ? { value: settings.xAxisTitle, position: 'insideBottom', offset: -4, fontSize: 11 } : undefined} />
        <YAxis tick={{ fontSize: 11 }} domain={domain} allowDataOverflow={!!domain}
          label={settings.yAxisTitle ? { value: settings.yAxisTitle, angle: -90, position: 'insideLeft', fontSize: 11 } : undefined} />
        <Tooltip content={<ChartTooltipContent />} />
        {refLine && (
          <ReferenceLine y={settings.referenceLineValue as number}
            stroke="var(--color-chart-ref, #e0563b)" strokeDasharray="4 4" />
        )}
        {result.series.map((s, i) => {
          const color = s.color || colorAt(settings.colorPalette, i);
          if (gradient) {
            return (
              <Area key={s.key} dataKey={s.key} name={s.label} type={lineType}
                stroke={color} strokeWidth={2} fill={`url(#chart-grad-${s.key})`}
                dot={false} activeDot={{ r: 5 }} isAnimationActive={false} />
            );
          }
          return (
            <Line key={s.key} dataKey={s.key} name={s.label} type={lineType}
              stroke={color} strokeWidth={2} dot={{ r: 2.5, fill: color }}
              activeDot={{ r: 5 }} isAnimationActive={false} />
          );
        })}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
