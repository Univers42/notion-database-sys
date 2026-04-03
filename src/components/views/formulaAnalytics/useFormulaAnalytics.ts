/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useFormulaAnalytics.ts                             :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:38:16 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 13:36:40 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { useMemo } from 'react';
import type { FormulaResult, AnalyticsEntry } from './constants';

/** Compute aggregate analytics (counts, distributions, dominant type) from formula results. */
export function useFormulaAnalytics(formulaResults: FormulaResult[]) {
  const analytics = useMemo(() => {
    const map: Record<string, AnalyticsEntry> = {};

    formulaResults.forEach((fr) => {
      const entry: AnalyticsEntry = {
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

  const totalFormulas = formulaResults.length;
  const totalComputations = formulaResults.reduce((s, fr) => s + fr.results.length, 0);
  const entries = Object.values(analytics) as AnalyticsEntry[];
  const totalErrors = entries.reduce((s, a) => s + a.errors, 0);
  const successRate = totalComputations > 0 ? Math.round(((totalComputations - totalErrors) / totalComputations) * 100) : 100;

  return { analytics, totalFormulas, totalComputations, totalErrors, successRate };
}
