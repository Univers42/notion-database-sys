/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ChartDonut.tsx                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/10 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { ChartResult } from '../../../lib/chart/chartTypes';
import { VALUE_SERIES_KEY } from '../../../lib/chart/chartTypes';
import type { ViewSettings } from '../../../types/database';
import { colorAt, valueShade } from './chartPalette';
import { ChartTooltipContent } from './ChartTooltipContent';
import type { BarsClick } from './ChartBars';

/** Slice fill: option color → palette → value shading when enabled. */
function sliceFill(result: ChartResult, settings: ViewSettings, index: number): string {
  const cat = result.categories[index];
  if (settings.colorByValue) {
    const max = Math.max(...result.categories.map(c => c.total), 1);
    return valueShade(settings.colorPalette, cat.total / max);
  }
  return cat.color || colorAt(settings.colorPalette, index);
}

/** Donut/pie chart: slices are x groups; optional total in the center. */
export function ChartDonutChart({ result, settings, isDonut, onSliceClick }: Readonly<{
  result: ChartResult;
  settings: ViewSettings;
  isDonut: boolean;
  onSliceClick: (click: BarsClick) => void;
}>) {
  const data = result.categories.map(c => ({ name: c.label, value: c.total }));
  const showCenter = isDonut && settings.donutCenterValue !== false;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <ResponsiveContainer width="100%" height="100%" minHeight={120} debounce={50}>
        <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Tooltip content={<ChartTooltipContent total={result.total} />} />
          <Pie data={data} dataKey="value" nameKey="name"
            innerRadius={isDonut ? '62%' : 0} outerRadius="92%"
            paddingAngle={isDonut ? 1.5 : 0} isAnimationActive={false}
            labelLine={!!settings.showDataLabels}
            label={settings.showDataLabels
              ? (entry: { name?: string; value?: number }) => `${entry.name}: ${(entry.value ?? 0).toLocaleString()}`
              : undefined}
            onClick={(_, index) => onSliceClick({ categoryIndex: index, seriesKey: VALUE_SERIES_KEY })}
            cursor="pointer">
            {data.map((entry, i) => (
              <Cell key={entry.name} fill={sliceFill(result, settings, i)} stroke="var(--color-surface-primary, #fff)" />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {showCenter && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
        }}>
          <span style={{ fontSize: 28, fontWeight: 700 }} className="text-ink tabular-nums">
            {result.total.toLocaleString()}
          </span>
          <span style={{ fontSize: 11 }} className="text-ink-muted">Total</span>
        </div>
      )}
    </div>
  );
}
