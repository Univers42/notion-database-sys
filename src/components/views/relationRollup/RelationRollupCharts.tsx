/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   RelationRollupCharts.tsx                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:38:46 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 11:45:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import type { Page } from '../../../types/database';
import type { RelationRollupAnalytics, RelationTarget } from './useRelationRollupAnalytics';
import { CHART_COLORS as COLORS } from '../../../utils/color';
import { cn } from '../../../utils/cn';

/** Render cards for each cross-database relation showing link counts and target DBs. */
export function RelationMapSection({ relationTargets, dbPages }: Readonly<{ relationTargets: RelationTarget[]; dbPages: Page[] }>) {
  return (
    <div className={cn("bg-surface-primary rounded-xl border border-line p-5 shadow-sm")}>
      <h3 className={cn("text-sm font-semibold text-ink-body mb-4")}>Cross-Database Relations</h3>
      <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3")}>
        {relationTargets.map((rt, i) => (
          <div key={rt.prop.id} className={cn("flex items-center gap-3 p-3 rounded-lg bg-surface-secondary border border-line-light")}>
            <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center text-ink-inverse font-bold text-sm")}
              style={{ background: COLORS[i % COLORS.length] }}>
              {rt.prop.name.charAt(0)}
            </div>
            <div className={cn("flex-1 min-w-0")}>
              <div className={cn("text-sm font-medium text-ink-strong truncate")}>{rt.prop.name}</div>
              <div className={cn("text-xs text-ink-secondary truncate")}>
                → {rt.targetDb?.icon} {rt.targetDb?.name || 'Unknown'}
                {rt.isTwoWay && <span className={cn("ml-1 text-accent-text-soft")}>⇄</span>}
              </div>
            </div>
            <div className={cn("text-right shrink-0")}>
              <div className={cn("text-lg font-bold text-ink-strong tabular-nums")}>{rt.totalLinks}</div>
              <div className={cn("text-[10px] text-ink-muted")}>{rt.pagesWithLinks}/{dbPages.length} linked</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Render a bar chart showing the distribution of rollup aggregation functions. */
export function FunctionDistSection({ fnDist, rollupCount }: Readonly<{ fnDist: Record<string, number>; rollupCount: number }>) {
  return (
    <div className={cn("bg-surface-primary rounded-xl border border-line p-5 shadow-sm")}>
      <h3 className={cn("text-sm font-semibold text-ink-body mb-3")}>Rollup Functions Used</h3>
      <div className={cn("space-y-2")}>
        {Object.entries(fnDist).sort(([,a],[,b]) => b - a).map(([fn, count], i) => {
          const pct = (count / rollupCount) * 100;
          return (
            <div key={fn} className={cn("flex items-center gap-2")}>
              <span className={cn("text-xs text-ink-secondary w-28 truncate font-mono")}>{fn}</span>
              <div className={cn("flex-1 h-3 bg-surface-tertiary rounded-full overflow-hidden")}>
                <div className={cn("h-full rounded-full transition-all")} style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
              </div>
              <span className={cn("text-xs text-ink-body-light tabular-nums w-6 text-right")}>{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Render ring charts comparing rollup display format usage. */
export function DisplayFormatSection({ displayDist, rollupCount }: Readonly<{ displayDist: Record<string, number>; rollupCount: number }>) {
  return (
    <div className={cn("bg-surface-primary rounded-xl border border-line p-5 shadow-sm")}>
      <h3 className={cn("text-sm font-semibold text-ink-body mb-3")}>Display Formats</h3>
      <div className={cn("flex items-center justify-center gap-6 py-4")}>
        {Object.entries(displayDist).map(([format, count], i) => {
          const pct = Math.round((count / rollupCount) * 100);
          const r = 40; const circ = 2 * Math.PI * r;
          const offset = circ - (pct / 100) * circ;
          return (
            <div key={format} className={cn("flex flex-col items-center gap-2")}>
              <svg width="90" height="90" className={cn("-rotate-90")}>
                <circle cx="45" cy="45" r={r} fill="none" stroke="var(--color-chart-fill)" strokeWidth="8" />
                <circle cx="45" cy="45" r={r} fill="none"
                  stroke={COLORS[i % COLORS.length]} strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={circ} strokeDashoffset={offset} />
              </svg>
              <div className={cn("text-center -mt-1")}>
                <div className={cn("text-lg font-bold text-ink-strong")}>{count}</div>
                <div className={cn("text-[10px] text-ink-muted uppercase font-medium")}>{format}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getCompletionStroke(pct: number): string {
  if (pct >= 80) return 'var(--color-progress-high)';
  if (pct >= 50) return 'var(--color-chart-1)';
  if (pct >= 25) return 'var(--color-chart-4)';
  return 'var(--color-chart-7)';
}

/** Render per-project completion rings derived from rollup percentage values. */
export function CompletionRingsSection({ analytics }: Readonly<{ analytics: RelationRollupAnalytics }>) {
  const { dbPages, rollupResults } = analytics;
  return (
    <div className={cn("bg-surface-primary rounded-xl border border-line p-5 shadow-sm")}>
      <h3 className={cn("text-sm font-semibold text-ink-body mb-4")}>Project Completion Rates (from Rollup)</h3>
      <div className={cn("flex flex-wrap gap-5")}>
        {dbPages.map((pg, _idx) => {
          const title = pg.properties[analytics.db.titlePropertyId] || 'Untitled';
          const donePctProp = rollupResults.find(r => r.prop.id === 'proj-done-pct');
          const val = donePctProp?.results.find(r => r.pageTitle === title)?.value;
          const pct = typeof val === 'number' ? val : 0;
          const r = 22; const circ = 2 * Math.PI * r;
          const offset = circ - (pct / 100) * circ;
          return (
            <div key={pg.id} className={cn("flex flex-col items-center gap-1 w-20")}>
              <svg width="52" height="52" className={cn("-rotate-90")}>
                <circle cx="26" cy="26" r={r} fill="none" stroke="var(--color-chart-fill)" strokeWidth="5" />
                <circle cx="26" cy="26" r={r} fill="none"
                  stroke={getCompletionStroke(pct)}
                  strokeWidth="5" strokeLinecap="round"
                  strokeDasharray={circ} strokeDashoffset={offset} />
              </svg>
              <span className={cn("text-xs font-bold text-ink-body")}>{pct}%</span>
              <span className={cn("text-[10px] text-ink-secondary truncate w-full text-center")} title={title}>
                {pg.icon} {title.length > 10 ? title.slice(0, 10) + '…' : title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Render a visual data-flow diagram connecting the current DB to its relation targets. */
export function DataFlowSection({ analytics, pages }: Readonly<{ analytics: RelationRollupAnalytics; pages: Record<string, Page> }>) {
  const { db, dbPages, relationTargets } = analytics;
  return (
    <div className={cn("bg-surface-primary rounded-xl border border-line p-5 shadow-sm")}>
      <h3 className={cn("text-sm font-semibold text-ink-body mb-4")}>Data Flow: Databases × Relations</h3>
      <div className={cn("flex flex-wrap gap-4 items-start")}>
        {/* Center: current DB */}
        <div className={cn("flex flex-col items-center gap-3 min-w-[140px]")}>
          <div className={cn("w-16 h-16 rounded-2xl bg-gradient-to-br from-gradient-brand-from to-gradient-brand-to flex items-center justify-center text-2xl shadow-lg")}>
            {db.icon}
          </div>
          <div className={cn("text-sm font-semibold text-ink-strong text-center")}>{db.name}</div>
          <div className={cn("text-[10px] text-ink-muted")}>{dbPages.length} records</div>
        </div>

        {/* Arrows + target DBs */}
        <div className={cn("flex-1 flex flex-wrap gap-3 ml-4")}>
          {relationTargets.map((rt, i) => {
            if (!rt.targetDb) return null;
            const targetPageCount = Object.values(pages).filter(p => p.databaseId === rt.targetDb!.id).length;
            return (
              <div key={rt.prop.id} className={cn("flex items-center gap-2")}>
                <div className={cn("flex flex-col items-center")}>
                  <div className={cn("text-[10px] text-ink-muted mb-1 whitespace-nowrap")}>{rt.prop.name}</div>
                  <div className={cn("w-12 h-px bg-surface-strong relative")}>
                    <div className={cn("absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-l-[6px] border-l-gray-400 border-y-[3px] border-y-transparent")} />
                    {rt.isTwoWay && (
                      <div className={cn("absolute left-0 top-1/2 -translate-y-1/2 w-0 h-0 border-r-[6px] border-r-gray-400 border-y-[3px] border-y-transparent")} />
                    )}
                  </div>
                  <div className={cn("text-[10px] text-ink-muted mt-0.5")}>{rt.totalLinks} links</div>
                </div>
                <div className={cn("flex flex-col items-center gap-1")}>
                  <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center text-lg shadow-sm border border-line")}
                    style={{ background: COLORS[i % COLORS.length] + '15' }}>
                    {rt.targetDb.icon || '📂'}
                  </div>
                  <div className={cn("text-xs text-ink-body-light text-center max-w-[80px] truncate")}>{rt.targetDb.name}</div>
                  <div className={cn("text-[10px] text-ink-muted")}>{targetPageCount} records</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
