/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   dbMetaPersistence.ts                               :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 12:00:00 by dlesieur          #+#    #+#             */
/*                                                +#+#+#+#+#+   ++#+          */
/* ************************************************************************** */

/**
 * Database-container metadata (linked data sources, lock flag) with an
 * honest persistence story: known/workspace hosts persist DatabaseSchema
 * changes through their adapters already, but live mounts rebuild their
 * schema from the server on every load — so meta is ALSO written through to
 * localStorage (`nds:dbmeta:<databaseId>`) and re-applied when any host
 * loads state (object_database.loadAdapterState).
 */

import type { DatabaseSchema, NotionState } from '../../component/types';
import type { DataSourceRef } from '@notion-db/contract-types';

const STORAGE_PREFIX = 'nds:dbmeta:';

export interface DbMeta {
  dataSources?: DataSourceRef[];
  locked?: boolean;
}

export function loadDbMeta(databaseId: string): DbMeta | null {
  if (globalThis.window === undefined) return null;
  try {
    const raw = globalThis.localStorage.getItem(STORAGE_PREFIX + databaseId);
    return raw ? (JSON.parse(raw) as DbMeta) : null;
  } catch {
    return null;
  }
}

/** Write-through (empty meta removes the key — no tombstones). */
export function saveDbMeta(databaseId: string, meta: DbMeta): void {
  if (globalThis.window === undefined) return;
  try {
    const empty = !meta.locked && !(meta.dataSources && meta.dataSources.length > 0);
    if (empty) globalThis.localStorage.removeItem(STORAGE_PREFIX + databaseId);
    else globalThis.localStorage.setItem(STORAGE_PREFIX + databaseId, JSON.stringify(meta));
  } catch {
    // quota/unavailable — adapter persistence still covers known hosts
  }
}

/** Stored meta merged over freshly loaded databases (same ref when no-op). */
export function applyStoredDbMeta(state: NotionState): NotionState {
  let databases: Record<string, DatabaseSchema> | null = null;
  for (const [databaseId, database] of Object.entries(state.databases)) {
    const meta = loadDbMeta(databaseId);
    if (!meta) continue;
    databases = databases ?? { ...state.databases };
    databases[databaseId] = { ...database, ...meta };
  }
  return databases ? { ...state, databases } : state;
}

/** Duck-typed store handle (same shape bindViewSource uses). */
interface DbMetaStore {
  getState(): { databases: Record<string, DatabaseSchema> };
  setState(partial: { databases: Record<string, DatabaseSchema> }): void;
}

/** Single mutation point for container meta: store update + write-through. */
export function updateDatabaseMeta(store: DbMetaStore, databaseId: string, meta: DbMeta): void {
  const { databases } = store.getState();
  const database = databases[databaseId];
  if (!database) return;
  const next = { ...database, ...meta };
  store.setState({ databases: { ...databases, [databaseId]: next } });
  saveDbMeta(databaseId, { dataSources: next.dataSources, locked: next.locked });
}
