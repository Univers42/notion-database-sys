/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   DonutPieChart.tsx                                  :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:38:06 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/02 01:19:23 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import type { ChartDataItem } from './useChartData';
import { cn } from '../../../utils/cn';

interface DonutPieChartProps {
  chartData: ChartDataItem[];
  total: number;
  isDonut: boolean;
}

export function DonutPieChart({ chartData, total, isDonut }: Readonly<DonutPieChartProps>) {
  const size = 300;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 10;
  const innerR = isDonut ? outerR * 0.55 : 0;

  let startAngle = -Math.PI / 2;
  const slices = chartData.map(d => {
    const angle = (d.value / total) * Math.PI * 2;
    const slice = { ...d, startAngle, endAngle: startAngle + angle };
    startAngle += angle;
    return slice;
  });

  const arcPath = (_start: number, end: number, r: number) => {
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    const large = end - _start > Math.PI ? 1 : 0;
    return `A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };

  return (
    <div className={cn("flex-1 overflow-auto p-8 bg-surface-primary")}>
      <div className={cn("flex items-center justify-center gap-12")}>
        <svg width={size} height={size}>
          {slices.map((slice, i) => {
            const sx = cx + outerR * Math.cos(slice.startAngle);
            const sy = cy + outerR * Math.sin(slice.startAngle);
            const outerArc = arcPath(slice.startAngle, slice.endAngle, outerR);

            let d: string;
            if (innerR > 0) {
              const ix = cx + innerR * Math.cos(slice.endAngle);
              const iy = cy + innerR * Math.sin(slice.endAngle);
              const innerArc = arcPath(slice.endAngle, slice.startAngle, innerR);
              d = `M ${sx} ${sy} ${outerArc} L ${ix} ${iy} ${innerArc} L ${sx} ${sy} Z`;
            } else {
              d = `M ${cx} ${cy} L ${sx} ${sy} ${outerArc} Z`;
            }

            return (
              <path key={i} d={d} fill={slice.color} stroke="white" strokeWidth={2}
                className={cn("transition-all duration-200 hover:opacity-80 cursor-pointer")} />
            );
          })}
          {isDonut && (
            <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={24} fontWeight={700} fill="var(--color-chart-axis)">
              {total}
            </text>
          )}
        </svg>

        {/* Legend */}
        <div className={cn("flex flex-col gap-2")}>
          {chartData.map((d, _i) => (
            <div key={d.label} className={cn("flex items-center gap-2")}>
              <div className={cn("w-3 h-3 rounded-sm shrink-0")} style={{ backgroundColor: d.color }} />
              <span className={cn("text-sm text-ink-body")}>{d.label}</span>
              <span className={cn("text-sm text-ink-muted tabular-nums ml-1")}>{d.value}</span>
              <span className={cn("text-xs text-ink-muted")}>({Math.round((d.value / total) * 100)}%)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
