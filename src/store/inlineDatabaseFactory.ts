/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   inlineDatabaseFactory.ts                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/05 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/05 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { DatabaseSchema, Page, ViewConfig } from '../types/database';
import type { ExtendedDatabaseState } from './dbmsStoreTypes';

type SetState = (
  partial: Partial<ExtendedDatabaseState>
    | ((state: ExtendedDatabaseState) => Partial<ExtendedDatabaseState>),
) => void;

/** Creates a brand-new inline database with sensible defaults. */
export function createInlineDatabaseAction(set: SetState) {
  return (name = 'Untitled Database') => {
    const dbId = `db-inline-${crypto.randomUUID().slice(0, 8)}`;
    const viewId = `v-${crypto.randomUUID().slice(0, 8)}`;
    const { newDb, newView, newPage } = buildInlineDatabase(dbId, viewId, name);
    set((state) => ({
      databases: { ...state.databases, [dbId]: newDb },
      views: { ...state.views, [viewId]: newView },
      pages: { ...state.pages, [newPage.id]: newPage },
    }));
    return { databaseId: dbId, viewId };
  };
}

/** Materializes a host-minted database id if the adapter doesn't know it.
 *  Idempotent: an existing database (or view) is left untouched. This is what
 *  makes a freshly inserted `/database` block work — the editor mints the ids
 *  and stores them on the block; the store must accept them as-is. */
export function ensureInlineDatabaseAction(set: SetState) {
  return (databaseId: string, viewId?: string, name = 'Untitled Database') => {
    const ensuredViewId = viewId ?? `${databaseId}-table`;
    set((state) => {
      if (state.databases[databaseId]) return {};
      const { newDb, newView, newPage } = buildInlineDatabase(databaseId, ensuredViewId, name);
      return {
        databases: { ...state.databases, [databaseId]: newDb },
        views: state.views[ensuredViewId] ? state.views : { ...state.views, [ensuredViewId]: newView },
        pages: { ...state.pages, [newPage.id]: newPage },
      };
    });
  };
}

/** Default schema for a fresh inline database — Notion parity: ONLY the
 *  mandatory title column plus one empty starter row ready to type into. */
function buildInlineDatabase(dbId: string, viewId: string, name: string): { newDb: DatabaseSchema; newView: ViewConfig; newPage: Page } {
  const titlePropId = `prop-${crypto.randomUUID().slice(0, 6)}`;
  const now = new Date().toISOString();

  const newDb: DatabaseSchema = {
    id: dbId, name, icon: '📊', titlePropertyId: titlePropId,
    properties: {
      [titlePropId]: { id: titlePropId, name: 'Name', type: 'title' },
    },
  };

  const newView: ViewConfig = {
    id: viewId, databaseId: dbId, name: 'Table', type: 'table',
    filters: [], filterConjunction: 'and', sorts: [],
    visibleProperties: [titlePropId],
    settings: { showVerticalLines: true },
  };

  const newPage: Page = {
    id: crypto.randomUUID(), databaseId: dbId,
    properties: { [titlePropId]: '' }, content: [],
    createdAt: now, updatedAt: now, createdBy: 'You', lastEditedBy: 'You',
  };

  return { newDb, newView, newPage };
}
