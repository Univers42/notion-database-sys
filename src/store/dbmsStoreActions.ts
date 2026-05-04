/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   dbmsStoreActions.ts                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/05 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/05 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { ExtendedDatabaseState } from "./dbmsStoreTypes";
import { createDatabaseSlice } from "./slices/databaseSlice";
import { createPageSlice } from "./slices/pageSlice";
import { validatePropertyValue } from "./validation";
import { createViewSlice } from "./slices/viewSlice";
import {
  flushState,
  dispatchOps,
  switchSource,
  loadInitialState,
  sendPersistRequest,
  persistTimers,
} from "./dbmsStoreHelpers";
import {
  persistDatabaseMetadata,
  persistViewCreate,
  persistViewUpdate,
  persistViewDelete,
} from "./dbmsStoreHelpers";
import { createInlineDatabaseAction } from "./inlineDatabaseFactory";

type SetState = (
  partial:
    | Partial<ExtendedDatabaseState>
    | ((state: ExtendedDatabaseState) => Partial<ExtendedDatabaseState>),
) => void;
type GetState = () => ExtendedDatabaseState;

/** Creates all DBMS-related actions for the Zustand store. */
export function createDbmsActions(set: SetState, get: GetState) {
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
        console.error("[dbms] Load error:", message);
        if (!silent) set({ dbmsError: message, dbmsLoading: false });
      }
    },

    persistPageProperty: (
      pageId: string,
      propertyId: string,
      value: unknown,
    ) => {
      const key = `${pageId}::${propertyId}`;
      const prev = persistTimers.get(key);
      if (prev) clearTimeout(prev);
      // Capture source NOW (before debounce) to detect race conditions
      const sourceAtCallTime = get().activeDbmsSource;
      persistTimers.set(
        key,
        setTimeout(
          () =>
            sendPersistRequest(
              pageId,
              propertyId,
              value,
              sourceAtCallTime,
              persistTimers,
              () => get().activeDbmsSource,
            ),
          600,
        ),
      );
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
            lastEditedBy: "External",
          };
        }
        return { pages: updatedPages };
      });
    },

    updatePageProperty: (
      pageId: string,
      propertyId: string,
      value: unknown,
    ) => {
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
              lastEditedBy: "You",
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
        dispatchOps(
          "insert",
          { databaseId, pageId, properties: page.properties },
          get().activeDbmsSource,
        );
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
        dispatchOps(
          "delete",
          {
            databaseId: page.databaseId,
            pageId,
          },
          get().activeDbmsSource,
        );
      }
    },

    addProperty: (databaseId: string, name: string, type: string) => {
      const sliceActions = createDatabaseSlice(set, get);
      sliceActions.addProperty(databaseId, name, type as never);
      flushState(get);
      dispatchOps(
        "addColumn",
        { databaseId, columnName: name, propType: type },
        get().activeDbmsSource,
      );
    },

    deleteProperty: (databaseId: string, propertyId: string) => {
      const db = get().databases[databaseId];
      const propName = db?.properties[propertyId]?.name;
      const sliceActions = createDatabaseSlice(set, get);
      sliceActions.deleteProperty(databaseId, propertyId);
      flushState(get);
      if (propName) {
        dispatchOps(
          "dropColumn",
          { databaseId, columnName: propName },
          get().activeDbmsSource,
        );
      }
    },

    updateProperty: (
      databaseId: string,
      propertyId: string,
      updates: Partial<{ name: string; type: string }>,
    ) => {
      const oldProp = get().databases[databaseId]?.properties[propertyId];
      const sliceActions = createDatabaseSlice(set, get);
      sliceActions.updateProperty(databaseId, propertyId, updates as never);
      flushState(get);
      if (updates.type && oldProp && oldProp.type !== updates.type) {
        const fieldName = oldProp.name.toLowerCase().replaceAll(/\s+/g, "_");
        dispatchOps(
          "changeType",
          {
            databaseId,
            columnName: fieldName,
            oldType: oldProp.type,
            newType: updates.type,
          },
          get().activeDbmsSource,
        );
      }
    },

    createInlineDatabase: createInlineDatabaseAction(set),
  };
}

/** Creates database and view persistence actions for DBMS integration. */
export function createDbmsPersistenceActions(set: SetState, get: GetState) {
  return {
    renameDatabase: (databaseId: string, name: string) => {
      const sliceActions = createDatabaseSlice(set, get);
      sliceActions.renameDatabase(databaseId, name);
      persistDatabaseMetadata(databaseId, { name }, get().activeDbmsSource);
    },

    updateDatabaseIcon: (databaseId: string, icon: string) => {
      const sliceActions = createDatabaseSlice(set, get);
      sliceActions.updateDatabaseIcon(databaseId, icon);
      persistDatabaseMetadata(databaseId, { icon }, get().activeDbmsSource);
    },

    addView: (view: Record<string, unknown>) => {
      const sliceActions = createViewSlice(set, get);
      sliceActions.addView(view as never);
      const newViewId = get().activeViewId;
      if (newViewId) {
        persistViewCreate({ ...view, id: newViewId }, get().activeDbmsSource);
      }
    },

    updateView: (viewId: string, updates: Record<string, unknown>) => {
      const sliceActions = createViewSlice(set, get);
      sliceActions.updateView(viewId, updates as never);
      persistViewUpdate(viewId, updates, get().activeDbmsSource);
    },

    updateViewSettings: (viewId: string, settings: Record<string, unknown>) => {
      const sliceActions = createViewSlice(set, get);
      sliceActions.updateViewSettings(viewId, settings as never);
      persistViewUpdate(viewId, { settings }, get().activeDbmsSource);
    },

    deleteView: (viewId: string) => {
      const sliceActions = createViewSlice(set, get);
      sliceActions.deleteView(viewId);
      persistViewDelete(viewId, get().activeDbmsSource);
    },
  };
}
