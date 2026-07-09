/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   databaseSlice.ts                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:42:40 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 23:14:06 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { DatabaseSchema, SchemaProperty, PropertyType, SelectOption, ViewConfig } from '../../types/database';
import type { StoreSet, StoreGet, DatabaseState } from '../dbms/hardcoded/storeTypes';
import { defaultStatusSchema, needsStatusDefaults } from './statusDefaults';

/** A fresh ID property backfills every existing record in creation order and
 *  primes `autoIncrement` so new records continue the sequence (Notion parity —
 *  without this, existing rows sit at "—" forever). */
function backfillIdProperty(
  state: DatabaseState,
  databaseId: string,
  prop: SchemaProperty,
): { pages: DatabaseState['pages']; autoIncrement: number } {
  const ordered = Object.values(state.pages)
    .filter(page => page.databaseId === databaseId && !page.isTemplate && !page.archived)
    .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  const pages = { ...state.pages };
  let counter = prop.autoIncrement || 1;
  for (const page of ordered) {
    pages[page.id] = { ...page, properties: { ...page.properties, [prop.id]: `${prop.prefix || ''}${counter}` } };
    counter++;
  }
  return { pages, autoIncrement: counter };
}

/** Remove a property from all views belonging to a database. */
function removePropertyFromViews(
  views: Record<string, ViewConfig>,
  databaseId: string,
  propertyId: string,
): Record<string, ViewConfig> {
  const updated = { ...views };
  for (const vId of Object.keys(updated)) {
    const v = updated[vId];
    if (v.databaseId === databaseId) {
      updated[vId] = {
        ...v,
        visibleProperties: v.visibleProperties.filter((id: string) => id !== propertyId),
      };
    }
  }
  return updated;
}

export interface DatabaseSliceState {
  databases: Record<string, DatabaseSchema>;
}

export interface DatabaseSliceActions {
  renameDatabase: (databaseId: string, name: string) => void;
  updateDatabaseIcon: (databaseId: string, icon: string) => void;
  /** Template the "New" button seeds from (undefined clears it). */
  setDefaultTemplate: (databaseId: string, templateId?: string) => void;
  /** Adds a property to the database (and the active view). Returns the new id. */
  addProperty: (databaseId: string, name: string, type: PropertyType) => string;
  insertPropertyAt: (databaseId: string, name: string, type: PropertyType, viewId: string, afterPropId: string | null) => void;
  /** Copy a property (definition, options AND cell values), inserted right of the original. */
  duplicateProperty: (databaseId: string, propertyId: string, viewId: string) => void;
  updateProperty: (databaseId: string, propertyId: string, updates: Partial<SchemaProperty>) => void;
  deleteProperty: (databaseId: string, propertyId: string) => void;
  addSelectOption: (databaseId: string, propertyId: string, option: SelectOption) => void;
}

export type DatabaseSlice = DatabaseSliceState & DatabaseSliceActions;

/**
 * Creates the database schema CRUD slice for the Zustand store.
 *
 * Mutates `databases` and `views` state on schema changes (add/update/delete properties).
 */
