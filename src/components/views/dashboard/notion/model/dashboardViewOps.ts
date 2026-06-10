/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   dashboardViewOps.ts                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/10 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── dashboardViewOps — view CRUD for widgets, without tab side-effects ─────
// The store's addView/duplicateView switch activeViewId (correct for the tab
// row, wrong for dashboards). These helpers insert views directly via the
// store API, keep the active tab put, and return the new view id.

import type { StoreApi } from 'zustand';
import type { SchemaProperty, ViewConfig, ViewType } from '../../../../../types/database';

interface ViewStoreShape {
  views: Record<string, ViewConfig>;
  databases: Record<string, { properties: Record<string, SchemaProperty> }>;
}

/** Creates a default view of `type` for the database; returns its id. */
export function addViewForWidget(
  storeApi: StoreApi<ViewStoreShape>,
  databaseId: string,
  type: ViewType,
  name?: string,
): string {
  const state = storeApi.getState();
  const id = `v-${crypto.randomUUID().slice(0, 8)}`;
  const database = state.databases[databaseId];
  const view: ViewConfig = {
    id,
    databaseId,
    name: name ?? `${type.charAt(0).toUpperCase()}${type.slice(1)} widget`,
    type,
    filters: [],
    filterConjunction: 'and',
    sorts: [],
    visibleProperties: database ? Object.keys(database.properties) : [],
    settings: {},
  };
  storeApi.setState({ views: { ...state.views, [id]: view } } as Partial<ViewStoreShape>);
  return id;
}

/** Copies a view (filters/sorts/settings) without activating it. */
export function duplicateViewForWidget(
  storeApi: StoreApi<ViewStoreShape>,
  viewId: string,
): string | null {
  const state = storeApi.getState();
  const view = state.views[viewId];
  if (!view) return null;
  const id = `v-${crypto.randomUUID().slice(0, 8)}`;
  const copy: ViewConfig = {
    ...view,
    id,
    name: `${view.name} (copy)`,
    filters: view.filters.map(f => ({ ...f, id: crypto.randomUUID() })),
    sorts: view.sorts.map(s => ({ ...s, id: crypto.randomUUID() })),
    settings: { ...view.settings },
  };
  storeApi.setState({ views: { ...state.views, [id]: copy } } as Partial<ViewStoreShape>);
  return id;
}

/** Views of the same database that can back a widget (dashboards excluded). */
export function eligibleWidgetViews(
  views: Record<string, ViewConfig>,
  databaseId: string,
): ViewConfig[] {
  return Object.values(views)
    .filter(v => v.databaseId === databaseId && v.type !== 'dashboard');
}

/** Properties usable in the global filter bar (sorted by name). */
export function filterableProperties(
  properties: Record<string, SchemaProperty>,
): SchemaProperty[] {
  return Object.values(properties)
    .filter(p => p.type !== 'button')
    .sort((a, b) => a.name.localeCompare(b.name));
}
