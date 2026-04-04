/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useDatabaseStore.ts                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:43:40 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 23:14:06 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { create } from 'zustand';
import type { DatabaseSchema, ViewConfig } from '../types/database';
import type { DatabaseState } from './dbms/hardcoded/storeTypes';
import { createDatabaseSlice } from './slices/databaseSlice';
import { createPageSlice } from './slices/pageSlice';
import { createViewSlice } from './slices/viewSlice';
import { createSelectionSlice } from './slices/selectionSlice';
import { createComputedSlice } from './slices/computedSlice';
import { validatePropertyValue } from './validation';
import { readViewFromHash, writeHash } from '../hooks/useDbSource';

// Read initial source from URL hash
const VALID_SOURCES = new Set(['json', 'csv', 'mongodb', 'postgresql']);
function getInitialSource(): string {
  try {
    const params = new URLSearchParams(globalThis.location.hash.slice(1));
    const src = params.get('source');
    if (src && VALID_SOURCES.has(src)) return src;
  } catch { /* SSR-safe */ }
  return 'json';
}

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

/** Dispatches an ops request for query generation (fire-and-forget). */
function dispatchOps(action: string, payload: Record<string, unknown>, source: string): void {
  fetch('/api/dbms/ops', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, _source: source, ...payload }),
  }).catch(() => { /* ops dispatch is best-effort */ });
}

async function switchSource(source: string, set: (partial: Partial<ExtendedDatabaseState>) => void): Promise<void> {
  const switchRes = await fetch('/api/dbms/source', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source }),
  });
  if (!switchRes.ok) throw new Error(`Switch failed: ${switchRes.statusText}`);
  const switched = await switchRes.json();
  const hashView = readViewFromHash();
  const firstView = Object.keys(switched.views)[0] ?? null;
  const viewId = (hashView && switched.views[hashView]) ? hashView : firstView;
  set({
    databases: switched.databases,
    pages: switched.pages,
    views: switched.views,
    activeViewId: viewId,
    activeDbmsSource: source,
    dbmsLoading: false,
  });
  writeHash(source, viewId);
}

async function loadInitialState(set: (partial: Partial<ExtendedDatabaseState>) => void, get: () => ExtendedDatabaseState): Promise<void> {
  const res = await fetch('/api/dbms/state');
  if (!res.ok) throw new Error(`Load failed: ${res.statusText}`);
  const state = await res.json();
  const serverSource = state._source as string | undefined;
  const hashView = readViewFromHash();
  const firstView = Object.keys(state.views)[0] ?? null;
  const currentView = get().activeViewId;

  let viewId: string | null;
  if (currentView && state.views[currentView]) viewId = currentView;
  else if (hashView && state.views[hashView]) viewId = hashView;
  else viewId = firstView;
  set({
    databases: state.databases,
    pages: state.pages,
    views: state.views,
    activeViewId: viewId,
    activeDbmsSource: serverSource ?? get().activeDbmsSource,
    dbmsLoading: false,
  });
  if (serverSource) writeHash(serverSource, viewId);
}

/** Sends a debounced property-persist request to the DBMS server. */
function sendPersistRequest(
  pageId: string, propertyId: string, value: unknown,
  sourceAtCallTime: string,
  timers: Map<string, ReturnType<typeof setTimeout>>,
  getSource: () => string,
): void {
  timers.delete(`${pageId}::${propertyId}`);
  if (getSource() !== sourceAtCallTime) {
    console.log(`[dbms] Persist skipped: source changed (${sourceAtCallTime} \u2192 ${getSource()})`);
    return;
  }
  fetch(`/api/dbms/pages/${encodeURIComponent(pageId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ propertyId, value, _source: sourceAtCallTime }),
  }).catch((err) => console.error('[dbms] Persist error:', err));
}

const _persistTimers = new Map<string, ReturnType<typeof setTimeout>>();

/** Zustand store composing domain slices with DBMS persistence. */
export const useDatabaseStore = create<ExtendedDatabaseState>((set, get) => ({
  databases: {},
  pages: {},
  views: {},
  activeViewId: null,
  openPageId: null,
  searchQuery: '',

  dbmsLoading: true,
  dbmsError: null,
  activeDbmsSource: getInitialSource(),

  loadFromSource: async (source?: string, opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    if (!silent) set({ dbmsLoading: true, dbmsError: null });
    try {
      if (source) {
        await switchSource(source, set);
      } else {
        await loadInitialState(set, get);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[dbms] Load error:', message);
      if (!silent) set({ dbmsError: message, dbmsLoading: false });
    }
  },

  persistPageProperty: (pageId: string, propertyId: string, value: unknown) => {
    const key = `${pageId}::${propertyId}`;
    const prev = _persistTimers.get(key);
    if (prev) clearTimeout(prev);
    // Capture source NOW (before debounce) to detect race conditions
    const sourceAtCallTime = get().activeDbmsSource;
    _persistTimers.set(key, setTimeout(
      () => sendPersistRequest(pageId, propertyId, value, sourceAtCallTime, _persistTimers, () => get().activeDbmsSource),
      600,
    ));
  },

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

  ...createDatabaseSlice(set, get),
  ...createPageSlice(set, get),
  ...createViewSlice(set, get),
  ...createSelectionSlice(set),
  ...createComputedSlice(set, get),

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

  addProperty: (databaseId: string, name: string, type: string) => {
    const sliceActions = createDatabaseSlice(set, get);
    sliceActions.addProperty(databaseId, name, type as never);
    flushState(get);
    dispatchOps('addColumn', { databaseId, columnName: name, propType: type }, get().activeDbmsSource);
  },

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

  updateProperty: (databaseId: string, propertyId: string, updates: Partial<{ name: string; type: string }>) => {
    const oldProp = get().databases[databaseId]?.properties[propertyId];
    const sliceActions = createDatabaseSlice(set, get);
    sliceActions.updateProperty(databaseId, propertyId, updates as never);
    flushState(get);
    if (updates.type && oldProp && oldProp.type !== updates.type) {
      const fieldName = oldProp.name.toLowerCase().replaceAll(/\s+/g, '_');
      dispatchOps('changeType', {
        databaseId, columnName: fieldName,
        oldType: oldProp.type, newType: updates.type,
      }, get().activeDbmsSource);
    }
  },

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

useDatabaseStore.subscribe(
  (state, prev) => {
    if (state.activeViewId !== prev.activeViewId || state.activeDbmsSource !== prev.activeDbmsSource) {
      writeHash(state.activeDbmsSource, state.activeViewId);
    }
  },
);

// Re-export the state type for consumers
export type { DatabaseState } from './dbms/hardcoded/storeTypes';
