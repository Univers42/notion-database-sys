/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   BooleanSummary.tsx                                 :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:38:16 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 16:55:30 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { ShieldCheck } from 'lucide-react';
import type { AnalyticsEntry } from './constants';

export function BooleanSummary({ analytics }: { analytics: Record<string, AnalyticsEntry> }) {
  const boolEntries = Object.entries(analytics).filter(([, a]) => a.resultType === 'boolean');
  if (boolEntries.length === 0) return null;

  return (
    <div className="bg-surface-primary rounded-xl border border-line p-5">
      <h3 className="text-sm font-semibold text-ink mb-4 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-ink-muted" /> Boolean Formula Results
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {boolEntries.map(([propId, a]) => {
          const trueRate = a.boolTrue + a.boolFalse > 0 ? Math.round((a.boolTrue / (a.boolTrue + a.boolFalse)) * 100) : 0;
          return (
            <div key={propId} className="border border-line-light rounded-lg p-4">
              <div className="text-sm font-semibold text-ink mb-1">{a.propName}</div>
              <div className="text-[10px] text-ink-muted font-mono mb-3 truncate" title={a.expression}>{a.expression}</div>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex-1">
                  <div className="w-full bg-surface-tertiary rounded-full h-3 overflow-hidden flex">
                    <div className="h-3 bg-success transition-all" style={{ width: `${trueRate}%` }} />
                    <div className="h-3 bg-danger-surface-strong transition-all" style={{ width: `${100 - trueRate}%` }} />
                  </div>
                </div>
                <span className="text-sm font-bold text-ink tabular-nums">{trueRate}%</span>
              </div>
              <div className="flex justify-between text-xs text-ink-secondary">
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-success rounded-full inline-block" /> True: {a.boolTrue}</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-danger-surface-strong rounded-full inline-block" /> False: {a.boolFalse}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
