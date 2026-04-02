/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useDatabaseStore.ts                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:43:40 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/02 17:19:29 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── useDatabaseStore — Zustand store composing domain slices ────────────────

import { create } from 'zustand';
import type { DatabaseSchema, ViewConfig } from '../types/database';
import type { DatabaseState } from './dbms/hardcoded/storeTypes';
import { createDatabaseSlice } from './slices/databaseSlice';
import { createPageSlice } from './slices/pageSlice';
import { createViewSlice } from './slices/viewSlice';
import { createSelectionSlice } from './slices/selectionSlice';
import { createComputedSlice } from './slices/computedSlice';

/** Extended state with DBMS loading capabilities. */
interface DbmsExtras {
  /** Whether the store is currently loading data from DBMS. */
  dbmsLoading: boolean;
  /** Error from last DBMS load attempt. */
  dbmsError: string | null;
  /** Load full state from the active DBMS source via API.
   *  Pass `silent: true` for live-reload (no loading spinner). */
  loadFromSource: (source?: string, opts?: { silent?: boolean }) => Promise<void>;
  /** Persist a page property change to the active DBMS source. */
  persistPageProperty: (pageId: string, propertyId: string, value: unknown) => void;
  /** Surgically patch specific page properties without replacing entire state.
   *  Used by the file-watcher WebSocket handler for zero-reload updates. */
  patchPages: (patches: Record<string, Record<string, unknown>>) => void;
}

export type ExtendedDatabaseState = DatabaseState & DbmsExtras;

// ─── Helper: Debounced full-state persist for schema changes ────────────────
let persistTimer: ReturnType<typeof setTimeout> | null = null;
function persistState(get: () => ExtendedDatabaseState): void {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    const { databases, pages, views } = get();
    fetch('/api/dbms/state', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ databases, pages, views }),
    }).catch((err) => console.error('[dbms] State persist error:', err));
  }, 800);
}

// ═══════════════════════════════════════════════════════════════════════════════
// STORE
// ═══════════════════════════════════════════════════════════════════════════════

