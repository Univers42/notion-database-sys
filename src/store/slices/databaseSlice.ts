/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   databaseSlice.ts                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:42:40 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 16:42:41 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── databaseSlice — database schema CRUD actions ───────────────────────────

import type { DatabaseSchema, SchemaProperty, PropertyType, SelectOption } from '../../types/database';

export interface DatabaseSliceState {
  databases: Record<string, DatabaseSchema>;
}

export interface DatabaseSliceActions {
  renameDatabase: (databaseId: string, name: string) => void;
  updateDatabaseIcon: (databaseId: string, icon: string) => void;
  addProperty: (databaseId: string, name: string, type: PropertyType) => void;
  insertPropertyAt: (databaseId: string, name: string, type: PropertyType, viewId: string, afterPropId: string | null) => void;
  updateProperty: (databaseId: string, propertyId: string, updates: Partial<SchemaProperty>) => void;
  deleteProperty: (databaseId: string, propertyId: string) => void;
  addSelectOption: (databaseId: string, propertyId: string, option: SelectOption) => void;
}

export type DatabaseSlice = DatabaseSliceState & DatabaseSliceActions;

export type SetFn = (partial: Record<string, unknown> | ((state: Record<string, unknown>) => Record<string, unknown>)) => void;
export type GetFn = () => Record<string, unknown>;

export function createDatabaseSlice(set: SetFn, get: GetFn): DatabaseSliceActions {
  return {
    renameDatabase: (databaseId, name) => set((state: any) => ({
      databases: {
        ...state.databases,
        [databaseId]: { ...state.databases[databaseId], name },
      },
    })),

    updateDatabaseIcon: (databaseId, icon) => set((state: any) => ({
      databases: {
        ...state.databases,
        [databaseId]: { ...state.databases[databaseId], icon },
      },
    })),

    addProperty: (databaseId, name, type) => set((state: any) => {
      const db = state.databases[databaseId];
      if (!db) return state;
      const newPropId = `prop-${crypto.randomUUID().slice(0, 8)}`;
      const newProp: SchemaProperty = { id: newPropId, name, type };

      const updatedViews = { ...state.views };
      if (state.activeViewId) {
        const activeView = updatedViews[state.activeViewId];
        if (activeView && activeView.databaseId === databaseId) {
          updatedViews[state.activeViewId] = {
            ...activeView,
            visibleProperties: [...activeView.visibleProperties, newPropId],
          };
        }
      }

      return {
        databases: {
          ...state.databases,
          [databaseId]: { ...db, properties: { ...db.properties, [newPropId]: newProp } },
        },
        views: updatedViews,
      };
    }),

    insertPropertyAt: (databaseId, name, type, viewId, afterPropId) => set((state: any) => {
      const db = state.databases[databaseId];
      if (!db) return state;
      const newPropId = `prop-${crypto.randomUUID().slice(0, 8)}`;
      const newProp: SchemaProperty = { id: newPropId, name, type };

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

      return {
        databases: {
          ...state.databases,
          [databaseId]: { ...db, properties: { ...db.properties, [newPropId]: newProp } },
        },
        views: updatedViews,
      };
    }),

    updateProperty: (databaseId, propertyId, updates) => set((state: any) => {
      const db = state.databases[databaseId];
      if (!db || !db.properties[propertyId]) return state;
      return {
        databases: {
          ...state.databases,
          [databaseId]: {
            ...db,
            properties: {
              ...db.properties,
              [propertyId]: { ...db.properties[propertyId], ...updates },
            },
          },
        },
      };
    }),

    deleteProperty: (databaseId, propertyId) => set((state: any) => {
      const db = state.databases[databaseId];
      if (!db) return state;
      const { [propertyId]: _, ...remainingProps } = db.properties;

      const updatedViews = { ...state.views };
      Object.keys(updatedViews).forEach(vId => {
        const v = updatedViews[vId];
        if (v.databaseId === databaseId) {
          updatedViews[vId] = {
            ...v,
            visibleProperties: v.visibleProperties.filter((id: string) => id !== propertyId),
          };
        }
      });

      return {
        databases: { ...state.databases, [databaseId]: { ...db, properties: remainingProps } },
        views: updatedViews,
      };
    }),

    addSelectOption: (databaseId, propertyId, option) => set((state: any) => {
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
