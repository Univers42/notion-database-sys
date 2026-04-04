/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   viewFilterActions.ts                               :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/05 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/05 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { Filter } from '../../types/database';
import type { StoreSet, DatabaseState } from '../dbms/hardcoded/storeTypes';
import type { ViewSliceActions } from './viewSliceTypes';

type FilterActions = Pick<ViewSliceActions, 'addFilter' | 'updateFilter' | 'removeFilter' | 'clearFilters'>;

/**
 * Creates the filter-related actions for the view slice.
 */
export function createFilterActions(set: StoreSet): FilterActions {
  return {
    addFilter: (viewId, filter) => set((state: DatabaseState) => {
      const view = state.views[viewId];
      if (!view) return state;
      return {
        views: {
          ...state.views,
          [viewId]: { ...view, filters: [...view.filters, { ...filter, id: crypto.randomUUID() }] },
        },
      };
    }),

    updateFilter: (viewId, filterId, updates) => set((state: DatabaseState) => {
      const view = state.views[viewId];
      if (!view) return state;
      return {
        views: {
          ...state.views,
          [viewId]: {
            ...view,
            filters: view.filters.map((f: Filter) => f.id === filterId ? { ...f, ...updates } : f),
          },
        },
      };
    }),

    removeFilter: (viewId, filterId) => set((state: DatabaseState) => {
      const view = state.views[viewId];
      if (!view) return state;
      return {
        views: {
          ...state.views,
          [viewId]: { ...view, filters: view.filters.filter((f: Filter) => f.id !== filterId) },
        },
      };
    }),

    clearFilters: (viewId) => set((state: DatabaseState) => ({
      views: { ...state.views, [viewId]: { ...state.views[viewId], filters: [] } },
    })),
  };
}
