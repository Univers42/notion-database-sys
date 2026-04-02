// ─── DBMS Operations — Adapter factory & high-level dispatch ─────────────────
// Routes operations to the correct adapter based on the active source type.

import type { DbmsAdapter, DbSourceType, QueryResult } from './types';
import { DB_TO_TABLE } from './types';
import { JsonOps } from './jsonOps';
import { CsvOps } from './csvOps';
import { PostgresOps } from './postgresOps';
import { MongoOps } from './mongoOps';

export { DB_TO_TABLE } from './types';
export type { DbmsAdapter, DbSourceType, QueryResult } from './types';
export { getQueryLog, clearQueryLog } from './queryLog';
export type { QueryLogEntry } from './queryLog';

// ─── Singleton adapters ──────────────────────────────────────────────────────
const adapters: Record<DbSourceType, DbmsAdapter> = {
  json: new JsonOps(),
  csv: new CsvOps(),
  mongodb: new MongoOps(),
  postgresql: new PostgresOps(),
};

/** Get the adapter for a given source type. */
export function getAdapter(source: DbSourceType): DbmsAdapter {
  return adapters[source];
}

/** Resolve the flat-file table name for a database ID. */
export function resolveTable(databaseId: string): string | null {
  return DB_TO_TABLE[databaseId] ?? null;
}

// ─── High-level dispatch functions ───────────────────────────────────────────
// These are called by the middleware endpoints.

/** Run an insert across the active source adapter. */
export function dispatchInsert(
  source: DbSourceType, databaseId: string,
  flatRecord: Record<string, unknown>,
  fieldMap: Record<string, string>,
): QueryResult | null {
  const table = resolveTable(databaseId);
  if (!table) return null;
  return getAdapter(source).insertRecord(table, flatRecord, fieldMap);
}

/** Run a delete across the active source adapter. */
export function dispatchDelete(
  source: DbSourceType, databaseId: string,
  flatId: string, fieldMap: Record<string, string>,
): QueryResult | null {
  const table = resolveTable(databaseId);
  if (!table) return null;
  return getAdapter(source).deleteRecord(table, flatId, fieldMap);
}

/** Run a field update across the active source adapter. */
export function dispatchUpdate(
  source: DbSourceType, databaseId: string,
  flatId: string, fieldName: string, value: unknown,
  fieldMap: Record<string, string>,
): QueryResult | null {
  const table = resolveTable(databaseId);
  if (!table) return null;
  return getAdapter(source).updateField(table, flatId, fieldName, value, fieldMap);
}

/** Run an add-column across the active source adapter. */
export function dispatchAddColumn(
  source: DbSourceType, databaseId: string,
  columnName: string, propType: string,
): QueryResult | null {
  const table = resolveTable(databaseId);
  if (!table) return null;
  return getAdapter(source).addColumn(table, columnName, propType);
}

/** Run a drop-column across the active source adapter. */
export function dispatchDropColumn(
  source: DbSourceType, databaseId: string,
  columnName: string,
): QueryResult | null {
  const table = resolveTable(databaseId);
  if (!table) return null;
  return getAdapter(source).removeColumn(table, columnName);
}

/** Run a type-change across the active source adapter. */
export function dispatchChangeType(
  source: DbSourceType, databaseId: string,
  columnName: string, oldType: string, newType: string,
): QueryResult | null {
  const table = resolveTable(databaseId);
  if (!table) return null;
  return getAdapter(source).changeColumnType(table, columnName, oldType, newType);
}
