import React, { useMemo } from 'react';
import { useDatabaseStore } from '../../store/useDatabaseStore';
import type { SchemaProperty, RollupFunction } from '../../types/database';

// ═══════════════════════════════════════════════════════════════════════════════
// RELATION & ROLLUP ANALYTICS DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
// Showcases:
//   • KPI overview: relations, rollups, linked records, databases
//   • Per-project relation graph (which DBs are linked)
//   • Rollup results comparison table
//   • Rollup calculation function distribution
//   • Numeric rollup histograms
//   • Completion ring chart per project
//   • Cross-database data flow visualization
// ═══════════════════════════════════════════════════════════════════════════════

const COLORS = ['var(--color-chart-1)','var(--color-chart-2)','var(--color-chart-6)','var(--color-chart-4)','var(--color-chart-7)','var(--color-progress-high)','var(--color-chart-3)','var(--color-chart-8)'];

export function RelationRollupDashboard() {
  const { activeViewId, views, databases, pages, resolveRollup } = useDatabaseStore();
  const view = activeViewId ? views[activeViewId] : null;
  const db = view ? databases[view.databaseId] : null;

  const analytics = useMemo(() => {
    if (!db) return null;

    const allProps = Object.values(db.properties);
    const relationProps = allProps.filter(p => p.type === 'relation');
    const rollupProps = allProps.filter(p => p.type === 'rollup');
    const dbPages = Object.values(pages).filter(p => p.databaseId === db.id);

    // ─── Relation analytics ──────────────────────────────────
    const relationTargets = relationProps.map(rp => ({
      prop: rp,
      targetDb: rp.relationConfig ? databases[rp.relationConfig.databaseId] : null,
      isTwoWay: rp.relationConfig?.type === 'two_way',
      totalLinks: dbPages.reduce((sum, pg) => {
        const ids: string[] = pg.properties[rp.id] || [];
        return sum + ids.length;
      }, 0),
      pagesWithLinks: dbPages.filter(pg => {
        const ids: string[] = pg.properties[rp.id] || [];
        return ids.length > 0;
      }).length,
    }));

    const totalLinks = relationTargets.reduce((s, r) => s + r.totalLinks, 0);
    const linkedDbs = new Set(relationTargets.map(r => r.targetDb?.id).filter(Boolean));

    // ─── Rollup analytics ────────────────────────────────────
    type RollupResult = {
      prop: SchemaProperty;
      fn: RollupFunction;
      displayAs: string;
      results: { pageTitle: string; value: any }[];
      numericResults: number[];
      errorCount: number;
    };

    const rollupResults: RollupResult[] = rollupProps.map(rp => {
      const results: { pageTitle: string; value: any }[] = [];
      const numericResults: number[] = [];
      let errorCount = 0;

      for (const pg of dbPages) {
        const title = pg.properties[db.titlePropertyId] || 'Untitled';
        try {
          const val = resolveRollup(db.id, pg, rp.id);
          results.push({ pageTitle: title, value: val });
          if (typeof val === 'number' && !isNaN(val)) numericResults.push(val);
        } catch {
          errorCount++;
          results.push({ pageTitle: title, value: '#ERROR' });
        }
      }

      return {
        prop: rp,
        fn: rp.rollupConfig?.function || 'count_all',
        displayAs: rp.rollupConfig?.displayAs || 'number',
        results,
        numericResults,
        errorCount,
      };
    });

    // Function distribution
    const fnDist: Record<string, number> = {};
    for (const rr of rollupResults) {
      fnDist[rr.fn] = (fnDist[rr.fn] || 0) + 1;
    }

    // Display-as distribution
    const displayDist: Record<string, number> = {};
    for (const rr of rollupResults) {
      displayDist[rr.displayAs] = (displayDist[rr.displayAs] || 0) + 1;
    }

    return {
      db, dbPages, relationProps, rollupProps,
      relationTargets, totalLinks, linkedDbs,
      rollupResults, fnDist, displayDist,
    };
  }, [db, databases, pages, resolveRollup, activeViewId, views]);

  if (!analytics) return <div className="p-8 text-ink-muted">No data</div>;

  const {
    dbPages, relationProps, rollupProps,
    relationTargets, totalLinks, linkedDbs,
    rollupResults, fnDist, displayDist,
  } = analytics;

  return (
    <div className="flex-1 overflow-auto bg-gradient-to-br from-gradient-surface-from to-gradient-surface-to p-6">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* ─── Title ─── */}
        <div>
          <h2 className="text-xl font-bold text-ink">Relation & Rollup Analytics</h2>
          <p className="text-sm text-ink-secondary mt-1">
            Cross-database data flow &middot; {relationProps.length} relations &middot; {rollupProps.length} rollups &middot; {dbPages.length} records
          </p>
        </div>

        {/* ─── KPI Row ─── */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <KpiCard label="Relations" value={relationProps.length} color="text-accent-text-light" />
          <KpiCard label="Rollups" value={rollupProps.length} color="text-purple-text" />
          <KpiCard label="Total Links" value={totalLinks} color="text-cyan-text" />
          <KpiCard label="Linked DBs" value={linkedDbs.size} color="text-amber-text" />
          <KpiCard label="Projects" value={dbPages.length} color="text-emerald-text" />
          <KpiCard label="Two-way" value={relationTargets.filter(r => r.isTwoWay).length} color="text-pink-text" />
        </div>

        {/* ─── Relation Map ─── */}
        <div className="bg-surface-primary rounded-xl border border-line p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-ink-body mb-4">Cross-Database Relations</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {relationTargets.map((rt, i) => (
              <div key={rt.prop.id} className="flex items-center gap-3 p-3 rounded-lg bg-surface-secondary border border-line-light">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-ink-inverse font-bold text-sm"
                  style={{ background: COLORS[i % COLORS.length] }}>
                  {rt.prop.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-ink-strong truncate">{rt.prop.name}</div>
                  <div className="text-xs text-ink-secondary truncate">
                    → {rt.targetDb?.icon} {rt.targetDb?.name || 'Unknown'}
                    {rt.isTwoWay && <span className="ml-1 text-accent-text-soft">⇄</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-bold text-ink-strong tabular-nums">{rt.totalLinks}</div>
                  <div className="text-[10px] text-ink-muted">{rt.pagesWithLinks}/{dbPages.length} linked</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Rollup Function Distribution + Display Format ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Function Distribution */}
          <div className="bg-surface-primary rounded-xl border border-line p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-ink-body mb-3">Rollup Functions Used</h3>
            <div className="space-y-2">
              {Object.entries(fnDist).sort(([,a],[,b]) => b - a).map(([fn, count], i) => {
                const pct = (count / rollupProps.length) * 100;
                return (
                  <div key={fn} className="flex items-center gap-2">
                    <span className="text-xs text-ink-secondary w-28 truncate font-mono">{fn}</span>
                    <div className="flex-1 h-3 bg-surface-tertiary rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                    </div>
                    <span className="text-xs text-ink-body-light tabular-nums w-6 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Display Format Distribution */}
          <div className="bg-surface-primary rounded-xl border border-line p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-ink-body mb-3">Display Formats</h3>
            <div className="flex items-center justify-center gap-6 py-4">
              {Object.entries(displayDist).map(([format, count], i) => {
                const pct = Math.round((count / rollupProps.length) * 100);
                const r = 40; const circ = 2 * Math.PI * r;
                const offset = circ - (pct / 100) * circ;
                return (
                  <div key={format} className="flex flex-col items-center gap-2">
                    <svg width="90" height="90" className="-rotate-90">
                      <circle cx="45" cy="45" r={r} fill="none" stroke="var(--color-chart-fill)" strokeWidth="8" />
                      <circle cx="45" cy="45" r={r} fill="none"
                        stroke={COLORS[i % COLORS.length]} strokeWidth="8" strokeLinecap="round"
                        strokeDasharray={circ} strokeDashoffset={offset} />
                    </svg>
                    <div className="text-center -mt-1">
                      <div className="text-lg font-bold text-ink-strong">{count}</div>
                      <div className="text-[10px] text-ink-muted uppercase font-medium">{format}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ─── Per-Project Completion Rings ─── */}
        <div className="bg-surface-primary rounded-xl border border-line p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-ink-body mb-4">Project Completion Rates (from Rollup)</h3>
          <div className="flex flex-wrap gap-5">
            {dbPages.map((pg, idx) => {
              const title = pg.properties[analytics.db.titlePropertyId] || 'Untitled';
              const donePctProp = rollupResults.find(r => r.prop.id === 'proj-done-pct');
              const val = donePctProp?.results.find(r => r.pageTitle === title)?.value;
              const pct = typeof val === 'number' ? val : 0;
              const r = 22; const circ = 2 * Math.PI * r;
              const offset = circ - (pct / 100) * circ;
              return (
                <div key={pg.id} className="flex flex-col items-center gap-1 w-20">
                  <svg width="52" height="52" className="-rotate-90">
                    <circle cx="26" cy="26" r={r} fill="none" stroke="var(--color-chart-fill)" strokeWidth="5" />
                    <circle cx="26" cy="26" r={r} fill="none"
                      stroke={pct >= 80 ? 'var(--color-progress-high)' : pct >= 50 ? 'var(--color-chart-1)' : pct >= 25 ? 'var(--color-chart-4)' : 'var(--color-chart-7)'}
                      strokeWidth="5" strokeLinecap="round"
                      strokeDasharray={circ} strokeDashoffset={offset} />
                  </svg>
                  <span className="text-xs font-bold text-ink-body">{pct}%</span>
                  <span className="text-[10px] text-ink-secondary truncate w-full text-center" title={title}>
                    {pg.icon} {title.length > 10 ? title.slice(0, 10) + '…' : title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── Numeric Rollup Comparison ─── */}
        <div className="bg-surface-primary rounded-xl border border-line p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-ink-body mb-4">Numeric Rollup Summary</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="text-left py-2 px-3 text-xs font-medium text-ink-secondary">Rollup</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-ink-secondary">Function</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-ink-secondary">Display</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-ink-secondary">Min</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-ink-secondary">Max</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-ink-secondary">Avg</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-ink-secondary">Sum</th>
                </tr>
              </thead>
              <tbody>
                {rollupResults
                  .filter(rr => rr.numericResults.length > 0)
                  .map(rr => {
                    const min = Math.min(...rr.numericResults);
                    const max = Math.max(...rr.numericResults);
                    const avg = Math.round(rr.numericResults.reduce((a,b)=>a+b,0) / rr.numericResults.length * 100) / 100;
                    const sum = rr.numericResults.reduce((a,b)=>a+b,0);
                    return (
                      <tr key={rr.prop.id} className="border-b border-line-light hover:bg-hover-surface-soft">
                        <td className="py-2 px-3 font-medium text-ink-strong">{rr.prop.name}</td>
                        <td className="py-2 px-3 text-ink-secondary font-mono text-xs">{rr.fn}</td>
                        <td className="py-2 px-3">
                          <DisplayBadge format={rr.displayAs} />
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums">{min.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right tabular-nums">{max.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right tabular-nums">{avg.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right tabular-nums font-medium">{sum.toLocaleString()}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── Full Rollup Results Grid ─── */}
        <div className="bg-surface-primary rounded-xl border border-line p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-ink-body mb-4">All Rollup Results by Project</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="text-left py-2 px-2 text-xs font-medium text-ink-secondary sticky left-0 bg-surface-primary z-10">Project</th>
                  {rollupResults.map(rr => (
                    <th key={rr.prop.id} className="text-right py-2 px-2 text-xs font-medium text-ink-secondary whitespace-nowrap">
                      {rr.prop.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dbPages.map(pg => {
                  const title = pg.properties[analytics.db.titlePropertyId] || 'Untitled';
                  return (
                    <tr key={pg.id} className="border-b border-line-light hover:bg-hover-surface-soft">
                      <td className="py-1.5 px-2 font-medium text-ink-strong sticky left-0 bg-surface-primary whitespace-nowrap">
                        {pg.icon} {title}
                      </td>
                      {rollupResults.map(rr => {
                        const res = rr.results.find(r => r.pageTitle === title);
                        const val = res?.value;
                        return (
                          <td key={rr.prop.id} className="py-1.5 px-2 text-right tabular-nums text-ink-body-light">
                            <RollupCellValue value={val} displayAs={rr.displayAs} />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── Data Flow Diagram ─── */}
        <div className="bg-surface-primary rounded-xl border border-line p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-ink-body mb-4">Data Flow: Databases × Relations</h3>
          <div className="flex flex-wrap gap-4 items-start">
            {/* Center: current DB */}
            <div className="flex flex-col items-center gap-3 min-w-[140px]">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gradient-brand-from to-gradient-brand-to flex items-center justify-center text-2xl shadow-lg">
                {analytics.db.icon}
              </div>
              <div className="text-sm font-semibold text-ink-strong text-center">{analytics.db.name}</div>
              <div className="text-[10px] text-ink-muted">{dbPages.length} records</div>
            </div>

            {/* Arrows + target DBs */}
            <div className="flex-1 flex flex-wrap gap-3 ml-4">
              {relationTargets.map((rt, i) => {
                if (!rt.targetDb) return null;
                const targetPageCount = Object.values(pages).filter(p => p.databaseId === rt.targetDb!.id).length;
                return (
                  <div key={rt.prop.id} className="flex items-center gap-2">
                    <div className="flex flex-col items-center">
                      <div className="text-[10px] text-ink-muted mb-1 whitespace-nowrap">{rt.prop.name}</div>
                      <div className="w-12 h-px bg-surface-strong relative">
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-l-[6px] border-l-gray-400 border-y-[3px] border-y-transparent" />
                        {rt.isTwoWay && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0 h-0 border-r-[6px] border-r-gray-400 border-y-[3px] border-y-transparent" />
                        )}
                      </div>
                      <div className="text-[10px] text-ink-muted mt-0.5">{rt.totalLinks} links</div>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg shadow-sm border border-line"
                        style={{ background: COLORS[i % COLORS.length] + '15' }}>
                        {rt.targetDb.icon || '📂'}
                      </div>
                      <div className="text-xs text-ink-body-light text-center max-w-[80px] truncate">{rt.targetDb.name}</div>
                      <div className="text-[10px] text-ink-muted">{targetPageCount} records</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ─── Edge Cases Table ─── */}
        <div className="bg-surface-primary rounded-xl border border-line p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-ink-body mb-4">Edge Case Coverage</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="text-left py-2 px-3 text-xs font-medium text-ink-secondary">Project</th>
                  {relationTargets.map(rt => (
                    <th key={rt.prop.id} className="text-center py-2 px-3 text-xs font-medium text-ink-secondary">{rt.prop.name}</th>
                  ))}
                  <th className="text-center py-2 px-3 text-xs font-medium text-ink-secondary">Edge Case</th>
                </tr>
              </thead>
              <tbody>
                {dbPages.map(pg => {
                  const title = pg.properties[analytics.db.titlePropertyId] || 'Untitled';
                  const edgeCases: string[] = [];
                  for (const rt of relationTargets) {
                    const ids: string[] = pg.properties[rt.prop.id] || [];
                    if (ids.length === 0) edgeCases.push(`Empty ${rt.prop.name}`);
                    if (ids.length === 1) edgeCases.push(`Single ${rt.prop.name}`);
                    if (ids.length >= 3) edgeCases.push(`Many ${rt.prop.name} (${ids.length})`);
                  }
                  return (
                    <tr key={pg.id} className="border-b border-line-light hover:bg-hover-surface-soft">
                      <td className="py-1.5 px-3 font-medium text-ink-strong whitespace-nowrap">{pg.icon} {title}</td>
                      {relationTargets.map(rt => {
                        const ids: string[] = pg.properties[rt.prop.id] || [];
                        return (
                          <td key={rt.prop.id} className="py-1.5 px-3 text-center">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                              ids.length === 0 ? 'bg-danger-surface-muted text-danger-text' :
                              ids.length === 1 ? 'bg-warning-surface-muted text-warning-text-bold' :
                              'bg-success-surface-muted text-success-text-bold'
                            }`}>
                              {ids.length}
                            </span>
                          </td>
                        );
                      })}
                      <td className="py-1.5 px-3 text-center">
                        {edgeCases.length > 0 ? (
                          <div className="flex flex-wrap gap-1 justify-center">
                            {edgeCases.map((ec, i) => (
                              <span key={i} className="px-1.5 py-0.5 rounded text-[10px] bg-amber-surface text-amber-text-bold border border-amber-border whitespace-nowrap">{ec}</span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-ink-muted">Normal</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function KpiCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="bg-surface-primary rounded-xl border border-line p-4 shadow-sm">
      <div className={`text-2xl font-bold tabular-nums ${color}`}>{typeof value === 'number' ? value.toLocaleString() : value}</div>
      <div className="text-xs text-ink-secondary mt-1">{label}</div>
    </div>
  );
}

function DisplayBadge({ format }: { format: string }) {
  const bg = format === 'bar' ? 'bg-accent-soft text-accent-text' : format === 'ring' ? 'bg-purple-surface text-purple-text-bold' : 'bg-surface-tertiary text-ink-body-light';
  return <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${bg}`}>{format}</span>;
}

function RollupCellValue({ value, displayAs }: { value: any; displayAs: string }) {
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
