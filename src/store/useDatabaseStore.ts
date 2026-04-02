/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useDatabaseStore.ts                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:43:40 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/02 01:19:23 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── useDatabaseStore — Zustand store composing domain slices ────────────────

import { create } from 'zustand';
import type { DatabaseSchema, ViewConfig } from '../types/database';
import { buildInitialState } from './seedData';
import type { DatabaseState } from './storeTypes';
import { createDatabaseSlice } from './slices/databaseSlice';
import { createPageSlice } from './slices/pageSlice';
import { createViewSlice } from './slices/viewSlice';
import { createSelectionSlice } from './slices/selectionSlice';
import { createComputedSlice } from './slices/computedSlice';

const initialState = buildInitialState();

// ═══════════════════════════════════════════════════════════════════════════════
// STORE
// ═══════════════════════════════════════════════════════════════════════════════

export const useDatabaseStore = create<DatabaseState>((set, get) => ({
  databases: initialState.databases,
  pages: initialState.pages,
  views: initialState.views,
  activeViewId: 'v-prod-table',
  openPageId: null,
  searchQuery: '',

  // ─── Compose domain slices ─────────────────────────────────
  ...createDatabaseSlice(set, get),
  ...createPageSlice(set, get),
  ...createViewSlice(set, get),
  ...createSelectionSlice(set),
  ...createComputedSlice(set, get),

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
export type { DatabaseState } from './storeTypes';
