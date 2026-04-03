/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   FormulaAnalyticsDashboard.tsx                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:38:16 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 13:36:40 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useMemo } from 'react';
import { useDatabaseStore } from '../../../store/dbms/hardcoded/useDatabaseStore';
import { useActiveViewId } from '../../../hooks/useDatabaseScope';
import { Sigma, TrendingUp, AlertTriangle, CheckCircle, Package, DollarSign, Scale, Clock, Zap, BarChart3, PieChart } from 'lucide-react';
import type { FormulaResult, AnalyticsEntry } from '../formulaAnalytics/constants';
import { useFormulaAnalytics } from '../formulaAnalytics/useFormulaAnalytics';
import { KpiCard } from '../formulaAnalytics/KpiCard';
import { NumericFormulaCard } from '../formulaAnalytics/NumericFormulaCard';
import { TextDistributionCard } from '../formulaAnalytics/TextDistributionCard';
import { FormulaTypePie, ErrorBarChart, ComplexityChart } from '../formulaAnalytics/FormulaCharts';
import { BooleanSummary } from '../formulaAnalytics/BooleanSummary';
import { FormulaOverviewTable } from '../formulaAnalytics/FormulaOverviewTable';
import { SampleResultsTable } from '../formulaAnalytics/SampleResultsTable';
import { cn } from '../../../utils/cn';

/** Renders a comprehensive formula analytics dashboard with KPIs, charts, and tables. */
export function FormulaAnalyticsDashboard() {
  const activeViewId = useActiveViewId();
  const { views, databases, getPagesForView, resolveFormula, getPageTitle, openPage } =
    useDatabaseStore();
  const view = activeViewId ? views[activeViewId] : null;
  const database = view ? databases[view.databaseId] : null;
  const pages = useMemo(() => view ? getPagesForView(view.id) : [], [view, getPagesForView]);


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

  // Hook must be called unconditionally (React rules of hooks)
  const { analytics, totalFormulas, totalComputations, totalErrors, successRate } =
    useFormulaAnalytics(formulaResults);

  if (!view || !database) return null;

  // Pick a few interesting formulas for detail display
  const marginPct = analytics['pp-margin-pct'];
  const invValue = analytics['pp-inv-value'];
  const profitScore = analytics['pp-profit-score'];
  const pricePerKg = analytics['pp-price-per-kg'];

  return (
    <div className={cn("flex-1 overflow-auto p-6 bg-surface-secondary")}>
      <div className={cn("max-w-7xl mx-auto flex flex-col gap-6")}>
        <div className={cn("flex items-center gap-3")}>
          <div className={cn("p-2.5 rounded-xl bg-gradient-to-br from-gradient-violet-from to-gradient-violet-to text-ink-inverse")}>
            <Sigma className={cn("w-6 h-6")} />
          </div>
          <div>
            <h1 className={cn("text-xl font-bold text-ink")}>Formula Analytics</h1>
            <p className={cn("text-sm text-ink-secondary")}>
              {totalFormulas} formula columns evaluated across {pages.length} products ({totalComputations.toLocaleString()} computations)
            </p>
          </div>
        </div>

        <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-4")}>
          <KpiCard icon={<Sigma className={cn("w-5 h-5")} />} color="purple" label="Formula Columns" value={totalFormulas} />
          <KpiCard icon={<Zap className={cn("w-5 h-5")} />} color="blue" label="Total Evaluations" value={totalComputations} />
          <KpiCard icon={<CheckCircle className={cn("w-5 h-5")} />} color="green" label="Success Rate" value={`${successRate}%`} subtext={`${totalErrors} errors`} />
          <KpiCard icon={<AlertTriangle className={cn("w-5 h-5")} />} color={Number(totalErrors) > 0 ? 'red' : 'green'} label="Errors" value={totalErrors} subtext={Number(totalErrors) === 0 ? 'All clear!' : undefined} />
        </div>

        <div className={cn("grid grid-cols-1 lg:grid-cols-3 gap-6")}>
          <div className={cn("bg-surface-primary rounded-xl border border-line p-5")}>
            <h3 className={cn("text-sm font-semibold text-ink mb-4 flex items-center gap-2")}>
              <PieChart className={cn("w-4 h-4 text-ink-muted")} /> Result Type Distribution
            </h3>
            <FormulaTypePie analytics={analytics} />
          </div>
          <div className={cn("bg-surface-primary rounded-xl border border-line p-5")}>
            <h3 className={cn("text-sm font-semibold text-ink mb-4 flex items-center gap-2")}>
              <AlertTriangle className={cn("w-4 h-4 text-ink-muted")} /> Error Rate by Formula
            </h3>
            <ErrorBarChart analytics={analytics} />
          </div>
          <div className={cn("bg-surface-primary rounded-xl border border-line p-5")}>
            <h3 className={cn("text-sm font-semibold text-ink mb-4 flex items-center gap-2")}>
              <BarChart3 className={cn("w-4 h-4 text-ink-muted")} /> Expression Complexity
            </h3>
            <ComplexityChart analytics={analytics} />
          </div>
        </div>

        <div className={cn("grid grid-cols-1 lg:grid-cols-2 gap-6")}>
          {marginPct && marginPct.resultType === 'number' && (
            <NumericFormulaCard title="Margin %" icon={<TrendingUp className={cn("w-5 h-5")} />} color="green" values={marginPct.numValues} expression={marginPct.expression} suffix="%" />
          )}
          {invValue && invValue.resultType === 'number' && (
            <NumericFormulaCard title="Inventory Value" icon={<Package className={cn("w-5 h-5")} />} color="blue" values={invValue.numValues} expression={invValue.expression} prefix="$" />
          )}
          {profitScore && profitScore.resultType === 'number' && (
            <NumericFormulaCard title="Profit Score" icon={<DollarSign className={cn("w-5 h-5")} />} color="purple" values={profitScore.numValues} expression={profitScore.expression} />
          )}
          {pricePerKg && pricePerKg.resultType === 'number' && (
            <NumericFormulaCard title="Price/kg" icon={<Scale className={cn("w-5 h-5")} />} color="amber" values={pricePerKg.numValues} expression={pricePerKg.expression} prefix="$" />
          )}
        </div>

        <div className={cn("grid grid-cols-1 lg:grid-cols-2 gap-6")}>
          {(Object.entries(analytics) as [string, AnalyticsEntry][])
            .filter(([, a]) => a.resultType === 'text' && Object.keys(a.textValues).length > 0)
            .map(([propId, a]) => (
              <TextDistributionCard key={propId} title={a.propName} expression={a.expression} textValues={a.textValues} total={a.total} />
            ))}
        </div>

        <BooleanSummary analytics={analytics} />

        <FormulaOverviewTable analytics={analytics} />

        <div className={cn("bg-surface-primary rounded-xl border border-line p-5")}>
          <h3 className={cn("text-sm font-semibold text-ink mb-4 flex items-center gap-2")}>
            <Clock className={cn("w-4 h-4 text-ink-muted")} /> Sample Computed Values (First 15 Products)
          </h3>
          <SampleResultsTable formulaResults={formulaResults} openPage={openPage} />
        </div>
      </div>
    </div>
  );
}
