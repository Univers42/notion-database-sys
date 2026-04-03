/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   RelationRollupDashboard.tsx                        :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:38:46 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 13:36:40 by dlesieur         ###   ########.fr       */
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
import { cn } from '../../../utils/cn';

/** Render the full relation & rollup analytics dashboard with KPIs, charts, tables, and data flow. */
export function RelationRollupDashboard() {
  const { pages } = useDatabaseStore();
  const analytics = useRelationRollupAnalytics();

  if (!analytics) return <div className={cn("p-8 text-ink-muted")}>No data</div>;

  const {
    dbPages, relationProps, rollupProps,
    relationTargets, totalLinks, linkedDbs,
    rollupResults, fnDist, displayDist,
  } = analytics;

  return (
    <div className={cn("flex-1 overflow-auto bg-gradient-to-br from-gradient-surface-from to-gradient-surface-to p-6")}>
      <div className={cn("max-w-[1400px] mx-auto space-y-6")}>
        <div>
          <h2 className={cn("text-xl font-bold text-ink")}>Relation & Rollup Analytics</h2>
          <p className={cn("text-sm text-ink-secondary mt-1")}>
            Cross-database data flow &middot; {relationProps.length} relations &middot; {rollupProps.length} rollups &middot; {dbPages.length} records
          </p>
        </div>

        <div className={cn("grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3")}>
          <KpiCard label="Relations" value={relationProps.length} color="text-accent-text-light" />
          <KpiCard label="Rollups" value={rollupProps.length} color="text-purple-text" />
          <KpiCard label="Total Links" value={totalLinks} color="text-cyan-text" />
          <KpiCard label="Linked DBs" value={linkedDbs.size} color="text-amber-text" />
          <KpiCard label="Projects" value={dbPages.length} color="text-emerald-text" />
          <KpiCard label="Two-way" value={relationTargets.filter(r => r.isTwoWay).length} color="text-pink-text" />
        </div>

        <RelationMapSection relationTargets={relationTargets} dbPages={dbPages} />

        <div className={cn("grid grid-cols-1 lg:grid-cols-2 gap-4")}>
          <FunctionDistSection fnDist={fnDist} rollupCount={rollupProps.length} />
          <DisplayFormatSection displayDist={displayDist} rollupCount={rollupProps.length} />
        </div>

        <CompletionRingsSection analytics={analytics} />

        <NumericRollupTable rollupResults={rollupResults} />

        <RollupResultsGrid analytics={analytics} />

        <DataFlowSection analytics={analytics} pages={pages} />

        <EdgeCasesSection analytics={analytics} />
      </div>
    </div>
  );
}
