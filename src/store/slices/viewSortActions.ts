/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   viewSortActions.ts                                 :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/05 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/05 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { Sort } from '../../types/database';
import type { StoreSet, DatabaseState } from '../dbms/hardcoded/storeTypes';
import type { ViewSliceActions } from './viewSliceTypes';

type SortActions = Pick<ViewSliceActions, 'addSort' | 'setSort' | 'updateSort' | 'removeSort' | 'clearSorts'>;

/**
 * Creates the sort-related actions for the view slice.
 */
export function createSortActions(set: StoreSet): SortActions {
  return {
    addSort: (viewId, sort) => set((state: DatabaseState) => {
      const view = state.views[viewId];
      if (!view) return state;
      return {
        views: {
          ...state.views,
          [viewId]: { ...view, sorts: [...view.sorts, { ...sort, id: crypto.randomUUID() }] },
        },
      };
    }),

    /** Replaces all sorts with a single sort (used by column-header quick-sort). */
    setSort: (viewId, sort) => set((state: DatabaseState) => {
      const view = state.views[viewId];
      if (!view) return state;
      return {
        views: {
          ...state.views,
          [viewId]: { ...view, sorts: [{ ...sort, id: crypto.randomUUID() }] },
        },
      };
    }),

    updateSort: (viewId, sortId, updates) => set((state: DatabaseState) => {
      const view = state.views[viewId];
      if (!view) return state;
      return {
        views: {
          ...state.views,
          [viewId]: {
            ...view,
            sorts: view.sorts.map((s: Sort) => s.id === sortId ? { ...s, ...updates } : s),
          },
        },
      };
    }),

    removeSort: (viewId, sortId) => set((state: DatabaseState) => {
      const view = state.views[viewId];
      if (!view) return state;
      return {
        views: {
          ...state.views,
          [viewId]: { ...view, sorts: view.sorts.filter((s: Sort) => s.id !== sortId) },
        },
      };
    }),

    clearSorts: (viewId) => set((state: DatabaseState) => ({
      views: { ...state.views, [viewId]: { ...state.views[viewId], sorts: [] } },
    })),
  };
}