export function createDatabaseSlice(set: StoreSet, _get: StoreGet): DatabaseSliceActions {
  return {
    renameDatabase: (databaseId, name) => set((state: DatabaseState) => ({
      databases: {
        ...state.databases,
        [databaseId]: { ...state.databases[databaseId], name },
      },
    })),

    updateDatabaseIcon: (databaseId, icon) => set((state: DatabaseState) => ({
      databases: {
        ...state.databases,
        [databaseId]: { ...state.databases[databaseId], icon },
      },
    })),

    setDefaultTemplate: (databaseId, templateId) => set((state: DatabaseState) => ({
      databases: {
        ...state.databases,
        [databaseId]: { ...state.databases[databaseId], defaultTemplateId: templateId },
      },
    })),

    addProperty: (databaseId, name, type) => {
      const newPropId = `prop-${crypto.randomUUID().slice(0, 8)}`;
      set((state: DatabaseState) => {
        const db = state.databases[databaseId];
        if (!db) return state;
        // A Status property is born with its default groups (Notion parity).
        const newProp: SchemaProperty = {
          id: newPropId, name, type,
          ...(type === 'status' ? defaultStatusSchema(newPropId) : {}),
        };

        const updatedViews = { ...state.views };
        if (state.activeViewId) {
          const activeView = updatedViews[state.activeViewId];
          if (activeView?.databaseId === databaseId) {
            updatedViews[state.activeViewId] = {
              ...activeView,
              visibleProperties: [...activeView.visibleProperties, newPropId],
            };
          }
        }

        let pages = state.pages;
        if (type === 'id') {
          const backfill = backfillIdProperty(state, databaseId, newProp);
          pages = backfill.pages;
          newProp.autoIncrement = backfill.autoIncrement;
        }

        return {
          databases: {
            ...state.databases,
            [databaseId]: { ...db, properties: { ...db.properties, [newPropId]: newProp } },
          },
          views: updatedViews,
          pages,
        };
      });
      return newPropId;
    },

    insertPropertyAt: (databaseId, name, type, viewId, afterPropId) => set((state: DatabaseState) => {
      const db = state.databases[databaseId];
      if (!db) return state;
      const newPropId = `prop-${crypto.randomUUID().slice(0, 8)}`;
      const newProp: SchemaProperty = {
        id: newPropId, name, type,
        ...(type === 'status' ? defaultStatusSchema(newPropId) : {}),
      };

      const updatedViews = { ...state.views };
      const view = updatedViews[viewId];
      if (view) {
        const visProps = [...view.visibleProperties];
        if (afterPropId === null) {
          visProps.unshift(newPropId);
        } else {
          const idx = visProps.indexOf(afterPropId);
          visProps.splice(idx + 1, 0, newPropId);
        }
        updatedViews[viewId] = { ...view, visibleProperties: visProps };
      }

      let pages = state.pages;
      if (type === 'id') {
        const backfill = backfillIdProperty(state, databaseId, newProp);
        pages = backfill.pages;
        newProp.autoIncrement = backfill.autoIncrement;
      }

      return {
        databases: {
          ...state.databases,
          [databaseId]: { ...db, properties: { ...db.properties, [newPropId]: newProp } },
        },
        views: updatedViews,
        pages,
      };
    }),

    duplicateProperty: (databaseId, propertyId, viewId) => set((state: DatabaseState) => {
      const db = state.databases[databaseId];
      const source = db?.properties[propertyId];
      if (!source || source.type === 'title') return state;
      const newPropId = `prop-${crypto.randomUUID().slice(0, 8)}`;
      const copy: SchemaProperty = {
        ...source,
        id: newPropId,
        name: `${source.name} copy`,
        options: source.options?.map((option) => ({ ...option })),
      };

      const updatedViews = { ...state.views };
      const view = updatedViews[viewId];
      if (view) {
        const visProps = [...view.visibleProperties];
        const idx = visProps.indexOf(propertyId);
        visProps.splice(idx === -1 ? visProps.length : idx + 1, 0, newPropId);
        updatedViews[viewId] = { ...view, visibleProperties: visProps };
      }

      const updatedPages = Object.fromEntries(
        Object.entries(state.pages).map(([pageId, page]) => [
          pageId,
          page.databaseId === databaseId && page.properties[propertyId] !== undefined
            ? { ...page, properties: { ...page.properties, [newPropId]: page.properties[propertyId] } }
            : page,
        ]),
      );

      return {
        databases: {
          ...state.databases,
          [databaseId]: { ...db, properties: { ...db.properties, [newPropId]: copy } },
        },
        views: updatedViews,
        pages: updatedPages,
      };
    }),

    updateProperty: (databaseId, propertyId, updates) => set((state: DatabaseState) => {
      const db = state.databases[databaseId];
      if (!db?.properties[propertyId]) return state;
      let merged: SchemaProperty = { ...db.properties[propertyId], ...updates };
      // Converting a property TO status with no options seeds the defaults —
      // the editor is never left staring at an empty group list.
      if (updates.type === 'status' && needsStatusDefaults(merged)) {
        merged = { ...merged, ...defaultStatusSchema(propertyId) };
      }
      return {
        databases: {
          ...state.databases,
          [databaseId]: {
            ...db,
            properties: {
              ...db.properties,
              [propertyId]: merged,
            },
          },
        },
      };
    }),

    deleteProperty: (databaseId, propertyId) => set((state: DatabaseState) => {
      const db = state.databases[databaseId];
      if (!db) return state;
      const { [propertyId]: _, ...remainingProps } = db.properties;
      // Unpair any date property whose interval END was the deleted property —
      // a dangling endPropertyId would silently break range display/drags.
      for (const [id, prop] of Object.entries(remainingProps)) {
        if (prop.endPropertyId === propertyId) {
          remainingProps[id] = { ...prop, endPropertyId: undefined };
        }
      }

      return {
        databases: { ...state.databases, [databaseId]: { ...db, properties: remainingProps } },
        views: removePropertyFromViews(state.views, databaseId, propertyId),
      };
    }),

    addSelectOption: (databaseId, propertyId, option) => set((state: DatabaseState) => {
      const db = state.databases[databaseId];
      if (!db) return state;
      const prop = db.properties[propertyId];
      if (!prop || (prop.type !== 'select' && prop.type !== 'multi_select')) return state;
      return {
        databases: {
          ...state.databases,
          [databaseId]: {
            ...db,
            properties: {
              ...db.properties,
              [propertyId]: { ...prop, options: [...(prop.options || []), option] },
            },
          },
        },
      };
    }),
  };
}
