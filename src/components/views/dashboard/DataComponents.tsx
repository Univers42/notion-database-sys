import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { SchemaProperty } from '../../../types/database';
import { COLORS } from './constants';

// ─── BarChartWidget ──────────────────────────────────────────────────────────

export function BarChartWidget({ data, total }: { data: { count: number; color: string; label: string }[]; total: number }) {
  return (
    <div className="flex flex-col gap-3">
      {data.map((item, i) => {
        const pct = total > 0 ? (item.count / total) * 100 : 0;
        return (
          <div key={item.label}>
            <div className="flex justify-between text-sm mb-1">
              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${item.color}`}>{item.label}</span>
              <span className="text-ink-secondary tabular-nums">{item.count} ({Math.round(pct)}%)</span>
            </div>
            <div className="w-full bg-surface-tertiary rounded-full h-2">
              <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── NumberSummaryWidget ─────────────────────────────────────────────────────

export function NumberSummaryWidget({ numberProps, numberAggs }: {
  numberProps: SchemaProperty[];
  numberAggs: Record<string, { sum: number; count: number; min: number; max: number }>;
}) {
  return (
    <div className="flex flex-col gap-4">
      {numberProps.map(prop => {
        const d = numberAggs[prop.id];
        if (!d || d.count === 0) return null;
        return (
          <div key={prop.id} className="border-b border-line-light last:border-0 pb-3 last:pb-0">
            <div className="text-xs text-ink-secondary uppercase tracking-wide mb-2">{prop.name}</div>
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { label: 'Sum', val: d.sum },
                { label: 'Avg', val: Number((d.sum / d.count).toFixed(1)) },
                { label: 'Min', val: d.min === Infinity ? '-' : d.min },
                { label: 'Max', val: d.max === -Infinity ? '-' : d.max },
              ].map(s => (
                <div key={s.label}>
                  <div className="text-lg font-bold text-ink tabular-nums">{typeof s.val === 'number' ? s.val.toLocaleString() : s.val}</div>
                  <div className="text-[10px] text-ink-muted">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── RecentList ──────────────────────────────────────────────────────────────

export function RecentList({ pages, openPage, getPageTitle }: {
  pages: { id: string; icon?: string; updatedAt: string; properties: Record<string, unknown> }[];
  openPage: (id: string) => void;
  getPageTitle: (p: unknown) => string;
}) {
  return (
    <div className="flex flex-col gap-1">
      {pages.map(page => {
        const title = getPageTitle(page);
        return (
          <div key={page.id} onClick={() => openPage(page.id)}
            className="flex items-center justify-between py-2 px-2 hover:bg-hover-surface rounded-lg cursor-pointer group transition-colors">
            <div className="flex items-center gap-2 overflow-hidden">
              {page.icon ? <span className="text-sm">{page.icon}</span> : <div className="w-4 h-4 rounded bg-surface-muted" />}
              <span className="text-sm text-ink truncate">{title || 'Untitled'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink-muted shrink-0">{format(parseISO(page.updatedAt), 'MMM d')}</span>
              <ArrowUpRight className="w-3 h-3 text-ink-muted opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        );
      })}
      {pages.length === 0 && <p className="text-sm text-ink-muted py-4 text-center">No recent activity</p>}
    </div>
  );
}
