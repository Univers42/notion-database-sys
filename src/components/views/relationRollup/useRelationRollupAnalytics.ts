/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useRelationRollupAnalytics.ts                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:38:46 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/02 15:07:14 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { useMemo } from 'react';
import { useDatabaseStore } from '../../../store/dbms/hardcoded/useDatabaseStore';
import { useActiveViewId } from '../../../hooks/useDatabaseScope';
import type { SchemaProperty, RollupFunction, DatabaseSchema, Page, PropertyValue } from '../../../types/database';

// ─── Exported types ──────────────────────────────────────────────────────────

export type RelationTarget = {
  prop: SchemaProperty;
  targetDb: DatabaseSchema | null;
  isTwoWay: boolean;
  totalLinks: number;
  pagesWithLinks: number;
};

export type RollupResult = {
  prop: SchemaProperty;
  fn: RollupFunction;
  displayAs: string;
  results: { pageTitle: string; value: PropertyValue }[];
  numericResults: number[];
  errorCount: number;
};

export type RelationRollupAnalytics = {
  db: DatabaseSchema;
  dbPages: Page[];
  relationProps: SchemaProperty[];
  rollupProps: SchemaProperty[];
  relationTargets: RelationTarget[];
  totalLinks: number;
  linkedDbs: Set<string | undefined>;
  rollupResults: RollupResult[];
  fnDist: Record<string, number>;
  displayDist: Record<string, number>;
};

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useRelationRollupAnalytics(): RelationRollupAnalytics | null {
  const activeViewId = useActiveViewId();
  const { views, databases, pages, resolveRollup } = useDatabaseStore();
  const view = activeViewId ? views[activeViewId] : null;
  const db = view ? databases[view.databaseId] : null;

  return useMemo(() => {
    if (!db) return null;

    const allProps = Object.values(db.properties);
    const relationProps = allProps.filter(p => p.type === 'relation');
    const rollupProps = allProps.filter(p => p.type === 'rollup');
    const dbPages = Object.values(pages).filter(p => p.databaseId === db.id);

    // ─── Relation analytics ──────────────────────────────────
    const relationTargets: RelationTarget[] = relationProps.map(rp => ({
      prop: rp,
      targetDb: rp.relationConfig ? databases[rp.relationConfig.databaseId] : null,
      isTwoWay: rp.relationConfig?.type === 'two_way',
      totalLinks: dbPages.reduce((sum, pg) => {
        const ids: string[] = pg.properties[rp.id] || [];
        return sum + ids.length;
      }, 0),
      pagesWithLinks: dbPages.filter(pg => {
        const ids: string[] = pg.properties[rp.id] || [];
        return ids.length > 0;
      }).length,
    }));

    const totalLinks = relationTargets.reduce((s, r) => s + r.totalLinks, 0);
    const linkedDbs = new Set(relationTargets.map(r => r.targetDb?.id).filter(Boolean));

    // ─── Rollup analytics ────────────────────────────────────
    const rollupResults: RollupResult[] = rollupProps.map(rp => {
      const results: { pageTitle: string; value: PropertyValue }[] = [];
      const numericResults: number[] = [];
      let errorCount = 0;

      for (const pg of dbPages) {
        const title = pg.properties[db.titlePropertyId] || 'Untitled';
        try {
          const val = resolveRollup(db.id, pg, rp.id);
          results.push({ pageTitle: title, value: val });
          if (typeof val === 'number' && !isNaN(val)) numericResults.push(val);
        } catch {
          errorCount++;
          results.push({ pageTitle: title, value: '#ERROR' });
        }
      }

      return {
        prop: rp,
        fn: rp.rollupConfig?.function || 'count_all',
        displayAs: rp.rollupConfig?.displayAs || 'number',
        results,
        numericResults,
        errorCount,
      };
    });

    // Function distribution
    const fnDist: Record<string, number> = {};
    for (const rr of rollupResults) {
      fnDist[rr.fn] = (fnDist[rr.fn] || 0) + 1;
    }

    // Display-as distribution
    const displayDist: Record<string, number> = {};
    for (const rr of rollupResults) {
      displayDist[rr.displayAs] = (displayDist[rr.displayAs] || 0) + 1;
    }

    return {
      db, dbPages, relationProps, rollupProps,
      relationTargets, totalLinks, linkedDbs,
      rollupResults, fnDist, displayDist,
    };
  }, [db, databases, pages, resolveRollup]);
}
