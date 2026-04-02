/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   FormulaCharts.tsx                                  :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:38:16 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/02 02:10:37 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';

export function FormulaTypePie({ analytics }: { analytics: Record<string, { resultType: string }> }) {
  const counts: Record<string, number> = {};
  Object.values(analytics).forEach((a) => {
    counts[a.resultType] = (counts[a.resultType] || 0) + 1;
  });
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, c]) => s + c, 0);
  const typeColors: Record<string, string> = { number: 'var(--color-chart-1)', boolean: 'var(--color-chart-5)', text: 'var(--color-chart-2)', mixed: 'var(--color-slate)' };

  if (total === 0)
    return <p className="text-sm text-ink-muted text-center py-4">No formulas</p>;

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
              stroke={typeColors[type] || 'var(--color-slate)'}
              strokeWidth={18}
              strokeDasharray={dasharray}
              transform={`rotate(${rotation} ${size / 2} ${size / 2})`}
            />
          );
        })}
        <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="middle" className="text-lg font-bold fill-fill-primary">
          {total}
        </text>
      </svg>
      <div className="flex flex-col gap-2">
        {entries.map(([type, count]) => (
          <div key={type} className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: typeColors[type] || 'var(--color-slate)' }} />
            <span className="text-ink-body capitalize font-medium">{type}</span>
            <span className="text-ink-muted tabular-nums">
              {count} ({Math.round((count / total) * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ErrorBarChart({ analytics }: { analytics: Record<string, { propName: string; total: number; errors: number }> }) {
  const entries = Object.values(analytics).sort((a, b) => b.errors - a.errors);
  const _maxTotal = Math.max(...entries.map((e) => e.total), 1);

  return (
    <div className="flex flex-col gap-2.5 overflow-auto max-h-52">
      {entries.map((a) => {
        const errorRate = a.total > 0 ? (a.errors / a.total) * 100 : 0;
        const successRate = 100 - errorRate;
        return (
          <div key={a.propName}>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-ink-body font-medium truncate">{a.propName}</span>
              <span className={`tabular-nums ${a.errors > 0 ? 'text-danger-text-soft font-bold' : 'text-ink-muted'}`}>
                {a.errors > 0 ? `${a.errors} err (${Math.round(errorRate)}%)` : '0 errors'}
              </span>
            </div>
            <div className="w-full bg-surface-tertiary rounded-full h-2 overflow-hidden flex">
              <div className="h-2 bg-success-vivid" style={{ width: `${successRate}%` }} />
              {a.errors > 0 && <div className="h-2 bg-danger-vivid" style={{ width: `${errorRate}%` }} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getComplexityColor(pct: number): string {
  if (pct > 70) return 'var(--color-chart-7)';
  if (pct > 40) return 'var(--color-chart-4)';
  return 'var(--color-chart-5)';
}

export function ComplexityChart({ analytics }: { analytics: Record<string, { propName: string; expression: string }> }) {
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
              <span className="text-ink-body font-medium truncate">{e.name}</span>
              <span className="text-ink-muted tabular-nums">
                {e.fnCalls} fn · depth {e.depth}
              </span>
            </div>
            <div className="w-full bg-surface-tertiary rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all"
                style={{
                  width: `${pct}%`,
                  backgroundColor: getComplexityColor(pct),
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
