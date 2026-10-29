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
  ResponsiveContainer, Cell, LabelList, ReferenceLine, Text,
  type XAxisTickContentProps,
} from 'recharts';
import type { ChartResult } from '../../../lib/chart/chartTypes';
import { VALUE_SERIES_KEY } from '../../../lib/chart/chartTypes';
import type { ViewSettings } from '../../../types/database';
import { toRechartsRows } from '../../../lib/chart/chartEngine';
import { colorAt, valueShade } from './chartPalette';
import { ChartTooltipContent } from './ChartTooltipContent';
import { yAxisDomain } from './ChartCanvasHelpers';
import { categoryAxisWidth, prefersHorizontalBars } from './chartLayout';

export interface BarsClick { categoryIndex: number; seriesKey: string }

const AXIS_TICK = { fontSize: 11, fill: 'var(--color-chart-label)' };

/** Every category keeps its label, wrapped to two lines inside its band (Text
 *  measures it); recharts' default dropped every other label once they
 *  collided. prefersHorizontalBars switches orientation before a label gets
 *  cut, so the ellipsis is only a last resort. */
function fittedCategoryTick(horizontal: boolean) {
  return function CategoryTick(p: Omit<XAxisTickContentProps, 'orientation' | 'padding'>) {
    const axis = Number(p.width) || 0;
    const band = horizontal ? axis - 8 : axis / Math.max(1, p.visibleTicksCount) - 6;
    return (
      <Text x={p.x} y={p.y} textAnchor={p.textAnchor} verticalAnchor={p.verticalAnchor}
        width={Math.max(band, 12)} maxLines={2} lineHeight={12} {...AXIS_TICK}>
        {String(p.payload.value ?? '')}
      </Text>
    );
  };
}

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
  return cat.color || colorAt(settings.colorPalette, index);
}

/** Vertical/horizontal (stacked) bar chart with drilldown clicks. */
export function ChartBarsChart({ result, settings, horizontal: requestedHorizontal, width = 0, compact = false, onSliceClick }: Readonly<{
  result: ChartResult;
  settings: ViewSettings;
  horizontal: boolean;
  /** Plot width in px; drives the label-fit orientation switch. */
  width?: number;
  /** Inside a dashboard widget: the card title replaces axis titles. */
  compact?: boolean;
  onSliceClick: (click: BarsClick) => void;
}>) {
  const labels = result.categories.map(c => c.label);
  const horizontal = prefersHorizontalBars(labels, width, requestedHorizontal);
  const axisWidth = categoryAxisWidth(labels, width);
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
    <XAxis dataKey="label" type="category" tick={fittedCategoryTick(false)} interval={0}
      tickLine={false} axisLine={{ stroke: 'var(--color-chart-grid)' }}
      label={settings.xAxisTitle && !compact ? { value: settings.xAxisTitle, position: 'insideBottom', offset: -4, fontSize: 11 } : undefined} />
  );
  const valueAxis = (
    <YAxis type="number" tick={AXIS_TICK} domain={domain} allowDataOverflow={!!domain}
      tickLine={false} axisLine={false}
      label={settings.yAxisTitle && !compact ? { value: settings.yAxisTitle, angle: -90, position: 'insideLeft', fontSize: 11 } : undefined} />
  );

  return (
    <ResponsiveContainer width="100%" height="100%" minHeight={120} debounce={50}>
      <BarChart data={rows} layout={horizontal ? 'vertical' : 'horizontal'}
        margin={{ top: 12, right: 16, bottom: 8, left: 8 }}
        onClick={chartClick} style={{ cursor: 'pointer' }}>
        {grid && <CartesianGrid stroke="var(--color-chart-grid)"
          horizontal={!horizontal} vertical={horizontal} />}
        {horizontal
          ? <XAxis type="number" tick={AXIS_TICK} domain={domain} allowDataOverflow={!!domain}
              tickLine={false} axisLine={false} />
          : categoryAxis}
        {horizontal
          ? <YAxis dataKey="label" type="category" tick={fittedCategoryTick(true)} width={axisWidth}
              interval={0} tickLine={false} axisLine={{ stroke: 'var(--color-chart-grid)' }} />
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
                <LabelList dataKey={s.key} position={horizontal ? 'right' : 'top'} fontSize={11} fill="var(--color-chart-label)"
                  formatter={(v: React.ReactNode) => (typeof v === 'number' && v !== 0 ? v.toLocaleString() : '')} />
              )}
            </Bar>
          );
        })}
      </BarChart>
    </ResponsiveContainer>
  );
}
