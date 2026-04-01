/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   SVGCharts.tsx                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:37:39 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 16:37:40 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { COLORS, smoothLine } from './constants';

// ─── DonutChart ──────────────────────────────────────────────────────────────

export function DonutChart({ data, size = 120 }: { data: { count: number; color: string; label: string }[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return null;

  const radius = size / 2 - 10;
  const circumference = 2 * Math.PI * radius;
  let cumulativePercent = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {data.map((item, i) => {
        const percent = item.count / total;
        const strokeDasharray = `${circumference * percent} ${circumference * (1 - percent)}`;
        const rotation = cumulativePercent * 360 - 90;
        cumulativePercent += percent;
        return (
          <circle key={i} cx={size / 2} cy={size / 2} r={radius} fill="none"
            stroke={COLORS[i % COLORS.length]} strokeWidth={16}
            strokeDasharray={strokeDasharray}
            transform={`rotate(${rotation} ${size / 2} ${size / 2})`}
            className="transition-all duration-500" />
        );
      })}
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="middle"
        className="text-lg font-bold fill-fill-primary">{total}</text>
    </svg>
  );
}

// ─── AreaChartSVG ────────────────────────────────────────────────────────────

export function AreaChartSVG({ data }: { data: { count: number; label: string }[] }) {
  if (data.length === 0) return null;
  const maxCount = Math.max(...data.map(d => d.count));
  const width = 300, height = 140;
  const pad = { top: 12, right: 12, bottom: 28, left: 12 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const points = data.map((d, i) => ({
    x: pad.left + (i / Math.max(data.length - 1, 1)) * innerW,
    y: pad.top + innerH - (maxCount > 0 ? (d.count / maxCount) * innerH : 0),
    label: d.label, count: d.count,
  }));

  const linePath = smoothLine(points);
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${pad.top + innerH} L ${points[0].x} ${pad.top + innerH} Z`;
  const gridLines = [0.25, 0.5, 0.75, 1].map(f => pad.top + innerH * (1 - f));

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id="areaGradSmooth" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity="0.02" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {gridLines.map((y, i) => (
        <line key={i} x1={pad.left} y1={y} x2={width - pad.right} y2={y}
          stroke="var(--color-chart-grid)" strokeWidth="0.5" strokeDasharray="3 3" />
      ))}
      <path d={areaPath} fill="url(#areaGradSmooth)" />
      <path d={linePath} fill="none" stroke="var(--color-chart-1)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" />
      <path d={linePath} fill="none" stroke="var(--color-chart-1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="white" stroke="var(--color-chart-1)" strokeWidth="2" />
          <text x={p.x} y={pad.top + innerH + 16} textAnchor="middle"
            className="text-[7px] fill-fill-secondary font-medium">{p.label.slice(0, 7)}</text>
        </g>
      ))}
    </svg>
  );
}

// ─── ProgressRing ────────────────────────────────────────────────────────────

export function ProgressRing({ pct, color, size = 48 }: { pct: number; color: string; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const dasharray = `${(pct / 100) * circumference} ${circumference}`;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-chart-fill)" strokeWidth="4" />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={dasharray} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="transition-all duration-500" />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="middle"
        className="text-[9px] font-bold fill-fill-body">{Math.round(pct)}%</text>
    </svg>
  );
}
