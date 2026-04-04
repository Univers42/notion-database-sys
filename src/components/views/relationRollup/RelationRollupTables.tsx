/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   RelationRollupTables.tsx                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:38:46 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 16:38:47 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import type { RelationRollupAnalytics, RollupResult } from './useRelationRollupAnalytics';
import { DisplayBadge, RollupCellValue } from './RelationRollupCards';
import { cn } from '../../../utils/cn';

export function NumericRollupTable({ rollupResults }: Readonly<{ rollupResults: RollupResult[] }>) {
  return (
    <div className={cn("bg-surface-primary rounded-xl border border-line p-5 shadow-sm")}>
      <h3 className={cn("text-sm font-semibold text-ink-body mb-4")}>Numeric Rollup Summary</h3>
      <div className={cn("overflow-x-auto")}>
        <table className={cn("min-w-full text-sm")}>
          <thead>
            <tr className={cn("border-b border-line")}>
              <th className={cn("text-left py-2 px-3 text-xs font-medium text-ink-secondary")}>Rollup</th>
              <th className={cn("text-left py-2 px-3 text-xs font-medium text-ink-secondary")}>Function</th>
              <th className={cn("text-left py-2 px-3 text-xs font-medium text-ink-secondary")}>Display</th>
              <th className={cn("text-right py-2 px-3 text-xs font-medium text-ink-secondary")}>Min</th>
              <th className={cn("text-right py-2 px-3 text-xs font-medium text-ink-secondary")}>Max</th>
              <th className={cn("text-right py-2 px-3 text-xs font-medium text-ink-secondary")}>Avg</th>
              <th className={cn("text-right py-2 px-3 text-xs font-medium text-ink-secondary")}>Sum</th>
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
                  <tr key={rr.prop.id} className={cn("border-b border-line-light hover:bg-hover-surface-soft")}>
                    <td className={cn("py-2 px-3 font-medium text-ink-strong")}>{rr.prop.name}</td>
                    <td className={cn("py-2 px-3 text-ink-secondary font-mono text-xs")}>{rr.fn}</td>
                    <td className={cn("py-2 px-3")}>
                      <DisplayBadge format={rr.displayAs} />
                    </td>
                    <td className={cn("py-2 px-3 text-right tabular-nums")}>{min.toLocaleString()}</td>
                    <td className={cn("py-2 px-3 text-right tabular-nums")}>{max.toLocaleString()}</td>
                    <td className={cn("py-2 px-3 text-right tabular-nums")}>{avg.toLocaleString()}</td>
                    <td className={cn("py-2 px-3 text-right tabular-nums font-medium")}>{sum.toLocaleString()}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function RollupResultsGrid({ analytics }: Readonly<{ analytics: RelationRollupAnalytics }>) {
  const { dbPages, rollupResults } = analytics;
  return (
    <div className={cn("bg-surface-primary rounded-xl border border-line p-5 shadow-sm")}>
      <h3 className={cn("text-sm font-semibold text-ink-body mb-4")}>All Rollup Results by Project</h3>
      <div className={cn("overflow-x-auto")}>
        <table className={cn("min-w-full text-sm")}>
          <thead>
            <tr className={cn("border-b border-line")}>
              <th className={cn("text-left py-2 px-2 text-xs font-medium text-ink-secondary sticky left-0 bg-surface-primary z-10")}>Project</th>
              {rollupResults.map(rr => (
                <th key={rr.prop.id} className={cn("text-right py-2 px-2 text-xs font-medium text-ink-secondary whitespace-nowrap")}>
                  {rr.prop.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dbPages.map(pg => {
              const title = pg.properties[analytics.db.titlePropertyId] || 'Untitled';
              return (
                <tr key={pg.id} className={cn("border-b border-line-light hover:bg-hover-surface-soft")}>
                  <td className={cn("py-1.5 px-2 font-medium text-ink-strong sticky left-0 bg-surface-primary whitespace-nowrap")}>
                    {pg.icon} {title}
                  </td>
                  {rollupResults.map(rr => {
                    const res = rr.results.find(r => r.pageTitle === title);
                    const val = res?.value;
                    return (
                      <td key={rr.prop.id} className={cn("py-1.5 px-2 text-right tabular-nums text-ink-body-light")}>
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
  );
}

export function EdgeCasesSection({ analytics }: Readonly<{ analytics: RelationRollupAnalytics }>) {
  const { dbPages, relationTargets } = analytics;
  return (
    <div className={cn("bg-surface-primary rounded-xl border border-line p-5 shadow-sm")}>
      <h3 className={cn("text-sm font-semibold text-ink-body mb-4")}>Edge Case Coverage</h3>
      <div className={cn("overflow-x-auto")}>
        <table className={cn("min-w-full text-sm")}>
          <thead>
            <tr className={cn("border-b border-line")}>
              <th className={cn("text-left py-2 px-3 text-xs font-medium text-ink-secondary")}>Project</th>
              {relationTargets.map(rt => (
                <th key={rt.prop.id} className={cn("text-center py-2 px-3 text-xs font-medium text-ink-secondary")}>{rt.prop.name}</th>
              ))}
              <th className={cn("text-center py-2 px-3 text-xs font-medium text-ink-secondary")}>Edge Case</th>
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
                <tr key={pg.id} className={cn("border-b border-line-light hover:bg-hover-surface-soft")}>
                  <td className={cn("py-1.5 px-3 font-medium text-ink-strong whitespace-nowrap")}>{pg.icon} {title}</td>
                  {relationTargets.map(rt => {
                    const ids: string[] = pg.properties[rt.prop.id] || [];
                    return (
                      <td key={rt.prop.id} className={cn("py-1.5 px-3 text-center")}>
                        <span className={cn(`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                          ids.length === 0 ? 'bg-danger-surface-muted text-danger-text' :
                          ids.length === 1 ? 'bg-warning-surface-muted text-warning-text-bold' :
                          'bg-success-surface-muted text-success-text-bold'
                        }`)}>
                          {ids.length}
                        </span>
                      </td>
                    );
                  })}
                  <td className={cn("py-1.5 px-3 text-center")}>
                    {edgeCases.length > 0 ? (
                      <div className={cn("flex flex-wrap gap-1 justify-center")}>
                        {edgeCases.map((ec, i) => (
                          <span key={i} className={cn("px-1.5 py-0.5 rounded text-[10px] bg-amber-surface text-amber-text-bold border border-amber-border whitespace-nowrap")}>{ec}</span>
                        ))}
                      </div>
                    ) : (
                      <span className={cn("text-xs text-ink-muted")}>Normal</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
