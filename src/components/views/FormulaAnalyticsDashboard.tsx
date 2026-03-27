import React, { useMemo } from 'react';
import { useDatabaseStore } from '../../store/useDatabaseStore';
import { Sigma, TrendingUp, AlertTriangle, CheckCircle, Package, Flame, DollarSign, Scale, Clock, ShieldCheck, Zap, BarChart3, PieChart } from 'lucide-react';

// ─── COLORS & PALETTE ──────────────────────────────────────────────────────
const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#ef4444', '#6366f1', '#14b8a6', '#f97316'];
const STAT_BG: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-600',
  purple: 'bg-purple-50 text-purple-600',
  green: 'bg-green-50 text-green-600',
  amber: 'bg-amber-50 text-amber-600',
  pink: 'bg-pink-50 text-pink-600',
  cyan: 'bg-cyan-50 text-cyan-600',
  red: 'bg-red-50 text-red-600',
  indigo: 'bg-indigo-50 text-indigo-600',
};

// ─── TYPES ──────────────────────────────────────────────────────────────────
interface FormulaResult {
  propId: string;
  propName: string;
  expression: string;
  results: { pageId: string; pageName: string; value: any; error: boolean }[];
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────
export function FormulaAnalyticsDashboard() {
  const { activeViewId, views, databases, getPagesForView, resolveFormula, getPageTitle, openPage } =
    useDatabaseStore();
  const view = activeViewId ? views[activeViewId] : null;
  const database = view ? databases[view.databaseId] : null;
  const pages = view ? getPagesForView(view.id) : [];

  // ─── Compute all formula results ─────────────────────────────────────────
  const formulaResults = useMemo(() => {
    if (!database) return [];
    const formulaProps = Object.values(database.properties).filter(
      (p) => p.type === 'formula' && p.formulaConfig?.expression
    );
    return formulaProps.map((prop) => {
      const results = pages.map((page) => {
        try {
          const val = resolveFormula(database.id, page, prop.formulaConfig!.expression);
          return { pageId: page.id, pageName: getPageTitle(page), value: val, error: val === '#ERROR' };
        } catch {
          return { pageId: page.id, pageName: getPageTitle(page), value: '#ERROR', error: true };
        }
      });
      return {
        propId: prop.id,
        propName: prop.name,
        expression: prop.formulaConfig!.expression,
        results,
      } as FormulaResult;
    });
  }, [database, pages, resolveFormula, getPageTitle]);

  if (!view || !database) return null;

  // ─── Derive analytics from formula results ───────────────────────────────
  const analytics = useMemo(() => {
    const map: Record<
      string,
      {
        propName: string;
        expression: string;
        total: number;
        errors: number;
        numValues: number[];
        textValues: Record<string, number>;
        boolTrue: number;
        boolFalse: number;
        resultType: 'number' | 'text' | 'boolean' | 'mixed';
      }
    > = {};

    formulaResults.forEach((fr) => {
      const entry = {
        propName: fr.propName,
        expression: fr.expression,
        total: fr.results.length,
        errors: 0,
        numValues: [] as number[],
        textValues: {} as Record<string, number>,
        boolTrue: 0,
        boolFalse: 0,
        resultType: 'mixed' as 'number' | 'text' | 'boolean' | 'mixed',
      };

      fr.results.forEach((r) => {
        if (r.error) {
          entry.errors++;
          return;
        }
        const v = r.value;
        if (typeof v === 'number' && isFinite(v)) {
          entry.numValues.push(v);
        } else if (typeof v === 'boolean') {
          if (v) entry.boolTrue++;
          else entry.boolFalse++;
        } else if (typeof v === 'string' && v !== '') {
          entry.textValues[v] = (entry.textValues[v] || 0) + 1;
        }
      });

      // Determine dominant type
      if (entry.numValues.length > 0 && entry.boolTrue + entry.boolFalse === 0 && Object.keys(entry.textValues).length === 0) {
        entry.resultType = 'number';
      } else if (entry.boolTrue + entry.boolFalse > 0 && entry.numValues.length === 0 && Object.keys(entry.textValues).length === 0) {
        entry.resultType = 'boolean';
      } else if (Object.keys(entry.textValues).length > 0 && entry.numValues.length === 0 && entry.boolTrue + entry.boolFalse === 0) {
        entry.resultType = 'text';
      }

      map[fr.propId] = entry;
    });
    return map;
  }, [formulaResults]);

  // ─── Summary stats ───────────────────────────────────────────────────────
  const totalFormulas = formulaResults.length;
  const totalComputations = formulaResults.reduce((s, fr) => s + fr.results.length, 0);
  const totalErrors = Object.values(analytics).reduce((s, a) => s + a.errors, 0);
  const successRate = totalComputations > 0 ? Math.round(((totalComputations - totalErrors) / totalComputations) * 100) : 100;

  // Pick a few interesting formulas for detail display
  const marginPct = analytics['pp-margin-pct'];
  const invValue = analytics['pp-inv-value'];
  const profitScore = analytics['pp-profit-score'];
  const pricePerKg = analytics['pp-price-per-kg'];

  return (
    <div className="flex-1 overflow-auto p-6 bg-gray-50">
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        {/* ─── Header ─── */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white">
            <Sigma className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Formula Analytics</h1>
            <p className="text-sm text-gray-500">
              {totalFormulas} formula columns evaluated across {pages.length} products ({totalComputations.toLocaleString()} computations)
            </p>
          </div>
        </div>

        {/* ─── KPI Row ─── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard icon={<Sigma className="w-5 h-5" />} color="purple" label="Formula Columns" value={totalFormulas} />
          <KpiCard icon={<Zap className="w-5 h-5" />} color="blue" label="Total Evaluations" value={totalComputations} />
          <KpiCard icon={<CheckCircle className="w-5 h-5" />} color="green" label="Success Rate" value={`${successRate}%`} subtext={`${totalErrors} errors`} />
          <KpiCard icon={<AlertTriangle className="w-5 h-5" />} color={totalErrors > 0 ? 'red' : 'green'} label="Errors" value={totalErrors} subtext={totalErrors === 0 ? 'All clear!' : undefined} />
        </div>

        {/* ─── Formula Type Breakdown ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Result Type Distribution */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-gray-400" /> Result Type Distribution
            </h3>
            <FormulaTypePie analytics={analytics} />
          </div>

          {/* Error Heatmap */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-gray-400" /> Error Rate by Formula
            </h3>
            <ErrorBarChart analytics={analytics} />
          </div>

          {/* Complexity Indicator */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-gray-400" /> Expression Complexity
            </h3>
            <ComplexityChart analytics={analytics} />
          </div>
        </div>

        {/* ─── Numeric Formula Deep-Dive ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {marginPct && marginPct.resultType === 'number' && (
            <NumericFormulaCard
              title="Margin %"
              icon={<TrendingUp className="w-5 h-5" />}
              color="green"
              values={marginPct.numValues}
              expression={marginPct.expression}
              suffix="%"
            />
          )}
          {invValue && invValue.resultType === 'number' && (
            <NumericFormulaCard
              title="Inventory Value"
              icon={<Package className="w-5 h-5" />}
              color="blue"
              values={invValue.numValues}
              expression={invValue.expression}
              prefix="$"
            />
          )}
          {profitScore && profitScore.resultType === 'number' && (
            <NumericFormulaCard
              title="Profit Score"
              icon={<DollarSign className="w-5 h-5" />}
              color="purple"
              values={profitScore.numValues}
              expression={profitScore.expression}
            />
          )}
          {pricePerKg && pricePerKg.resultType === 'number' && (
            <NumericFormulaCard
              title="Price/kg"
              icon={<Scale className="w-5 h-5" />}
              color="amber"
              values={pricePerKg.numValues}
              expression={pricePerKg.expression}
              prefix="$"
            />
          )}
        </div>

        {/* ─── Text / Category Formula Distributions ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Object.entries(analytics)
            .filter(([, a]) => a.resultType === 'text' && Object.keys(a.textValues).length > 0)
            .map(([propId, a]) => (
              <TextDistributionCard key={propId} title={a.propName} expression={a.expression} textValues={a.textValues} total={a.total} />
            ))}
        </div>

        {/* ─── Boolean Formula Summary ─── */}
        {Object.values(analytics).some((a) => a.resultType === 'boolean') && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-gray-400" /> Boolean Formula Results
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(analytics)
                .filter(([, a]) => a.resultType === 'boolean')
                .map(([propId, a]) => {
                  const trueRate = a.boolTrue + a.boolFalse > 0 ? Math.round((a.boolTrue / (a.boolTrue + a.boolFalse)) * 100) : 0;
                  return (
                    <div key={propId} className="border border-gray-100 rounded-lg p-4">
                      <div className="text-sm font-semibold text-gray-900 mb-1">{a.propName}</div>
                      <div className="text-[10px] text-gray-400 font-mono mb-3 truncate" title={a.expression}>
                        {a.expression}
                      </div>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex-1">
                          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden flex">
                            <div className="h-3 bg-green-500 transition-all" style={{ width: `${trueRate}%` }} />
                            <div className="h-3 bg-red-300 transition-all" style={{ width: `${100 - trueRate}%` }} />
                          </div>
                        </div>
                        <span className="text-sm font-bold text-gray-900 tabular-nums">{trueRate}%</span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-green-500 rounded-full inline-block" /> True: {a.boolTrue}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-red-300 rounded-full inline-block" /> False: {a.boolFalse}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* ─── All Formulas Grid ─── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Sigma className="w-4 h-4 text-gray-400" /> All Formula Columns Overview
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-2 text-xs text-gray-500 font-medium">Name</th>
                  <th className="text-left py-2 px-2 text-xs text-gray-500 font-medium">Expression</th>
                  <th className="text-center py-2 px-2 text-xs text-gray-500 font-medium">Type</th>
                  <th className="text-center py-2 px-2 text-xs text-gray-500 font-medium">Evals</th>
                  <th className="text-center py-2 px-2 text-xs text-gray-500 font-medium">Errors</th>
                  <th className="text-center py-2 px-2 text-xs text-gray-500 font-medium">Success</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(analytics).map(([propId, a]) => {
                  const rate = a.total > 0 ? Math.round(((a.total - a.errors) / a.total) * 100) : 100;
                  return (
                    <tr key={propId} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 px-2 font-medium text-gray-900">{a.propName}</td>
                      <td className="py-2 px-2 text-gray-500 font-mono text-xs truncate max-w-[300px]" title={a.expression}>
                        {a.expression}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            a.resultType === 'number'
                              ? 'bg-blue-100 text-blue-700'
                              : a.resultType === 'boolean'
                                ? 'bg-green-100 text-green-700'
                                : a.resultType === 'text'
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {a.resultType}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center text-gray-600 tabular-nums">{a.total}</td>
                      <td className="py-2 px-2 text-center tabular-nums">
                        <span className={a.errors > 0 ? 'text-red-600 font-bold' : 'text-gray-400'}>{a.errors}</span>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className={`font-bold tabular-nums ${rate === 100 ? 'text-green-600' : rate > 90 ? 'text-amber-600' : 'text-red-600'}`}>
                          {rate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── Sample Results Table ─── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" /> Sample Computed Values (First 15 Products)
          </h3>
          <SampleResultsTable formulaResults={formulaResults} openPage={openPage} />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function KpiCard({
  icon,
  color,
  label,
  value,
  subtext,
}: {
  icon: React.ReactNode;
  color: string;
  label: string;
  value: number | string;
  subtext?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
      <div className={`p-2.5 rounded-lg ${STAT_BG[color] || STAT_BG.blue}`}>{icon}</div>
      <div>
        <div className="text-2xl font-bold text-gray-900 tabular-nums leading-none mb-1">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        <div className="text-xs text-gray-500">{label}</div>
        {subtext && <div className="text-[10px] text-gray-400 mt-0.5">{subtext}</div>}
      </div>
    </div>
  );
}

function NumericFormulaCard({
  title,
  icon,
  color,
  values,
  expression,
  prefix = '',
  suffix = '',
}: {
  title: string;
  icon: React.ReactNode;
  color: string;
  values: number[];
  expression: string;
  prefix?: string;
  suffix?: string;
}) {
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
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className={`p-2 rounded-lg ${STAT_BG[color] || STAT_BG.blue}`}>{icon}</div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <p className="text-[10px] text-gray-400 font-mono truncate max-w-[300px]" title={expression}>
            {expression}
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: 'Average', val: fmt(avg) },
          { label: 'Median', val: fmt(median) },
          { label: 'Std Dev', val: fmt(stddev) },
          { label: 'Min', val: fmt(min) },
          { label: 'Max', val: fmt(max) },
          { label: 'Sum', val: fmt(sum) },
        ].map((s) => (
          <div key={s.label} className="bg-gray-50 rounded-lg p-2.5 text-center">
            <div className="text-sm font-bold text-gray-900 tabular-nums">{s.val}</div>
            <div className="text-[9px] text-gray-400 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Histogram */}
      <div className="flex items-end gap-1 h-16">
        {buckets.map((count, i) => {
          const pct = maxBucket > 0 ? (count / maxBucket) * 100 : 0;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <span className="text-[8px] text-gray-400 tabular-nums">{count > 0 ? count : ''}</span>
              <div
                className="w-full rounded-t transition-all hover:opacity-80"
                style={{ height: `${Math.max(pct, 3)}%`, backgroundColor: COLORS[i % COLORS.length] }}
                title={`${fmt(min + i * bucketSize)} – ${fmt(min + (i + 1) * bucketSize)}: ${count}`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[8px] text-gray-400 mt-1">
        <span>{fmt(min)}</span>
        <span>Distribution</span>
        <span>{fmt(max)}</span>
      </div>
    </div>
  );
}

function TextDistributionCard({
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
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <span className="text-[10px] text-gray-400 ml-auto">{sorted.length} distinct values</span>
      </div>
      <p className="text-[10px] text-gray-400 font-mono truncate mb-4" title={expression}>
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
                  <span className="text-gray-700 font-medium truncate max-w-[180px]">{label}</span>
                  <span className="text-gray-400 tabular-nums ml-2">
                    {count} ({pct}%)
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
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
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="middle" className="text-sm font-bold fill-gray-900">
        {total}
      </text>
    </svg>
  );
}

function FormulaTypePie({ analytics }: { analytics: Record<string, { resultType: string }> }) {
  const counts: Record<string, number> = {};
  Object.values(analytics).forEach((a) => {
    counts[a.resultType] = (counts[a.resultType] || 0) + 1;
  });
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, c]) => s + c, 0);
  const typeColors: Record<string, string> = { number: '#3b82f6', boolean: '#10b981', text: '#8b5cf6', mixed: '#94a3b8' };

  if (total === 0)
    return <p className="text-sm text-gray-400 text-center py-4">No formulas</p>;

  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  let cum = 0;
  const size = 120;

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        {entries.map(([type, count]) => {
          const pct = count / total;
          const dasharray = `${circumference * pct} ${circumference * (1 - pct)}`;
          const rotation = cum * 360 - 90;
          cum += pct;
          return (
            <circle
              key={type}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={typeColors[type] || '#94a3b8'}
              strokeWidth={18}
              strokeDasharray={dasharray}
              transform={`rotate(${rotation} ${size / 2} ${size / 2})`}
            />
          );
        })}
        <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="middle" className="text-lg font-bold fill-gray-900">
          {total}
        </text>
      </svg>
      <div className="flex flex-col gap-2">
        {entries.map(([type, count]) => (
          <div key={type} className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: typeColors[type] || '#94a3b8' }} />
            <span className="text-gray-700 capitalize font-medium">{type}</span>
            <span className="text-gray-400 tabular-nums">
              {count} ({Math.round((count / total) * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ErrorBarChart({ analytics }: { analytics: Record<string, { propName: string; total: number; errors: number }> }) {
  const entries = Object.values(analytics).sort((a, b) => b.errors - a.errors);
  const maxTotal = Math.max(...entries.map((e) => e.total), 1);

  return (
    <div className="flex flex-col gap-2.5 overflow-auto max-h-52">
      {entries.map((a) => {
        const errorRate = a.total > 0 ? (a.errors / a.total) * 100 : 0;
        const successRate = 100 - errorRate;
        return (
          <div key={a.propName}>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-gray-700 font-medium truncate">{a.propName}</span>
              <span className={`tabular-nums ${a.errors > 0 ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                {a.errors > 0 ? `${a.errors} err (${Math.round(errorRate)}%)` : '0 errors'}
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden flex">
              <div className="h-2 bg-green-400" style={{ width: `${successRate}%` }} />
              {a.errors > 0 && <div className="h-2 bg-red-400" style={{ width: `${errorRate}%` }} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ComplexityChart({ analytics }: { analytics: Record<string, { propName: string; expression: string }> }) {
  // Measure complexity by expression length + number of function calls
  const entries = Object.values(analytics)
    .map((a) => {
      const fnCalls = (a.expression.match(/[a-zA-Z]+\(/g) || []).length;
      const depth = Math.max(...Array.from(a.expression).reduce(
        (acc, ch) => {
          if (ch === '(') acc.push((acc[acc.length - 1] || 0) + 1);
          else if (ch === ')') acc.push((acc[acc.length - 1] || 1) - 1);
          return acc;
        },
        [0] as number[]
      ));
      return { name: a.propName, length: a.expression.length, fnCalls, depth, score: fnCalls * 10 + depth * 5 + a.expression.length };
    })
    .sort((a, b) => b.score - a.score);
  const maxScore = Math.max(...entries.map((e) => e.score), 1);

  return (
    <div className="flex flex-col gap-2.5 overflow-auto max-h-52">
      {entries.map((e) => {
        const pct = (e.score / maxScore) * 100;
        return (
          <div key={e.name}>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-gray-700 font-medium truncate">{e.name}</span>
              <span className="text-gray-400 tabular-nums">
                {e.fnCalls} fn · depth {e.depth}
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all"
                style={{
                  width: `${pct}%`,
                  backgroundColor: pct > 70 ? '#ef4444' : pct > 40 ? '#f59e0b' : '#10b981',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SampleResultsTable({
  formulaResults,
  openPage,
}: {
  formulaResults: FormulaResult[];
  openPage: (id: string) => void;
}) {
  const sampleCount = 15;
  // Get first N pages from the first formula result
  const samplePages = formulaResults[0]?.results.slice(0, sampleCount) || [];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 px-2 text-gray-500 font-medium sticky left-0 bg-white">Product</th>
            {formulaResults.map((fr) => (
              <th key={fr.propId} className="text-right py-2 px-2 text-gray-500 font-medium whitespace-nowrap">
                {fr.propName}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {samplePages.map((sp, rowIdx) => (
            <tr
              key={sp.pageId}
              className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
              onClick={() => openPage(sp.pageId)}
            >
              <td className="py-1.5 px-2 text-gray-900 truncate max-w-[180px] sticky left-0 bg-white font-medium">
                {sp.pageName || 'Untitled'}
              </td>
              {formulaResults.map((fr) => {
                const res = fr.results[rowIdx];
                const val = res?.value;
                const isError = res?.error;
                return (
                  <td key={fr.propId} className="py-1.5 px-2 text-right tabular-nums whitespace-nowrap">
                    {isError ? (
                      <span className="text-red-400">#ERR</span>
                    ) : typeof val === 'boolean' ? (
                      <span className={val ? 'text-green-600' : 'text-gray-400'}>{val ? '✓' : '✗'}</span>
                    ) : typeof val === 'number' ? (
                      <span className="text-gray-700">{val.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    ) : (
                      <span className="text-gray-600 truncate max-w-[120px] inline-block">{String(val ?? '—')}</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
