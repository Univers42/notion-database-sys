/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   TextDistributionCard.tsx                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:38:16 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 16:38:17 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { COLORS } from './constants';

function MiniDonut({ data, size = 100 }: { data: [string, number][]; size?: number }) {
  const total = data.reduce((s, [, c]) => s + c, 0);
  if (total === 0) return null;
  const radius = size / 2 - 8;
  const circumference = 2 * Math.PI * radius;
  let cum = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      {data.map(([label, count], i) => {
        const pct = count / total;
        const dasharray = `${circumference * pct} ${circumference * (1 - pct)}`;
        const rotation = cum * 360 - 90;
        cum += pct;
        return (
          <circle
            key={label}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={14}
            strokeDasharray={dasharray}
            transform={`rotate(${rotation} ${size / 2} ${size / 2})`}
          />
        );
      })}
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="middle" className="text-sm font-bold fill-fill-primary">
        {total}
      </text>
    </svg>
  );
}

export function TextDistributionCard({
  title,
  expression,
  textValues,
  total,
}: {
  title: string;
  expression: string;
  textValues: Record<string, number>;
  total: number;
}) {
  const sorted = Object.entries(textValues).sort((a, b) => b[1] - a[1]);
  const displayTotal = sorted.reduce((s, [, c]) => s + c, 0);

  return (
    <div className="bg-surface-primary rounded-xl border border-line p-5">
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        <span className="text-[10px] text-ink-muted ml-auto">{sorted.length} distinct values</span>
      </div>
      <p className="text-[10px] text-ink-muted font-mono truncate mb-4" title={expression}>
        {expression}
      </p>

      {/* Donut + legend side-by-side */}
      <div className="flex items-center gap-6">
        <MiniDonut data={sorted.slice(0, 8)} size={100} />
        <div className="flex-1 flex flex-col gap-1.5 overflow-auto max-h-48">
          {sorted.slice(0, 10).map(([label, count], i) => {
            const pct = displayTotal > 0 ? Math.round((count / displayTotal) * 100) : 0;
            return (
              <div key={label}>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-ink-body font-medium truncate max-w-[180px]">{label}</span>
                  <span className="text-ink-muted tabular-nums ml-2">
                    {count} ({pct}%)
                  </span>
                </div>
                <div className="w-full bg-surface-tertiary rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
