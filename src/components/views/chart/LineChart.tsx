/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   LineChart.tsx                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:38:06 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 18:07:36 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import type { ChartDataItem } from './useChartData';

interface LineChartProps {
  chartData: ChartDataItem[];
  maxValue: number;
}

export function LineChart({ chartData, maxValue }: Readonly<LineChartProps>) {
  const chartWidth = Math.max(600, chartData.length * 80);
  const chartHeight = 300;
  const padding = { top: 20, right: 20, bottom: 50, left: 50 };
  const innerW = chartWidth - padding.left - padding.right;
  const innerH = chartHeight - padding.top - padding.bottom;

  const points = chartData.map((d, i) => ({
    x: padding.left + (i / (chartData.length - 1 || 1)) * innerW,
    y: padding.top + innerH - (d.value / maxValue) * innerH,
    ...d,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = pathD + ` L ${points[points.length - 1]?.x || 0} ${padding.top + innerH} L ${points[0]?.x || 0} ${padding.top + innerH} Z`;

  return (
    <div className="flex-1 overflow-auto p-8 bg-surface-primary">
      <div className="flex flex-col items-center">
        <svg width={chartWidth} height={chartHeight}>
          <defs>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.2} />
              <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          {/* Grid */}
          {[0, 0.25, 0.5, 0.75, 1].map(pct => (
            <g key={pct}>
              <line x1={padding.left} y1={padding.top + innerH * (1 - pct)}
                x2={padding.left + innerW} y2={padding.top + innerH * (1 - pct)}
                stroke="var(--color-chart-grid)" strokeWidth={1} />
              <text x={padding.left - 8} y={padding.top + innerH * (1 - pct) + 4}
                textAnchor="end" fontSize={11} fill="var(--color-chart-tick)">
                {Math.round(maxValue * pct)}
              </text>
            </g>
          ))}
          {/* Area fill */}
          {points.length > 1 && <path d={areaD} fill="url(#lineGrad)" />}
          {/* Line */}
          {points.length > 1 && <path d={pathD} fill="none" stroke="var(--color-chart-1)" strokeWidth={2.5} />}
          {/* Points */}
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={4} fill="var(--color-chart-1)" stroke="white" strokeWidth={2} />
              <text x={p.x} y={padding.top + innerH + 20} textAnchor="middle" fontSize={11} fill="var(--color-chart-label)">
                {p.label.length > 8 ? p.label.slice(0, 8) + '…' : p.label}
              </text>
              <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize={11} fill="var(--color-chart-axis)" fontWeight={600}>
                {p.value % 1 === 0 ? p.value : p.value.toFixed(1)}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
