/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   viewSlice.ts                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/02 14:39:19 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 13:43:26 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { ViewConfig, ViewSettings, Filter, Sort, Grouping } from '../../types/database';
import type { StoreSet, StoreGet, DatabaseState } from '../dbms/hardcoded/storeTypes';

export interface ViewSliceState {
  views: Record<string, ViewConfig>;
}

export interface ViewSliceActions {
  addView: (view: Omit<ViewConfig, 'id'>) => void;
  updateView: (viewId: string, updates: Partial<ViewConfig>) => void;
  updateViewSettings: (viewId: string, settings: Partial<ViewSettings>) => void;
  deleteView: (viewId: string) => void;
  duplicateView: (viewId: string) => void;
  setActiveView: (viewId: string) => void;
  addFilter: (viewId: string, filter: Omit<Filter, 'id'>) => void;
  updateFilter: (viewId: string, filterId: string, updates: Partial<Filter>) => void;
  removeFilter: (viewId: string, filterId: string) => void;
  clearFilters: (viewId: string) => void;
  addSort: (viewId: string, sort: Omit<Sort, 'id'>) => void;
  setSort: (viewId: string, sort: Omit<Sort, 'id'>) => void;
  updateSort: (viewId: string, sortId: string, updates: Partial<Sort>) => void;
  removeSort: (viewId: string, sortId: string) => void;
  clearSorts: (viewId: string) => void;
  setGrouping: (viewId: string, grouping: Grouping | undefined) => void;
  togglePropertyVisibility: (viewId: string, propertyId: string) => void;
  hideAllProperties: (viewId: string) => void;
  reorderProperties: (viewId: string, propertyIds: string[]) => void;
}

export type ViewSlice = ViewSliceState & ViewSliceActions;

/**
 * Creates the view CRUD slice for the Zustand store.
 *
 * Mutates `views` and `activeViewId` state. Handles filters, sorts,
 * grouping, and property visibility.
 */
export function createViewSlice(set: StoreSet, get: StoreGet): ViewSliceActions {
  return {
    addView: (view) => set((state: DatabaseState) => {
      const id = `v-${crypto.randomUUID().slice(0, 8)}`;
      return {
        views: { ...state.views, [id]: { ...view, id } as ViewConfig },
        activeViewId: id,
      };
    }),
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

    setGrouping: (viewId, grouping) => set((state: DatabaseState) => ({
      views: { ...state.views, [viewId]: { ...state.views[viewId], grouping } },
    })),

    togglePropertyVisibility: (viewId, propertyId) => set((state: DatabaseState) => {
      const view = state.views[viewId];
      if (!view) return state;
      const isVisible = view.visibleProperties.includes(propertyId);
      return {
        views: {
          ...state.views,
          [viewId]: {
            ...view,
            visibleProperties: isVisible
              ? view.visibleProperties.filter((id: string) => id !== propertyId)
              : [...view.visibleProperties, propertyId],
          },
        },
      };
    }),

    hideAllProperties: (viewId) => set((state: DatabaseState) => {
      const view = state.views[viewId];
      if (!view) return state;
      const db = state.databases[view.databaseId];
      const titlePropId = db?.titlePropertyId;
      return {
        views: {
          ...state.views,
          [viewId]: { ...view, visibleProperties: titlePropId ? [titlePropId] : [] },
        },
      };
    }),

    reorderProperties: (viewId, propertyIds) => set((state: DatabaseState) => ({
      views: { ...state.views, [viewId]: { ...state.views[viewId], visibleProperties: propertyIds } },
    })),
  };
}
