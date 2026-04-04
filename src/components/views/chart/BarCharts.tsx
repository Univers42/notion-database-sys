/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   BarCharts.tsx                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:38:06 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 18:07:36 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import type { ChartDataItem } from './useChartData';
import { cn } from '../../../utils/cn';

interface BarChartProps {
  chartData: ChartDataItem[];
  maxValue: number;
}

export function VerticalBarChart({ chartData, maxValue }: Readonly<BarChartProps>) {
  const barWidth = Math.max(24, Math.min(64, 600 / chartData.length));
  const chartWidth = Math.max(600, chartData.length * (barWidth + 16));
  const chartHeight = 300;

  return (
    <div className={cn("flex-1 overflow-auto p-8 bg-surface-primary")}>
      <div className={cn("flex flex-col items-center")}>
        <svg width={chartWidth} height={chartHeight + 60} className={cn("overflow-visible")}>
          {/* Y-axis grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(pct => (
            <g key={pct}>
              <line x1={40} y1={chartHeight * (1 - pct) + 10} x2={chartWidth - 20} y2={chartHeight * (1 - pct) + 10}
                stroke="var(--color-chart-grid)" strokeWidth={1} />
              <text x={36} y={chartHeight * (1 - pct) + 14} textAnchor="end" fontSize={11} fill="var(--color-chart-tick)">
                {Math.round(maxValue * pct)}
              </text>
            </g>
          ))}

          {/* Bars */}
          {chartData.map((d, i) => {
            const barHeight = (d.value / maxValue) * chartHeight;
            const x = 50 + i * (barWidth + 16);
            const y = chartHeight - barHeight + 10;

            return (
              <g key={d.label}>
                <rect x={x} y={y} width={barWidth} height={barHeight}
                  fill={d.color} rx={4} className={cn("transition-all duration-200 hover:opacity-80")} />
                <text x={x + barWidth / 2} y={chartHeight + 28}
                  textAnchor="middle" fontSize={11} fill="var(--color-chart-label)" className={cn("select-none")}>
                  {d.label.length > 10 ? d.label.slice(0, 10) + '…' : d.label}
                </text>
                <text x={x + barWidth / 2} y={y - 6}
                  textAnchor="middle" fontSize={11} fill="var(--color-chart-axis)" fontWeight={600}>
                  {d.value % 1 === 0 ? d.value : d.value.toFixed(1)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export function HorizontalBarChart({ chartData, maxValue }: Readonly<BarChartProps>) {
  const barHeight = 28;
  const chartWidth = 500;
  const labelWidth = 120;

  return (
    <div className={cn("flex-1 overflow-auto p-8 bg-surface-primary")}>
      <div className={cn("max-w-2xl mx-auto")}>
        <svg width={chartWidth + labelWidth + 60} height={chartData.length * (barHeight + 8) + 20}>
          {chartData.map((d, i) => {
            const barW = (d.value / maxValue) * chartWidth;
            const y = i * (barHeight + 8) + 10;

            return (
              <g key={d.label}>
                <text x={labelWidth - 8} y={y + barHeight / 2 + 4}
                  textAnchor="end" fontSize={12} fill="var(--color-chart-axis)">
                  {d.label.length > 16 ? d.label.slice(0, 16) + '…' : d.label}
                </text>
                <rect x={labelWidth} y={y} width={barW} height={barHeight}
                  fill={d.color} rx={4} className={cn("transition-all duration-200 hover:opacity-80")} />
                <text x={labelWidth + barW + 8} y={y + barHeight / 2 + 4}
                  fontSize={12} fill="var(--color-chart-axis)" fontWeight={600}>
                  {d.value % 1 === 0 ? d.value : d.value.toFixed(1)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
