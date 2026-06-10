/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   bindViewSource.ts                                  :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 12:00:00 by dlesieur          #+#    #+#             */
/*                                                +#+#+#+#+#+   +#+           */
/* ************************************************************************** */

/**
 * Rebinds ONE view to another data source: loads the source through the
 * registered provider, merges its databases+pages into the running store and
 * swaps the view's databaseId with property references remapped — all in a
 * SINGLE setState so the host's persist hook sees one coherent transition
 * (live hosts diff per-table and ignore foreign records; known hosts persist
 * the merged snapshot, which makes the rebind survive reloads). Never touches
 * activeViewId (house rule: only setActiveView may). Loaded views are NOT
 * merged — the foreign source's own view tabs stay out of this database.
 */

import type { DatabaseSchema, NotionState, Page, ViewConfig } from '../../component/types';
import { remapViewToSource } from '../../lib/sourceRemap';
import { loadRegisteredDataSource } from './dataSourceRegistry';

/** Duck-typed store handle (avoids importing the zustand store: no cycles). */
export interface SourceBindStore {
  getState(): NotionState & { views: Record<string, ViewConfig> };
  setState(partial: {
    databases?: Record<string, DatabaseSchema>;
    pages?: Record<string, Page>;
    views?: Record<string, ViewConfig>;
  }): void;
}

/** Rebind `viewId` to `sourceId`. Resolves true when the view changed. */
export async function bindViewSource(
  store: SourceBindStore,
  viewId: string,
  sourceId: string,
): Promise<boolean> {
  const state = store.getState();
  const view = state.views[viewId];
  if (!view || view.databaseId === sourceId) return false;

  // Always ask the provider (live sources refresh on every bind); fall back
  // to a database already present in the store (e.g. another view loaded it).
  const loaded = await loadRegisteredDataSource(sourceId);
  const newDb = loaded?.databases[sourceId] ?? state.databases[sourceId];
  if (!newDb) {
    throw new Error(`Data source "${sourceId}" is not available from any registered provider.`);
  }

  const fresh = store.getState(); // re-read: the load above is async
  const currentView = fresh.views[viewId];
  if (!currentView) return false;
  const remapped = remapViewToSource(
    currentView,
    fresh.databases[currentView.databaseId] ?? null,
    newDb,
  );
  store.setState({
    databases: { ...fresh.databases, ...(loaded?.databases ?? {}), [newDb.id]: newDb },
    pages: { ...fresh.pages, ...(loaded?.pages ?? {}) },
    views: { ...fresh.views, [viewId]: remapped },
  });
  return true;
}
