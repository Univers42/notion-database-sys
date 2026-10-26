/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   computedSlice.ts                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:42:38 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 19:36:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { Page } from '../../types/database';
import { matchesFilterValue } from '../../lib/filter/evaluateFilter';
import { isIncompleteFilter } from '../../lib/filter/filterHelpers';
import { compareValues } from '../../lib/filter/compareValues';
import { compareWithManualOrder, manualOrderRank } from '../../lib/manualRowOrder';
import { searchPage, buildGroups, formatFormulaResult } from './storeHelpers';
import { cellValue, formulaValue, rollupValue, sortKey } from './cellValues';

import type { StoreSet, StoreGet } from '../dbms/hardcoded/storeTypes';

/**
 * Creates the computed/read-only helpers slice for the Zustand store.
 *
 * Provides derived data: filtered/sorted pages, grouped pages, formula
 * resolution, rollup aggregation, and smart view defaults.
 */
export function createComputedSlice(_set: StoreSet, get: StoreGet) {
  // Per-INSTANCE cache: createDatabaseStore() makes one store per mounted
  // ObjectDatabase, so a module-level cache would be shared across instances —
  // with two database surfaces mounted, each would evict the other's entries
  // on every render (full refilter+resort each time). One generation covers
  // both derived shapes; `results`/`groups` are keyed by viewId within it.
  // `databasesRef` is part of the generation because both filters and group
  // columns read db.properties (a new select option must surface a new group).
  let pagesForViewCache: {
    pagesRef: Record<string, unknown> | null;
    viewsRef: Record<string, unknown> | null;
    databasesRef: Record<string, unknown> | null;
    searchQuery: string;
    results: Map<string, Page[]>;
    groups: Map<string, ReturnType<typeof buildGroups>>;
  } = { pagesRef: null, viewsRef: null, databasesRef: null, searchQuery: '', results: new Map(), groups: new Map() };

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
        pagesForViewCache.databasesRef !== state.databases ||
        pagesForViewCache.searchQuery !== state.searchQuery
      ) {
        pagesForViewCache = {
          pagesRef: state.pages, viewsRef: state.views, databasesRef: state.databases,
          searchQuery: state.searchQuery, results: new Map(), groups: new Map(),
        };
      }
      const cached = pagesForViewCache.results.get(viewId);
      if (cached) return cached;

      let result = Object.values(state.pages).filter(
        p => p.databaseId === view.databaseId && !p.archived && !p.isTemplate,
      );

      if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase();
        result = result.filter(page => searchPage(page, q, db, state));
      }

      // A filter still waiting for its value, or on a deleted column, is
      // skipped rather than hiding every row (Notion behaviour).
      const filters = view.filters.filter(f => db.properties[f.propertyId] && !isIncompleteFilter(f));
      if (filters.length > 0) {
        result = result.filter(page => {
          const results = filters.map(f =>
            matchesFilterValue(cellValue(state, page, db.properties[f.propertyId]), f),
          );
          return view.filterConjunction === 'or'
            ? results.some(Boolean)
            : results.every(Boolean);
        });
      }

      const sorts = view.sorts.filter(sort => db.properties[sort.propertyId]);
      if (sorts.length > 0) {
        // Keys resolved once per row: a formula column would otherwise be
        // evaluated O(n log n) times inside the comparator.
        const keys = new Map(result.map(page => [
          page.id, sorts.map(sort => sortKey(state, page, db.properties[sort.propertyId])),
        ]));
        result.sort((a, b) => {
          const aKeys = keys.get(a.id) ?? [];
          const bKeys = keys.get(b.id) ?? [];
          for (let i = 0; i < sorts.length; i++) {
            const cmp = compareValues(aKeys[i], bKeys[i], sorts[i].direction);
            if (cmp !== 0) return cmp;
          }
          // Stable tiebreaker: creation order prevents shuffling
          // when all user-sort columns have equal values.
          return (a.createdAt || '').localeCompare(b.createdAt || '');
        });
      } else {
        // No user sorts → manual drag-order when the user has one, then stable
        // creation order so rows never shuffle when a cell value changes.
        const rank = manualOrderRank(view.settings?.manualRowOrder);
        result.sort((a, b) => compareWithManualOrder(a, b, rank));
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
      // getPagesForView refreshes the cache generation first (pages/views/
      // search identity), so a group hit below is always same-generation.
      const pages = state.getPagesForView(viewId);
      const cached = pagesForViewCache.groups.get(viewId);
      if (cached) return cached;
      const groupProp = db.properties[view.grouping.propertyId];
      if (!groupProp) return [];
      const groups = buildGroups(pages, groupProp, view.grouping, page => cellValue(state, page, groupProp));
      pagesForViewCache.groups.set(viewId, groups);
      return groups;
    },

    resolveFormula: (databaseId: string, page: Page, expression: string) => {
      const state = get();
      const db = state.databases[databaseId];
      if (!db) return '#ERROR';
      // The expression may be a draft from the formula editor, not the saved
      // one, so it is evaluated as an ad-hoc formula column of this database.
      const draft = { id: '__formula_preview__', name: '', type: 'formula' as const, formulaConfig: { expression } };
      try {
        return formatFormulaResult(formulaValue(state, page, draft)) ?? null;
      } catch {
        return '#ERROR';
      }
    },

    resolveRollup: (databaseId: string, page: Page, propertyId: string) => {
      const state = get();
      const prop = state.databases[databaseId]?.properties[propertyId];
      if (!prop?.rollupConfig) return null;
      const value = rollupValue(state, page, prop);
      // "Show original" over a date column lists Dates; render them as dates.
      return Array.isArray(value)
        ? value.map(item => (item instanceof Date ? formatFormulaResult(item) : item))
        : value;
    },

    getCellValue: (page: Page, propertyId: string) => {
      const state = get();
      const prop = state.databases[page.databaseId]?.properties[propertyId];
      return prop ? cellValue(state, page, prop) : undefined;
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
