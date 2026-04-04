/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   FormulaOverviewTable.tsx                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:38:16 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 16:38:17 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { Sigma } from 'lucide-react';
import type { AnalyticsEntry } from './constants';
import { cn } from '../../../utils/cn';

const RESULT_TYPE_CLASSES: Record<string, string> = {
  number: 'bg-accent-muted text-accent-text',
  boolean: 'bg-success-surface-muted text-success-text-bold',
  text: 'bg-purple-surface-muted text-purple-text-bold',
};

function getRateColor(rate: number): string {
  if (rate === 100) return 'text-success-text';
  if (rate > 90) return 'text-amber-text';
  return 'text-danger-text';
}

export function FormulaOverviewTable({ analytics }: Readonly<{ analytics: Record<string, AnalyticsEntry> }>) {
  return (
    <div className={cn("bg-surface-primary rounded-xl border border-line p-5")}>
      <h3 className={cn("text-sm font-semibold text-ink mb-4 flex items-center gap-2")}>
        <Sigma className={cn("w-4 h-4 text-ink-muted")} /> All Formula Columns Overview
      </h3>
      <div className={cn("overflow-x-auto")}>
        <table className={cn("w-full text-sm")}>
          <thead>
            <tr className={cn("border-b border-line")}>
              <th className={cn("text-left py-2 px-2 text-xs text-ink-secondary font-medium")}>Name</th>
              <th className={cn("text-left py-2 px-2 text-xs text-ink-secondary font-medium")}>Expression</th>
              <th className={cn("text-center py-2 px-2 text-xs text-ink-secondary font-medium")}>Type</th>
              <th className={cn("text-center py-2 px-2 text-xs text-ink-secondary font-medium")}>Evals</th>
              <th className={cn("text-center py-2 px-2 text-xs text-ink-secondary font-medium")}>Errors</th>
              <th className={cn("text-center py-2 px-2 text-xs text-ink-secondary font-medium")}>Success</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(analytics).map(([propId, a]) => {
              const rate = a.total > 0 ? Math.round(((a.total - a.errors) / a.total) * 100) : 100;
              return (
                <tr key={propId} className={cn("border-b border-line-faint hover:bg-hover-surface")}>
                  <td className={cn("py-2 px-2 font-medium text-ink")}>{a.propName}</td>
                  <td className={cn("py-2 px-2 text-ink-secondary font-mono text-xs truncate max-w-[300px]")} title={a.expression}>{a.expression}</td>
                  <td className={cn("py-2 px-2 text-center")}>
                    <span className={cn(`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${RESULT_TYPE_CLASSES[a.resultType] || 'bg-surface-tertiary text-ink-body-light'}`)}>{a.resultType}</span>
                  </td>
                  <td className={cn("py-2 px-2 text-center text-ink-body-light tabular-nums")}>{a.total}</td>
                  <td className={cn("py-2 px-2 text-center tabular-nums")}>
                    <span className={cn(a.errors > 0 ? 'text-danger-text font-bold' : 'text-ink-muted')}>{a.errors}</span>
                  </td>
                  <td className={cn("py-2 px-2 text-center")}>
                    <span className={cn(`font-bold tabular-nums ${getRateColor(rate)}`)}>{rate}%</span>
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
