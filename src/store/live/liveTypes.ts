/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   liveTypes.ts                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/09 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/09 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * Identity + wire types for LIVE databases mounted through the mini-baas
 * query-router. A live database id is `baas:<dbId>:<table>` (dbId = registered
 * mount uuid); a live page id appends the row's primary key —
 * `baas:<dbId>:<table>:<pk>` — where the pk segment MAY itself contain colons
 * (parse with a segment limit, join the remainder).
 *
 * Wire shapes mirror the backend contract verbatim:
 * - schema:  data-plane-core `schema.rs` (SchemaDescriptor) wrapped by the
 *   query-router's `SchemaResponse` (`GET /query/v1/:dbId/schema`).
 * - rows:    `POST /query/v1/:dbId/tables/:table` (`DataResult`).
 */

export const LIVE_DATABASE_ID_PREFIX = 'baas:';

/** One mounted table: the unit a live database id points at. */
export interface LiveMountRef {
  dbId: string;
  table: string;
}

/** One row of a mounted table (page-id form). */
export interface LivePageRef extends LiveMountRef {
  pk: string;
}

/** Engine-neutral column type (schema.rs `NormalizedType`, snake_case wire). */
export type LiveNormalizedType =
  | 'text' | 'integer' | 'float' | 'decimal' | 'boolean' | 'date' | 'datetime'
  | 'json' | 'uuid' | 'enum' | 'array' | 'objectid' | 'unknown';

/** FK target of a column (schema.rs `ForeignKeyRef`). */
export interface LiveForeignKeyRef {
  table: string;
  column: string;
}

/** One column / document field (schema.rs `ColumnSchema`). */
export interface LiveColumnSchema {
  name: string;
  native_type: string;
  normalized_type: LiveNormalizedType;
  nullable: boolean;
  default: string | null;
  enum_values: string[] | null;
  references: LiveForeignKeyRef | null;
  /** true only for sample-based inference (Mongo without a validator). */
  inferred: boolean;
}

/** One table / collection (schema.rs `TableSchema`). */
export interface LiveTableSchema {
  name: string;
  primary_key: string[];
  columns: LiveColumnSchema[];
}

/** `GET /query/v1/:dbId/schema` response (query-router `SchemaResponse`).
 *  `capabilities` is engine-truth: branch on it (e.g. `aggregate === true` is
 *  currently postgresql-only), never assume. */
export interface LiveSchemaResponse {
  dbId: string;
  engine: string;
  capabilities: Record<string, unknown> | null;
  tables: LiveTableSchema[];
}

/** `POST /query/v1/:dbId/tables/:table` response (`DataResult`). */
export interface LiveRowsResponse {
  rows: Record<string, unknown>[];
  affected_rows: number;
  next_cursor?: string | null;
}

/** Read-path request params for `op: 'list' | 'get'` (query.dto.ts). */
export interface LiveListParams {
  filter?: Record<string, unknown>;
  sort?: Record<string, 'asc' | 'desc'>;
  limit?: number;
  offset?: number;
}

/** True when an id targets a live BaaS mount (`baas:` namespace). */
export function isLiveDatabaseId(id?: string | null): boolean {
  return typeof id === 'string' && id.startsWith(LIVE_DATABASE_ID_PREFIX);
}

/** Parse `baas:<dbId>:<table>` — exactly three segments, all non-empty. */
export function parseLiveDatabaseId(id: string): LiveMountRef | null {
  const parts = id.split(':');
  if (parts.length !== 3 || parts[0] !== 'baas' || !parts[1] || !parts[2]) return null;
  return { dbId: parts[1], table: parts[2] };
}

/** Format a mount ref as a live database id. */
export function formatLiveDatabaseId(ref: LiveMountRef): string {
  return `baas:${ref.dbId}:${ref.table}`;
}

/** Parse `baas:<dbId>:<table>:<pk>` — the pk keeps any embedded colons. */
export function parseLivePageId(id: string): LivePageRef | null {
  const parts = id.split(':');
  if (parts.length < 4 || parts[0] !== 'baas' || !parts[1] || !parts[2]) return null;
  const pk = parts.slice(3).join(':');
  if (!pk) return null;
  return { dbId: parts[1], table: parts[2], pk };
}

/** Format a live page id for one row of a mounted table. */
export function formatLivePageId(ref: LiveMountRef, pk: string | number): string {
  return `baas:${ref.dbId}:${ref.table}:${String(pk)}`;
}
