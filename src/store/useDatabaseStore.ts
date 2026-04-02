/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useDatabaseStore.ts                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:43:40 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/02 21:13:49 by dlesieur         ###   ########.fr       */
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
import { validatePropertyValue } from './validation';

/** Extended state with DBMS loading capabilities. */
interface DbmsExtras {
  /** Whether the store is currently loading data from DBMS. */
  dbmsLoading: boolean;
  /** Error from last DBMS load attempt. */
  dbmsError: string | null;
  /** Currently active DBMS source (json | csv | postgresql | mongodb). */
  activeDbmsSource: string;
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

/** Sources backed by a live database container. */
const LIVE_DB_SOURCES = new Set(['postgresql', 'mongodb']);

// ─── Helper: Flush full state to server immediately (no debounce) ───────────
let persistTimer: ReturnType<typeof setTimeout> | null = null;
function flushState(get: () => ExtendedDatabaseState): void {
  if (persistTimer) { clearTimeout(persistTimer); persistTimer = null; }
  const { databases, pages, views, activeDbmsSource } = get();
  // Live DB: only persist schema (databases + views) — pages live in the container
  const body = LIVE_DB_SOURCES.has(activeDbmsSource)
    ? { databases, views, _source: activeDbmsSource }
    : { databases, pages, views, _source: activeDbmsSource };
  fetch('/api/dbms/state', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch((err) => console.error('[dbms] State flush error:', err));
}

// ─── Helper: Fire ops dispatch (query generation only, no state mod) ────────
function dispatchOps(action: string, payload: Record<string, unknown>, source: string): void {
  fetch('/api/dbms/ops', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, _source: source, ...payload }),
  }).catch(() => { /* ops dispatch is best-effort */ });
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
  activeDbmsSource: 'json',

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
          activeDbmsSource: source,
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
      // Capture source NOW (before debounce) to detect race conditions
      const sourceAtCallTime = get().activeDbmsSource;
      timers.set(key, setTimeout(() => {
        timers.delete(key);
        // ABORT if the user switched sources during the debounce window
        if (get().activeDbmsSource !== sourceAtCallTime) {
          console.log(`[dbms] Persist skipped: source changed (${sourceAtCallTime} → ${get().activeDbmsSource})`);
          return;
        }
        fetch(`/api/dbms/pages/${encodeURIComponent(pageId)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ propertyId, value, _source: sourceAtCallTime }),
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

  // ─── Override updatePageProperty to add validation + write-through persistence ──
  updatePageProperty: (pageId: string, propertyId: string, value: unknown) => {
    // 0) Validate & coerce against schema
    const page = get().pages[pageId];
    if (!page) return;
    const db = get().databases[page.databaseId];
    const prop = db?.properties[propertyId];
    let coerced = value;
    if (prop) {
      const result = validatePropertyValue(value, prop, get().pages);
      if (!result.ok) {
        console.warn(`[validation] ${prop.name}: ${result.reason}`);
        return; // reject invalid value silently
      }
      coerced = result.value;
    }

    // 1) Update Zustand state (same logic as pageSlice)
    set((state) => {
      const p = state.pages[pageId];
      if (!p) return state;
      return {
        pages: {
          ...state.pages,
          [pageId]: {
            ...p,
            properties: { ...p.properties, [propertyId]: coerced },
            updatedAt: new Date().toISOString(),
            lastEditedBy: 'You',
          },
        },
      };
    });
    // 2) Persist to DBMS backend (fire-and-forget)
    get().persistPageProperty(pageId, propertyId, coerced);
  },

  // ─── Override addPage: flush state + dispatch ops ──
  addPage: (databaseId: string, properties: Record<string, unknown> = {}) => {
    const sliceActions = createPageSlice(set, get);
    const pageId = sliceActions.addPage(databaseId, properties);
    // Persist full state immediately (includes new page + autoIncrement)
    flushState(get);
    // Dispatch ops (query generation only — fire-and-forget)
    const page = get().pages[pageId];
    if (page) {
      dispatchOps('insert', { databaseId, pageId, properties: page.properties }, get().activeDbmsSource);
    }
    return pageId;
  },

  // ─── Override deletePage: flush state + dispatch ops ──
  deletePage: (pageId: string) => {
    const page = get().pages[pageId];
    const sliceActions = createPageSlice(set, get);
    sliceActions.deletePage(pageId);
    // Persist full state immediately (page removed from state)
    flushState(get);
    if (page) {
      dispatchOps('delete', {
        databaseId: page.databaseId,
        pageId,
      }, get().activeDbmsSource);
    }
  },

  // ─── Override addProperty: flush state + dispatch ops ──
  addProperty: (databaseId: string, name: string, type: string) => {
    const sliceActions = createDatabaseSlice(set, get);
    sliceActions.addProperty(databaseId, name, type as never);
    flushState(get);
    dispatchOps('addColumn', { databaseId, columnName: name, propType: type }, get().activeDbmsSource);
  },

  // ─── Override deleteProperty: flush state + dispatch ops ──
  deleteProperty: (databaseId: string, propertyId: string) => {
    const db = get().databases[databaseId];
    const propName = db?.properties[propertyId]?.name;
    const sliceActions = createDatabaseSlice(set, get);
    sliceActions.deleteProperty(databaseId, propertyId);
    flushState(get);
    if (propName) {
      dispatchOps('dropColumn', { databaseId, columnName: propName }, get().activeDbmsSource);
    }
  },

  // ─── Override updateProperty: flush state + dispatch type changes ──
  updateProperty: (databaseId: string, propertyId: string, updates: Partial<{ name: string; type: string }>) => {
    const oldProp = get().databases[databaseId]?.properties[propertyId];
    const sliceActions = createDatabaseSlice(set, get);
    sliceActions.updateProperty(databaseId, propertyId, updates as never);
    flushState(get);
    if (updates.type && oldProp && oldProp.type !== updates.type) {
      const fieldName = oldProp.name.toLowerCase().replace(/\s+/g, '_');
      dispatchOps('changeType', {
        databaseId, columnName: fieldName,
        oldType: oldProp.type, newType: updates.type,
      }, get().activeDbmsSource);
    }
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
