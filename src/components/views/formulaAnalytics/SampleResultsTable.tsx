/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   SampleResultsTable.tsx                              :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:38:16 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 16:38:17 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import type { FormulaResult } from './constants';

export function SampleResultsTable({
  formulaResults,
  openPage,
}: Readonly<{
  formulaResults: FormulaResult[];
  openPage: (id: string) => void;
}>) {
  const sampleCount = 15;
  // Get first N pages from the first formula result
  const samplePages = formulaResults[0]?.results.slice(0, sampleCount) || [];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-line">
            <th className="text-left py-2 px-2 text-ink-secondary font-medium sticky left-0 bg-surface-primary">Product</th>
            {formulaResults.map((fr) => (
              <th key={fr.propId} className="text-right py-2 px-2 text-ink-secondary font-medium whitespace-nowrap">
                {fr.propName}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {samplePages.map((sp, rowIdx) => (
            <tr
              key={sp.pageId}
              className="border-b border-line-faint hover:bg-hover-surface cursor-pointer"
              onClick={() => openPage(sp.pageId)}
            >
              <td className="py-1.5 px-2 text-ink truncate max-w-[180px] sticky left-0 bg-surface-primary font-medium">
                {sp.pageName || 'Untitled'}
              </td>
              {formulaResults.map((fr) => {
                const res = fr.results[rowIdx];
                const val = res?.value;
                const isError = res?.error;
                return (
                  <td key={fr.propId} className="py-1.5 px-2 text-right tabular-nums whitespace-nowrap">
                    {isError ? (
                      <span className="text-danger-text-faint">#ERR</span>
                    ) : typeof val === 'boolean' ? (
                      <span className={val ? 'text-success-text' : 'text-ink-muted'}>{val ? '✓' : '✗'}</span>
                    ) : typeof val === 'number' ? (
                      <span className="text-ink-body">{val.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    ) : (
                      <span className="text-ink-body-light truncate max-w-[120px] inline-block">{String(val ?? '—')}</span>
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
