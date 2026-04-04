/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   NumericFormulaCard.tsx                              :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:38:16 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 16:38:17 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { COLORS, STAT_BG } from './constants';
import { cn } from '../../../utils/cn';

export function NumericFormulaCard({
  title,
  icon,
  color,
  values,
  expression,
  prefix = '',
  suffix = '',
}: Readonly<{
  title: string;
  icon: React.ReactNode;
  color: string;
  values: number[];
  expression: string;
  prefix?: string;
  suffix?: string;
}>) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((s, v) => s + v, 0);
  const avg = sum / values.length;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const median = sorted.length % 2 ? sorted[Math.floor(sorted.length / 2)] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
  const stddev = Math.sqrt(values.reduce((s, v) => s + (v - avg) ** 2, 0) / values.length);

  const fmt = (n: number) => {
    if (Math.abs(n) >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(1)}M${suffix}`;
    if (Math.abs(n) >= 10_000) return `${prefix}${(n / 1_000).toFixed(1)}K${suffix}`;
    return `${prefix}${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}${suffix}`;
  };

  // Build histogram (10 buckets)
  const bucketCount = 10;
  const range = max - min || 1;
  const bucketSize = range / bucketCount;
  const buckets = Array.from({ length: bucketCount }, () => 0);
  values.forEach((v) => {
    const idx = Math.min(Math.floor((v - min) / bucketSize), bucketCount - 1);
    buckets[idx]++;
  });
  const maxBucket = Math.max(...buckets);

  return (
    <div className={cn("bg-surface-primary rounded-xl border border-line p-5")}>
      <div className={cn("flex items-center gap-2 mb-4")}>
        <div className={cn(`p-2 rounded-lg ${STAT_BG[color] || STAT_BG.blue}`)}>{icon}</div>
        <div>
          <h3 className={cn("text-sm font-semibold text-ink")}>{title}</h3>
          <p className={cn("text-[10px] text-ink-muted font-mono truncate max-w-[300px]")} title={expression}>
            {expression}
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div className={cn("grid grid-cols-3 gap-2 mb-4")}>
        {[
          { label: 'Average', val: fmt(avg) },
          { label: 'Median', val: fmt(median) },
          { label: 'Std Dev', val: fmt(stddev) },
          { label: 'Min', val: fmt(min) },
          { label: 'Max', val: fmt(max) },
          { label: 'Sum', val: fmt(sum) },
        ].map((s) => (
          <div key={s.label} className={cn("bg-surface-secondary rounded-lg p-2.5 text-center")}>
            <div className={cn("text-sm font-bold text-ink tabular-nums")}>{s.val}</div>
            <div className={cn("text-[9px] text-ink-muted mt-0.5")}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Histogram */}
      <div className={cn("flex items-end gap-1 h-16")}>
        {buckets.map((count, i) => {
          const pct = maxBucket > 0 ? (count / maxBucket) * 100 : 0;
          return (
            <div key={i} className={cn("flex-1 flex flex-col items-center gap-0.5")}>
              <span className={cn("text-[8px] text-ink-muted tabular-nums")}>{count > 0 ? count : ''}</span>
              <div
                className={cn("w-full rounded-t transition-all hover:opacity-80")}
                style={{ height: `${Math.max(pct, 3)}%`, backgroundColor: COLORS[i % COLORS.length] }}
                title={`${fmt(min + i * bucketSize)} – ${fmt(min + (i + 1) * bucketSize)}: ${count}`}
              />
            </div>
          );
        })}
      </div>
      <div className={cn("flex justify-between text-[8px] text-ink-muted mt-1")}>
        <span>{fmt(min)}</span>
        <span>Distribution</span>
        <span>{fmt(max)}</span>
      </div>
    </div>
  );
}
