/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   viewSlice.ts                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/02 14:39:19 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/05 01:31:17 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { ViewConfig, Filter, Sort } from '../../types/database';
import type { StoreSet, StoreGet, DatabaseState } from '../dbms/hardcoded/storeTypes';
import { createFilterActions } from './viewFilterActions';
import { createSortActions } from './viewSortActions';
import { createPropertyActions } from './viewPropertyActions';

export type { ViewSliceState, ViewSliceActions, ViewSlice } from './viewSliceTypes';
import type { ViewSliceActions } from './viewSliceTypes';

/**
 * Creates the view CRUD slice for the Zustand store.
 *
 * Mutates `views` and `activeViewId` state. Handles filters, sorts,
 * grouping, and property visibility.
 */
export function createViewSlice(set: StoreSet, get: StoreGet): ViewSliceActions {
  return {
    addView: (view) => {
      const id = `v-${crypto.randomUUID().slice(0, 8)}`;
      set((state: DatabaseState) => ({
        views: { ...state.views, [id]: { ...view, id } as ViewConfig },
        activeViewId: id,
      }));
      return id;
    },
    updateView: (viewId, updates) => set((state: DatabaseState) => {
      const view = state.views[viewId];
      if (!view) return state;
      return { views: { ...state.views, [viewId]: { ...view, ...updates } } };
    }),
    updateViewSettings: (viewId, settings) => set((state: DatabaseState) => {
      const view = state.views[viewId];
      if (!view) return state;
      return {
        views: {
          ...state.views,
          [viewId]: { ...view, settings: { ...view.settings, ...settings } },
        },
      };
    }),

    deleteView: (viewId) => set((state: DatabaseState) => {
      const newViews = { ...state.views };
      delete newViews[viewId];
      const isActive = state.activeViewId === viewId;
      const firstRemaining = Object.keys(newViews)[0] || null;
      return { views: newViews, activeViewId: isActive ? firstRemaining : state.activeViewId };
    }),
    duplicateView: (viewId) => {
      const state = get();
      const view = state.views[viewId];
      if (!view) return;
      const id = `v-${crypto.randomUUID().slice(0, 8)}`;
      const newView: ViewConfig = {
        ...view,
        id,
        name: view.name + ' (copy)',
        filters: view.filters.map((f: Filter) => ({ ...f, id: crypto.randomUUID() })),
        sorts: view.sorts.map((s: Sort) => ({ ...s, id: crypto.randomUUID() })),
        settings: { ...view.settings },
      };
      set({ views: { ...state.views, [id]: newView }, activeViewId: id });
    },

    setActiveView: (viewId) => set({ activeViewId: viewId }),

    // Reorder one database's header tabs. The order is persisted as an explicit
    // `viewOrder` array ON THE DATABASE — not by reordering the views record,
    // whose key order doesn't survive a JSONB/JSON round-trip to the server.
    // Writing the database object (new ref) is what the object-database persist
    // path (mergeChangedRecords) picks up, so the order syncs server-side and
    // survives a reload on any device. Derivations sort by `viewOrder`.
    reorderViews: (databaseId, orderedIds) => set((state: DatabaseState) => {
      const database = state.databases[databaseId];
      if (!database) return state;
      return {
        databases: { ...state.databases, [databaseId]: { ...database, viewOrder: orderedIds } },
      };
    }),

    ...createFilterActions(set),
    ...createSortActions(set),
    ...createPropertyActions(set),
  };
}
