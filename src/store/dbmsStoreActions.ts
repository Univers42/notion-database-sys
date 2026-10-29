/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   dbmsStoreActions.ts                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/05 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/10/29 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { ExtendedDatabaseState } from './dbmsStoreTypes';
import { createDatabaseSlice } from './slices/databaseSlice';
import { createPageSlice } from './slices/pageSlice';
import { runStoreAutomations } from './slices/pageAutomations';
import type { SchemaProperty } from '../types/database';
import type { StoreSet } from './dbms/hardcoded/storeTypes';
import { validatePropertyValue } from './validation';
import {
  flushState, dispatchOps, switchSource,
  loadInitialState, sendPersistRequest, persistTimers,
} from './dbmsStoreHelpers';
import { createInlineDatabaseAction, ensureInlineDatabaseAction } from './inlineDatabaseFactory';

type SetState = (
  partial: Partial<ExtendedDatabaseState>
    | ((state: ExtendedDatabaseState) => Partial<ExtendedDatabaseState>),
) => void;
type GetState = () => ExtendedDatabaseState;

/** Creates all DBMS-related actions for the Zustand store. The schema actions
 *  write through `schemaSet`, the store's lock guard, as the slice they wrap
 *  does; a write the guard refused is not sent to the DBMS either. */
export function createDbmsActions(set: SetState, get: GetState, schemaSet: StoreSet = set) {
  return {
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
      if (get().activeDbmsSource === 'adapter') return;
      const key = `${pageId}::${propertyId}`;
      const prev = persistTimers.get(key);
      if (prev) clearTimeout(prev);
      // Capture source NOW (before debounce) to detect race conditions
      const sourceAtCallTime = get().activeDbmsSource;
      persistTimers.set(key, setTimeout(
        () => sendPersistRequest(pageId, propertyId, value, sourceAtCallTime, persistTimers, () => get().activeDbmsSource),
        600,
      ));
    },

    patchPages: (patches: Record<string, Record<string, unknown>>) => {
      // External/bulk sync writes (lastEditedBy 'External'): deliberately NO
      // automations — a remote sync batch must not fan out notification storms.
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
      // 3) Automations. Their writes go straight into the store (never back
      // through this action) and persist the same way; the runner bounds
      // the chains they start.
      const updated = get().pages[pageId];
      if (updated) void runStoreAutomations(set, get, { type: 'property_changed', page: updated, before: page, changed: [propertyId] });
    },

    addPage: (databaseId: string, properties: Record<string, unknown> = {}) => {
      const sliceActions = createPageSlice(set, get);
      const pageId = sliceActions.addPage(databaseId, properties);
      // Persist full state immediately (includes new page + autoIncrement)
      if (get().activeDbmsSource !== 'adapter') flushState(get);
      // Dispatch ops (query generation only — fire-and-forget)
      const page = get().pages[pageId];
      if (page && get().activeDbmsSource !== 'adapter') {
        dispatchOps('insert', { databaseId, pageId, properties: page.properties }, get().activeDbmsSource);
      }
      return pageId;
    },

    deletePage: (pageId: string) => {
      const page = get().pages[pageId];
      const sliceActions = createPageSlice(set, get);
      sliceActions.deletePage(pageId);
      // row_deleted automations see the row as it was; a write to it is skipped.
      if (page) void runStoreAutomations(set, get, { type: 'row_deleted', page });
      // Persist full state immediately (page removed from state)
      if (get().activeDbmsSource !== 'adapter') flushState(get);
      if (page && get().activeDbmsSource !== 'adapter') {
        dispatchOps('delete', {
          databaseId: page.databaseId,
          pageId,
        }, get().activeDbmsSource);
      }
    },

    addProperty: (databaseId: string, name: string, type: string) => {
      const propertyId = createDatabaseSlice(schemaSet, get).addProperty(databaseId, name, type as never);
      if (!get().databases[databaseId]?.properties[propertyId]) return propertyId;
      if (get().activeDbmsSource !== 'adapter') {
        flushState(get);
        dispatchOps('addColumn', { databaseId, columnName: name, propType: type }, get().activeDbmsSource);
      }
      return propertyId;
    },

    deleteProperty: (databaseId: string, propertyId: string) => {
      const db = get().databases[databaseId];
      const propName = db?.properties[propertyId]?.name;
      createDatabaseSlice(schemaSet, get).deleteProperty(databaseId, propertyId);
      if (get().databases[databaseId]?.properties[propertyId]) return;
      if (get().activeDbmsSource !== 'adapter') flushState(get);
      if (propName && get().activeDbmsSource !== 'adapter') {
        dispatchOps('dropColumn', { databaseId, columnName: propName }, get().activeDbmsSource);
      }
    },

    updateProperty: (databaseId: string, propertyId: string, updates: Partial<SchemaProperty>) => {
      const oldProp = get().databases[databaseId]?.properties[propertyId];
      createDatabaseSlice(schemaSet, get).updateProperty(databaseId, propertyId, updates as never);
      if (get().databases[databaseId]?.properties[propertyId] === oldProp) return;
      if (get().activeDbmsSource !== 'adapter') flushState(get);
      if (updates.type && oldProp && oldProp.type !== updates.type && get().activeDbmsSource !== 'adapter') {
        const fieldName = oldProp.name.toLowerCase().replaceAll(/\s+/g, '_');
        dispatchOps('changeType', {
          databaseId, columnName: fieldName,
          oldType: oldProp.type, newType: updates.type,
        }, get().activeDbmsSource);
      }
    },

    createInlineDatabase: createInlineDatabaseAction(set),
    ensureInlineDatabase: ensureInlineDatabaseAction(set),
  };
}
