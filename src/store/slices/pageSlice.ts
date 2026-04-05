/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   pageSlice.ts                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/02 14:39:14 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/05 01:31:17 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { Page, Block, DatabaseSchema, SchemaProperty } from '../../types/database';
import type { StoreSet, StoreGet, DatabaseState } from '../dbms/hardcoded/storeTypes';
import type { PageSliceActions } from './pageSliceTypes';

export type { PageSliceState, PageSliceActions, PageSlice } from './pageSliceTypes';

/**
 * Creates the page CRUD and block mutation slice for the Zustand store.
 *
 * Mutates `pages` state. Auto-increments ID properties on `addPage`.
 */
export function createPageSlice(set: StoreSet, get: StoreGet): PageSliceActions {
  const now = (): string => new Date().toISOString();

  return {
    addPage: (databaseId, properties = {}) => {
      const id = crypto.randomUUID();
      const db: DatabaseSchema | undefined = get().databases[databaseId];
      if (!db) return id;

      const props = { ...properties };
      if (db.titlePropertyId && !props[db.titlePropertyId]) {
        props[db.titlePropertyId] = '';
      }

      const dbUpdates: Record<string, SchemaProperty> = {};
      for (const prop of Object.values(db.properties)) {
        if (prop.type === 'id' && !props[prop.id]) {
          const counter = prop.autoIncrement || 1;
          props[prop.id] = `${prop.prefix || ''}${counter}`;
          dbUpdates[prop.id] = { ...prop, autoIncrement: counter + 1 };
        }
      }

      const newPage: Page = {
        id,
        databaseId,
        properties: props,
        content: [],
        createdAt: now(),
        updatedAt: now(),
        createdBy: 'You',
        lastEditedBy: 'You',
      };
      set((state: DatabaseState) => {
        const updatedDb = Object.keys(dbUpdates).length > 0
          ? {
              ...state.databases,
              [databaseId]: {
                ...state.databases[databaseId],
                properties: { ...state.databases[databaseId].properties, ...dbUpdates },
              },
            }
          : state.databases;
        return { pages: { ...state.pages, [id]: newPage }, databases: updatedDb };
      });
      return id;
    },

    updatePageProperty: (pageId, propertyId, value) => set((state: DatabaseState) => {
      const page = state.pages[pageId];
      if (!page) return state;
      return {
        pages: {
          ...state.pages,
          [pageId]: {
            ...page,
            properties: { ...page.properties, [propertyId]: value },
            updatedAt: now(),
            lastEditedBy: 'You',
          },
        },
      };
    }),

    deletePage: (pageId) => set((state: DatabaseState) => {
      const newPages = { ...state.pages };
      delete newPages[pageId];
      return { pages: newPages, openPageId: state.openPageId === pageId ? null : state.openPageId };
    }),

    duplicatePage: (pageId) => {
      const state = get();
      const page = state.pages[pageId];
      if (!page) return;
      const id = crypto.randomUUID();
      const newPage: Page = {
        ...page,
        id,
        properties: { ...page.properties },
        content: [...page.content],
        createdAt: now(),
        updatedAt: now(),
      };
      const db = state.databases[page.databaseId];
      if (db?.titlePropertyId && newPage.properties[db.titlePropertyId]) {
        newPage.properties[db.titlePropertyId] += ' (copy)';
      }
      set({ pages: { ...state.pages, [id]: newPage } });
    },

    updatePageContent: (pageId, content) => set((state: DatabaseState) => {
      const page = state.pages[pageId];
      if (!page) return state;
      return {
        pages: {
          ...state.pages,
          [pageId]: { ...page, content, updatedAt: now(), lastEditedBy: 'You' },
        },
      };
    }),

    changeBlockType: (pageId, blockId, newType) => set((state: DatabaseState) => {
      const page = state.pages[pageId];
      if (!page?.content) return state;
      const content = page.content.map((b: Block) =>
        b.id === blockId ? { ...b, type: newType } : b,
      );
      return { pages: { ...state.pages, [pageId]: { ...page, content, updatedAt: now(), lastEditedBy: 'You' } } };
    }),

    insertBlock: (pageId, afterBlockId, block) => set((state: DatabaseState) => {
      const page = state.pages[pageId];
      if (!page) return state;
      const content = [...(page.content || [])];
      if (afterBlockId === null) {
        content.unshift(block);
      } else {
        const idx = content.findIndex((b: Block) => b.id === afterBlockId);
        content.splice(idx + 1, 0, block);
      }
      return { pages: { ...state.pages, [pageId]: { ...page, content, updatedAt: now(), lastEditedBy: 'You' } } };
    }),

    deleteBlock: (pageId, blockId) => set((state: DatabaseState) => {
      const page = state.pages[pageId];
      if (!page?.content) return state;
      const content = page.content.filter((b: Block) => b.id !== blockId);
      return { pages: { ...state.pages, [pageId]: { ...page, content, updatedAt: now(), lastEditedBy: 'You' } } };
    }),

    moveBlock: (pageId, blockId, targetIndex) => set((state: DatabaseState) => {
      const page = state.pages[pageId];
      if (!page?.content) return state;
      const content = [...page.content];
      const fromIdx = content.findIndex((b: Block) => b.id === blockId);
      if (fromIdx === -1) return state;
      const [moved] = content.splice(fromIdx, 1);
      content.splice(targetIndex, 0, moved);
      return { pages: { ...state.pages, [pageId]: { ...page, content, updatedAt: now(), lastEditedBy: 'You' } } };
    }),

    toggleBlockChecked: (pageId, blockId) => set((state: DatabaseState) => {
      const page = state.pages[pageId];
      if (!page?.content) return state;
      const content = page.content.map((b: Block) =>
        b.id === blockId ? { ...b, checked: !b.checked } : b,
      );
      return { pages: { ...state.pages, [pageId]: { ...page, content, updatedAt: now(), lastEditedBy: 'You' } } };
    }),

    toggleBlockCollapsed: (pageId, blockId) => set((state: DatabaseState) => {
      const page = state.pages[pageId];
      if (!page?.content) return state;
      const content = page.content.map((b: Block) =>
        b.id === blockId ? { ...b, collapsed: !b.collapsed } : b,
      );
      return { pages: { ...state.pages, [pageId]: { ...page, content, updatedAt: now(), lastEditedBy: 'You' } } };
    }),

    updateBlock: (pageId, blockId, updates) => set((state: DatabaseState) => {
      const page = state.pages[pageId];
      if (!page?.content) return state;
      const content = page.content.map((b: Block) =>
        b.id === blockId ? { ...b, ...updates } : b,
      );
      return { pages: { ...state.pages, [pageId]: { ...page, content, updatedAt: now(), lastEditedBy: 'You' } } };
    }),

    openPage: (pageId) => set({ openPageId: pageId }),
  };
}
