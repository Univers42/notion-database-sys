/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   computedSlice.ts                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:42:38 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 13:58:30 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { Page } from '../../types/database';
import { initFormulaEngine, evalFormula, isWasmReady } from '../../lib/engine/bridge';
import { getCachedFormula, setCachedFormula } from '../../lib/formula/formulaCache';
import { evaluateFilter } from '../../lib/filter/evaluateFilter';
import { compareValues } from '../../lib/filter/compareValues';
import { searchPage, buildGroups, formatFormulaResult, computeRollup } from './storeHelpers';

initFormulaEngine().catch(() => {});

let pagesForViewCache: {
  pagesRef: Record<string, unknown> | null;
  viewsRef: Record<string, unknown> | null;
  searchQuery: string;
  results: Map<string, Page[]>;
} = { pagesRef: null, viewsRef: null, searchQuery: '', results: new Map() };

import type { StoreSet, StoreGet } from '../dbms/hardcoded/storeTypes';

/**
 * Creates the computed/read-only helpers slice for the Zustand store.
 *
 * Provides derived data: filtered/sorted pages, grouped pages, formula
 * resolution, rollup aggregation, and smart view defaults.
 */
export function createComputedSlice(_set: StoreSet, get: StoreGet) {
  return {
    getPageTitle: (page: Page) => {
      const state = get();
      const db = state.databases[page.databaseId];
      if (!db) return 'Untitled';
      return page.properties[db.titlePropertyId] || 'Untitled';
    },

    getPagesForView: (viewId: string) => {
      const state = get();
      const view = state.views[viewId];
      if (!view) return [];
      const db = state.databases[view.databaseId];
      if (!db) return [];

      if (
        pagesForViewCache.pagesRef !== state.pages ||
        pagesForViewCache.viewsRef !== state.views ||
        pagesForViewCache.searchQuery !== state.searchQuery
      ) {
        pagesForViewCache = {
          pagesRef: state.pages, viewsRef: state.views,
          searchQuery: state.searchQuery, results: new Map(),
        };
      }
      const cached = pagesForViewCache.results.get(viewId);
      if (cached) return cached;

      let result = Object.values(state.pages).filter(
        p => p.databaseId === view.databaseId && !p.archived,
      );

      if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase();
        result = result.filter(page => searchPage(page, q, db, state));
      }

      if (view.filters.length > 0) {
        result = result.filter(page => {
          const results = view.filters.map(f =>
            evaluateFilter(page, f, db.properties[f.propertyId]),
          );
          return view.filterConjunction === 'or'
            ? results.some(Boolean)
            : results.every(Boolean);
        });
      }

      if (view.sorts.length > 0) {
        result.sort((a, b) => {
          for (const sort of view.sorts) {
            const cmp = compareValues(
              a.properties[sort.propertyId],
              b.properties[sort.propertyId],
              sort.direction,
            );
            if (cmp !== 0) return cmp;
          }
          // Stable tiebreaker: creation order prevents shuffling
          // when all user-sort columns have equal values.
          return (a.createdAt || '').localeCompare(b.createdAt || '');
        });
      } else {
        // No user sorts → preserve stable creation order so rows never
        // shuffle when a cell value changes or the view re-renders.
        result.sort((a, b) =>
          (a.createdAt || '').localeCompare(b.createdAt || ''),
        );
      }

      pagesForViewCache.results.set(viewId, result);
      return result;
    },

    getGroupedPages: (viewId: string) => {
      const state = get();
      const view = state.views[viewId];
      if (!view?.grouping) return [];
      const db = state.databases[view.databaseId];
      if (!db) return [];
      const pages = state.getPagesForView(viewId);
      const groupProp = db.properties[view.grouping.propertyId];
      if (!groupProp) return [];
      return buildGroups(pages, groupProp, view.grouping);
    },

    resolveFormula: (databaseId: string, page: Page, expression: string) => {
      const cached = getCachedFormula(expression, page.id, page.updatedAt);
      if (cached !== undefined) return cached;
      try {
        const db = get().databases[databaseId];
        if (!db) return '#ERROR';
        const props: Record<string, unknown> = {};
        for (const sp of Object.values(db.properties)) {
          props[sp.name] = page.properties[sp.id] ?? null;
        }
        try {
          if (isWasmReady()) {
            const result = evalFormula(expression, props);
            const formatted = formatFormulaResult(result);
            if (formatted !== undefined) {
              setCachedFormula(expression, page.id, page.updatedAt, formatted);
              return formatted;
            }
          }
        } catch { /* WASM failed */ }
        return '';
      } catch {
        setCachedFormula(expression, page.id, page.updatedAt, '#ERROR');
        return '#ERROR';
      }
    },

    resolveRollup: (databaseId: string, page: Page, propertyId: string) => {
      const state = get();
      const db = state.databases[databaseId];
      if (!db) return null;
      const prop = db.properties[propertyId];
      if (!prop?.rollupConfig) return null;
      const { relationPropertyId, targetPropertyId, function: fn } = prop.rollupConfig;
      const ids: string[] = page.properties[relationPropertyId] || [];
      const related = ids.map(id => state.pages[id]).filter(Boolean);
      return computeRollup(fn, related, targetPropertyId);
    },

    getSmartDefaults: (databaseId: string) => {
      const db = get().databases[databaseId];
      if (!db) return { suggestedView: 'table' };
      const props = Object.values(db.properties);
      const hasStatus = props.some(
        p => p.type === 'status' || (p.type === 'select' && /status|stage|phase/i.test(p.name)),
      );
      const hasDate = props.some(p => p.type === 'date');
      const selectProp = props.find(p => p.type === 'status' || p.type === 'select');
      const dateProp = props.find(p => p.type === 'date');
      let suggestedView = 'table';
      if (hasStatus) suggestedView = 'board';
      else if (hasDate) suggestedView = 'calendar';
      return {
        suggestedView,
        suggestedGroupBy: selectProp?.id,
        suggestedSortBy: dateProp
          ? { propertyId: dateProp.id, direction: 'asc' as const }
          : undefined,
        suggestedCalendarBy: dateProp?.id,
        suggestedTimelineBy: dateProp?.id,
      };
    },
  };
}
