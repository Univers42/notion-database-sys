/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   manageSourcesModel.ts                              :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 12:00:00 by dlesieur          #+#    #+#             */
/*                                                +#+#+#+#+#+   +#+           */
/* ************************************************************************** */

/**
 * Pure model behind "Manage data sources" (Notion semantics: the database is
 * a CONTAINER of sources; views each show one). The listed sources are the
 * union of (a) the container itself, (b) explicitly linked DataSourceRefs and
 * (c) sources derived from the views that already point elsewhere — so a
 * rebind done through the Source picker shows up here without bookkeeping.
 * Mutations return the next DatabaseSchema; the screen persists via
 * updateDatabaseMeta.
 */

import type { DatabaseSchema, ViewConfig } from '../../component/types';
import type { DataSourceRef } from '@notion-db/contract-types';

export interface SourceEntry {
  ref: DataSourceRef;
  /** Names of the views in this store displaying the source. */
  usedBy: string[];
  /** The container's own schema (cannot be removed or renamed here). */
  isPrimary: boolean;
  /** Explicitly linked (removable) vs derived from a view binding. */
  isLinked: boolean;
}

function inferKind(sourceId: string): DataSourceRef['kind'] {
  if (sourceId.startsWith('baas:')) return 'live';
  if (sourceId.startsWith('ws-')) return 'workspace';
  return 'known';
}

/** The Manage-data-sources listing for one database container. */
export function listDatabaseSources(
  database: DatabaseSchema,
  views: Record<string, ViewConfig>,
  databases: Record<string, DatabaseSchema>,
): SourceEntry[] {
  const usage = new Map<string, string[]>();
  for (const view of Object.values(views)) {
    const list = usage.get(view.databaseId) ?? [];
    list.push(view.name);
    usage.set(view.databaseId, list);
  }
  const entries = new Map<string, SourceEntry>();
  entries.set(database.id, {
    ref: { id: database.id, name: database.name, kind: inferKind(database.id) },
    usedBy: usage.get(database.id) ?? [],
    isPrimary: true,
    isLinked: false,
  });
  for (const ref of database.dataSources ?? []) {
    if (entries.has(ref.id)) continue;
    entries.set(ref.id, { ref, usedBy: usage.get(ref.id) ?? [], isPrimary: false, isLinked: true });
  }
  for (const [sourceId, usedBy] of usage) {
    if (entries.has(sourceId)) continue;
    const known = databases[sourceId];
    entries.set(sourceId, {
      ref: { id: sourceId, name: known?.name ?? sourceId, kind: inferKind(sourceId) },
      usedBy,
      isPrimary: false,
      isLinked: false,
    });
  }
  return [...entries.values()];
}

/** Container with `ref` linked (no-op when already present or primary). */
export function linkSource(database: DatabaseSchema, ref: DataSourceRef): DatabaseSchema {
  if (ref.id === database.id) return database;
  if ((database.dataSources ?? []).some((existing) => existing.id === ref.id)) return database;
  const linked = { ...ref, addedAt: ref.addedAt ?? new Date().toISOString() };
  return { ...database, dataSources: [...(database.dataSources ?? []), linked] };
}

/** Container with the linked source renamed (display alias only). */
export function renameSource(database: DatabaseSchema, sourceId: string, name: string): DatabaseSchema {
  const dataSources = (database.dataSources ?? []).map((ref) =>
    (ref.id === sourceId ? { ...ref, name } : ref));
  return { ...database, dataSources };
}

/** Container with the source unlinked — null when views still use it
 *  (callers show `usedBy` instead of removing). */
export function removeSource(
  database: DatabaseSchema,
  sourceId: string,
  views: Record<string, ViewConfig>,
): DatabaseSchema | null {
  if (Object.values(views).some((view) => view.databaseId === sourceId)) return null;
  const dataSources = (database.dataSources ?? []).filter((ref) => ref.id !== sourceId);
  return { ...database, dataSources };
}
