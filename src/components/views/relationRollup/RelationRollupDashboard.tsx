/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   RelationRollupDashboard.tsx                        :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:38:46 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/03 00:41:44 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { useDatabaseStore } from '../../../store/dbms/hardcoded/useDatabaseStore';
import { useRelationRollupAnalytics } from './useRelationRollupAnalytics';
import {
  KpiCard,
  RelationMapSection,
  FunctionDistSection,
  DisplayFormatSection,
  CompletionRingsSection,
  NumericRollupTable,
  RollupResultsGrid,
  DataFlowSection,
  EdgeCasesSection,
} from './RelationRollupWidgets';

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

export function RelationRollupDashboard() {
  const { pages } = useDatabaseStore();
  const analytics = useRelationRollupAnalytics();

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
        <RelationMapSection relationTargets={relationTargets} dbPages={dbPages} />

        {/* ─── Rollup Function Distribution + Display Format ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <FunctionDistSection fnDist={fnDist} rollupCount={rollupProps.length} />
          <DisplayFormatSection displayDist={displayDist} rollupCount={rollupProps.length} />
        </div>

        {/* ─── Per-Project Completion Rings ─── */}
        <CompletionRingsSection analytics={analytics} />

        {/* ─── Numeric Rollup Comparison ─── */}
        <NumericRollupTable rollupResults={rollupResults} />

        {/* ─── Full Rollup Results Grid ─── */}
        <RollupResultsGrid analytics={analytics} />

        {/* ─── Data Flow Diagram ─── */}
        <DataFlowSection analytics={analytics} pages={pages} />

        {/* ─── Edge Cases Table ─── */}
        <EdgeCasesSection analytics={analytics} />
      </div>
    </div>
  );
}
