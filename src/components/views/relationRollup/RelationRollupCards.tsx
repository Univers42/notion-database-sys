/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   RelationRollupCards.tsx                             :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:38:46 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 11:45:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import type { PropertyValue } from '../../../types/database';
import { cn } from '../../../utils/cn';
import { safeString } from '../../../utils/safeString';
export { CHART_COLORS as COLORS } from '../../../utils/color';

const DISPLAY_BADGE_CLASSES: Record<string, string> = {
  bar: 'bg-accent-soft text-accent-text',
  ring: 'bg-purple-surface text-purple-text-bold',
};

function formatBoolish(v: PropertyValue): string {
  if (v === true) return '✓';
  if (v === false) return '✗';
  return safeString(v);
}

function getRingStroke(pct: number): string {
  if (pct >= 80) return 'var(--color-progress-high)';
  if (pct >= 50) return 'var(--color-chart-1)';
  return 'var(--color-chart-4)';
}

/** Render a compact KPI card with a large value and description label. */
export function KpiCard({ label, value, color }: Readonly<{ label: string; value: number | string; color: string }>) {
  return (
    <div className={cn("bg-surface-primary rounded-xl border border-line p-4 shadow-sm")}>
      <div className={cn(`text-2xl font-bold tabular-nums ${color}`)}>{typeof value === 'number' ? value.toLocaleString() : value}</div>
      <div className={cn("text-xs text-ink-secondary mt-1")}>{label}</div>
    </div>
  );
}

/** Render a styled badge showing the rollup display format. */
export function DisplayBadge({ format }: Readonly<{ format: string }>) {
  const bg = DISPLAY_BADGE_CLASSES[format] || 'bg-surface-tertiary text-ink-body-light';
  return <span className={cn(`px-1.5 py-0.5 rounded text-[10px] font-medium ${bg}`)}>{format}</span>;
}

/** Render a rollup cell value with support for arrays, booleans, ring/bar number formats. */
export function RollupCellValue({ value, displayAs }: Readonly<{ value: PropertyValue; displayAs: string }>) {
  if (value == null) return <span className={cn("text-ink-disabled")}>—</span>;

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className={cn("text-ink-disabled")}>∅</span>;
    return (
      <span className={cn("text-xs text-ink-secondary")} title={value.join(', ')}>
        [{value.length}] {value.slice(0, 3).map(v => formatBoolish(v)).join(', ')}
        {value.length > 3 && '…'}
      </span>
    );
  }

  if (typeof value === 'boolean') return <span>{value ? '✓' : '✗'}</span>;

  if (typeof value === 'number') {
    if (displayAs === 'ring') {
      const pct = Math.min(100, Math.max(0, value));
      const r = 7; const circ = 2 * Math.PI * r;
      const offset = circ - (pct / 100) * circ;
      return (
        <span className={cn("inline-flex items-center gap-1")}>
          <svg width="18" height="18" className={cn("-rotate-90 inline-block")}>
            <circle cx="9" cy="9" r={r} fill="none" stroke="var(--color-chart-grid)" strokeWidth="2.5" />
            <circle cx="9" cy="9" r={r} fill="none"
              stroke={getRingStroke(pct)}
              strokeWidth="2.5" strokeLinecap="round"
              strokeDasharray={circ} strokeDashoffset={offset} />
          </svg>
          {pct}%
        </span>
      );
    }
    if (displayAs === 'bar') {
      const pct = Math.min(100, (value / 15) * 100);
      return (
        <span className={cn("inline-flex items-center gap-1 min-w-[60px]")}>
          <span className={cn("inline-block w-10 h-1.5 bg-surface-tertiary rounded-full overflow-hidden")}>
            <span className={cn("block h-full bg-accent rounded-full")} style={{ width: `${pct}%` }} />
          </span>
          {value}
        </span>
      );
    }
    return <span>{value.toLocaleString()}</span>;
  }

  return <span className={cn("truncate max-w-[120px] inline-block")}>{safeString(value)}</span>;
}
