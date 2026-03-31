/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   RelationRollupCards.tsx                             :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:38:46 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 16:38:47 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';

export const COLORS = ['var(--color-chart-1)','var(--color-chart-2)','var(--color-chart-6)','var(--color-chart-4)','var(--color-chart-7)','var(--color-progress-high)','var(--color-chart-3)','var(--color-chart-8)'];

// ─── Small sub-components ────────────────────────────────────────────────────

export function KpiCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="bg-surface-primary rounded-xl border border-line p-4 shadow-sm">
      <div className={`text-2xl font-bold tabular-nums ${color}`}>{typeof value === 'number' ? value.toLocaleString() : value}</div>
      <div className="text-xs text-ink-secondary mt-1">{label}</div>
    </div>
  );
}

export function DisplayBadge({ format }: { format: string }) {
  const bg = format === 'bar' ? 'bg-accent-soft text-accent-text' : format === 'ring' ? 'bg-purple-surface text-purple-text-bold' : 'bg-surface-tertiary text-ink-body-light';
  return <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${bg}`}>{format}</span>;
}

export function RollupCellValue({ value, displayAs }: { value: any; displayAs: string }) {
  if (value == null) return <span className="text-ink-disabled">—</span>;

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-ink-disabled">∅</span>;
    return (
      <span className="text-xs text-ink-secondary" title={value.join(', ')}>
        [{value.length}] {value.slice(0, 3).map(v => v === true ? '✓' : v === false ? '✗' : String(v)).join(', ')}
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
        <span className="inline-flex items-center gap-1">
          <svg width="18" height="18" className="-rotate-90 inline-block">
            <circle cx="9" cy="9" r={r} fill="none" stroke="var(--color-chart-grid)" strokeWidth="2.5" />
            <circle cx="9" cy="9" r={r} fill="none"
              stroke={pct >= 80 ? 'var(--color-progress-high)' : pct >= 50 ? 'var(--color-chart-1)' : 'var(--color-chart-4)'}
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
        <span className="inline-flex items-center gap-1 min-w-[60px]">
          <span className="inline-block w-10 h-1.5 bg-surface-tertiary rounded-full overflow-hidden">
            <span className="block h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
          </span>
          {value}
        </span>
      );
    }
    return <span>{value.toLocaleString()}</span>;
  }

  return <span className="truncate max-w-[120px] inline-block">{String(value)}</span>;
}