export const useDatabaseStore = create<ExtendedDatabaseState>((set, get) => ({
  databases: {},
  pages: {},
  views: {},
  activeViewId: null,
  openPageId: null,
  searchQuery: '',

  // DBMS loading state
  dbmsLoading: true,
  dbmsError: null,

  loadFromSource: async (source?: string, opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    if (!silent) set({ dbmsLoading: true, dbmsError: null });
    try {
      if (source) {
        const switchRes = await fetch('/api/dbms/source', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source }),
        });
        if (!switchRes.ok) throw new Error(`Switch failed: ${switchRes.statusText}`);
        const switched = await switchRes.json();
        const firstView = Object.keys(switched.views)[0] ?? null;
        set({
          databases: switched.databases,
          pages: switched.pages,
          views: switched.views,
          activeViewId: firstView,
          dbmsLoading: false,
        });
        return;
      }
      const res = await fetch('/api/dbms/state');
      if (!res.ok) throw new Error(`Load failed: ${res.statusText}`);
      const state = await res.json();
      const firstView = Object.keys(state.views)[0] ?? null;
      set({
        databases: state.databases,
        pages: state.pages,
        views: state.views,
        activeViewId: get().activeViewId ?? firstView,
        dbmsLoading: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[dbms] Load error:', message);
      if (!silent) set({ dbmsError: message, dbmsLoading: false });
    }
  },

  persistPageProperty: (() => {
    const timers = new Map<string, ReturnType<typeof setTimeout>>();
    return (pageId: string, propertyId: string, value: unknown) => {
      const key = `${pageId}::${propertyId}`;
      const prev = timers.get(key);
      if (prev) clearTimeout(prev);
      timers.set(key, setTimeout(() => {
        timers.delete(key);
        fetch(`/api/dbms/pages/${encodeURIComponent(pageId)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ propertyId, value }),
        }).catch((err) => console.error('[dbms] Persist error:', err));
      }, 600));
    };
  })(),

  patchPages: (patches: Record<string, Record<string, unknown>>) => {
    set((state) => {
      const updatedPages = { ...state.pages };
      for (const [pageId, propChanges] of Object.entries(patches)) {
        const page = updatedPages[pageId];
        if (!page) continue;
        updatedPages[pageId] = {
          ...page,
          properties: { ...page.properties, ...propChanges },
          updatedAt: new Date().toISOString(),
          lastEditedBy: 'External',
        };
      }
      return { pages: updatedPages };
    });
  },

  // ─── Compose domain slices ─────────────────────────────────
  ...createDatabaseSlice(set, get),
  ...createPageSlice(set, get),
  ...createViewSlice(set, get),
  ...createSelectionSlice(set),
  ...createComputedSlice(set, get),

  // ─── Override updatePageProperty to add write-through persistence ──
  updatePageProperty: (pageId: string, propertyId: string, value: unknown) => {
    // 1) Update Zustand state (same logic as pageSlice)
    set((state) => {
      const page = state.pages[pageId];
      if (!page) return state;
      return {
        pages: {
          ...state.pages,
          [pageId]: {
            ...page,
            properties: { ...page.properties, [propertyId]: value },
            updatedAt: new Date().toISOString(),
            lastEditedBy: 'You',
          },
        },
      };
    });
    // 2) Persist to DBMS backend (fire-and-forget)
    get().persistPageProperty(pageId, propertyId, value);
  },

  // ─── Override addPage to persist new record to DBMS ──
  addPage: (databaseId: string, properties: Record<string, unknown> = {}) => {
    // 1) Delegate to the slice for state update
    const sliceActions = createPageSlice(set, get);
    const pageId = sliceActions.addPage(databaseId, properties);
    // 2) Fire-and-forget persist to DBMS
    const page = get().pages[pageId];
    if (page) {
      fetch('/api/dbms/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ databaseId, properties: page.properties, pageId }),
      }).catch((err) => console.error('[dbms] addPage persist error:', err));
    }
    return pageId;
  },

  // ─── Override deletePage to persist removal to DBMS ──
  deletePage: (pageId: string) => {
    // 1) Delegate to slice for state update
    const sliceActions = createPageSlice(set, get);
    sliceActions.deletePage(pageId);
    // 2) Fire-and-forget persist to DBMS
    fetch(`/api/dbms/records/${encodeURIComponent(pageId)}`, {
      method: 'DELETE',
    }).catch((err) => console.error('[dbms] deletePage persist error:', err));
  },

  // ─── Override addProperty to persist new column to DBMS ──
  addProperty: (databaseId: string, name: string, type: string) => {
    // 1) Delegate to slice
    const sliceActions = createDatabaseSlice(set, get);
    sliceActions.addProperty(databaseId, name, type as never);
    // 2) Get the new propId and persist
    const db = get().databases[databaseId];
    if (db) {
      const newProp = Object.values(db.properties).find(
        (p) => p.name === name && p.type === type,
      );
      if (newProp) {
        fetch('/api/dbms/columns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            databaseId, columnName: name, propType: type, propId: newProp.id,
          }),
        }).catch((err) => console.error('[dbms] addProperty persist error:', err));
      }
    }
    // Persist full state for schema changes
    persistState(get);
  },

  // ─── Override deleteProperty to persist column removal to DBMS ──
  deleteProperty: (databaseId: string, propertyId: string) => {
    // 1) Delegate to slice
    const sliceActions = createDatabaseSlice(set, get);
    sliceActions.deleteProperty(databaseId, propertyId);
    // 2) Persist
    fetch(`/api/dbms/columns/${encodeURIComponent(databaseId)}/${encodeURIComponent(propertyId)}`, {
      method: 'DELETE',
    }).catch((err) => console.error('[dbms] deleteProperty persist error:', err));
    persistState(get);
  },

  // ─── Override updateProperty to detect type changes → DBMS ──
  updateProperty: (databaseId: string, propertyId: string, updates: Partial<{ name: string; type: string }>) => {
    const oldProp = get().databases[databaseId]?.properties[propertyId];
    // 1) Delegate to slice
    const sliceActions = createDatabaseSlice(set, get);
    sliceActions.updateProperty(databaseId, propertyId, updates as never);
    // 2) If type changed, dispatch change-type to DBMS
    if (updates.type && oldProp && oldProp.type !== updates.type) {
      fetch(`/api/dbms/columns/${encodeURIComponent(databaseId)}/${encodeURIComponent(propertyId)}/type`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldType: oldProp.type, newType: updates.type }),
      }).catch((err) => console.error('[dbms] changeType persist error:', err));
    }
    persistState(get);
  },

  // ─── Inline Database Creation ──────────────────────────────
  createInlineDatabase: (name = 'Untitled Database') => {
    const dbId = `db-inline-${crypto.randomUUID().slice(0, 8)}`;
    const viewId = `v-${crypto.randomUUID().slice(0, 8)}`;
    const titlePropId = `prop-${crypto.randomUUID().slice(0, 6)}`;
    const tagsPropId = `prop-${crypto.randomUUID().slice(0, 6)}`;
    const statusPropId = `prop-${crypto.randomUUID().slice(0, 6)}`;

    const newDb: DatabaseSchema = {
      id: dbId, name, icon: '📊', titlePropertyId: titlePropId,
      properties: {
        [titlePropId]: { id: titlePropId, name: 'Name', type: 'title' },
        [tagsPropId]: {
          id: tagsPropId, name: 'Tags', type: 'multi_select',
          options: [
            { id: `opt-${crypto.randomUUID().slice(0, 6)}`, value: 'Tag 1', color: 'bg-accent-muted text-accent-text-bold' },
            { id: `opt-${crypto.randomUUID().slice(0, 6)}`, value: 'Tag 2', color: 'bg-success-surface-muted text-success-text-tag' },
          ],
        },
        [statusPropId]: {
          id: statusPropId, name: 'Status', type: 'select',
          options: [
            { id: `opt-${crypto.randomUUID().slice(0, 6)}`, value: 'Not started', color: 'bg-surface-muted text-ink-strong' },
            { id: `opt-${crypto.randomUUID().slice(0, 6)}`, value: 'In progress', color: 'bg-accent-subtle text-accent-text-bold' },
            { id: `opt-${crypto.randomUUID().slice(0, 6)}`, value: 'Done', color: 'bg-success-surface-medium text-success-text-tag' },
          ],
        },
      },
    };

    const newView: ViewConfig = {
      id: viewId, databaseId: dbId, name: 'Table', type: 'table',
      filters: [], filterConjunction: 'and', sorts: [],
      visibleProperties: [titlePropId, tagsPropId, statusPropId],
      settings: { showVerticalLines: true },
    };

    set((state) => ({
      databases: { ...state.databases, [dbId]: newDb },
      views: { ...state.views, [viewId]: newView },
    }));
    return { databaseId: dbId, viewId };
  },
}));

// Re-export the state type for consumers
export type { DatabaseState } from './dbms/hardcoded/storeTypes';
