/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   MultiLineChart.tsx                                 :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:37:35 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 13:36:40 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import type { SchemaProperty } from '../../../types/database';
import { COLORS, smoothLine } from './constants';
import { cn } from '../../../utils/cn';

type MonthBucket = Record<string, number>;

/** Entry representing aggregated data for a time period. */
export interface BucketEntry { label: string; data: MonthBucket }

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Aggregates pages into monthly buckets for multi-line chart rendering.
 *
 * Falls back to synthesized variation when date bucketing yields fewer than 2 entries.
 */
export function buildMultiLineBuckets(
  pages: { properties: Record<string, unknown> }[],
  propsMap: Record<string, SchemaProperty>,
  categories: string[],
  data: { count: number; label: string }[],
): BucketEntry[] {
  const dateProp = Object.values(propsMap).find(p => p.type === 'date');
  const buckets: BucketEntry[] = [];

  if (dateProp) {
    const monthMap = new Map<string, MonthBucket>();
    pages.forEach(page => {
      const dateVal = page.properties[dateProp.id];
      if (!dateVal) return;
      try {
        const d = new Date(dateVal as string);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!monthMap.has(key)) monthMap.set(key, {});
        const bucket = monthMap.get(key)!;
        const catPropId = Object.keys(propsMap).find(pid => {
          const p = propsMap[pid];
          return (p.type === 'select' || p.type === 'status') && page.properties[pid];
        });
        if (catPropId) {
          const opt = propsMap[catPropId].options?.find(o => o.id === page.properties[catPropId]);
          const label = opt?.value || '';
          if (categories.includes(label)) bucket[label] = (bucket[label] || 0) + 1;
        }
      } catch { /* skip */ }
    });
    const recent = Array.from(monthMap.keys()).sort().slice(-8);
    recent.forEach(key => {
      const [, m] = key.split('-');
      buckets.push({ label: MONTH_LABELS[parseInt(m, 10) - 1] || key, data: monthMap.get(key)! });
    });
  }

  // Fallback: synthesize variation from category counts
  if (buckets.length < 2) {
    const n = Math.min(data.length, 8);
    for (let i = 0; i < n; i++) {
      const bucket: MonthBucket = {};
      categories.forEach((name, si) => {
        const base = data[si]?.count || 0;
        bucket[name] = Math.max(1, Math.round(base * (0.5 + Math.sin(i * 1.3 + si * 2.1) * 0.5)));
      });
      buckets.push({ label: data[i].label.slice(0, 4), data: bucket });
    }
  }

  return buckets;
}

/** Renders a multi-line area chart comparing category trends over time. */
export function MultiLineChart({ data, pages, propsMap }: {
  data: { count: number; label: string }[];
  pages: { properties: Record<string, unknown> }[];
  propsMap: Record<string, SchemaProperty>;
}) {
  const width = 380, height = 160;
  const pad = { top: 14, right: 14, bottom: 30, left: 14 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const categories = data.slice(0, 5).map(d => d.label);
  const buckets = buildMultiLineBuckets(pages, propsMap, categories, data);
  if (buckets.length < 2) return null;

  const allVals = buckets.flatMap(b => categories.map(c => b.data[c] || 0));
  const maxVal = Math.max(...allVals, 1);
  const gridLines = [0.25, 0.5, 0.75, 1].map(f => pad.top + innerH * (1 - f));

  return (
    <div className={cn("w-full")}>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} className={cn("overflow-visible")}>
        <defs>
          {categories.map((_, i) => (
            <linearGradient key={i} id={`mlGrad${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS[i % COLORS.length]} stopOpacity="0.15" />
              <stop offset="100%" stopColor={COLORS[i % COLORS.length]} stopOpacity="0.01" />
            </linearGradient>
          ))}
        </defs>
        {gridLines.map((y, i) => (
          <line key={i} x1={pad.left} y1={y} x2={width - pad.right} y2={y}
            stroke="var(--color-chart-grid)" strokeWidth="0.5" strokeDasharray="3 3" />
        ))}
        {categories.map((cat, si) => {
          const pts = buckets.map((b, bi) => ({
            x: pad.left + (bi / Math.max(buckets.length - 1, 1)) * innerW,
            y: pad.top + innerH - ((b.data[cat] || 0) / maxVal) * innerH,
          }));
          const line = smoothLine(pts);
          const area = `${line} L${pts[pts.length - 1].x} ${pad.top + innerH} L${pts[0].x} ${pad.top + innerH} Z`;
          const color = COLORS[si % COLORS.length];
          return (
            <g key={cat}>
              <path d={area} fill={`url(#mlGrad${si})`} />
              <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              {pts.map((p, pi) => (
                <circle key={pi} cx={p.x} cy={p.y} r="2.5" fill="white" stroke={color} strokeWidth="1.5" />
              ))}
            </g>
          );
        })}
        {buckets.map((b, i) => {
          const x = pad.left + (i / Math.max(buckets.length - 1, 1)) * innerW;
          return (
            <text key={i} x={x} y={pad.top + innerH + 16} textAnchor="middle"
              className={cn("text-[7px] fill-fill-secondary font-medium")}>{b.label}</text>
          );
        })}
      </svg>
      <div className={cn("flex flex-wrap gap-x-3 gap-y-1 mt-2 px-1")}>
        {categories.map((cat, i) => (
          <div key={cat} className={cn("flex items-center gap-1 text-[9px]")}>
            <div className={cn("w-2 h-2 rounded-full shrink-0")} style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            <span className={cn("text-ink-secondary truncate max-w-[70px]")}>{cat}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
