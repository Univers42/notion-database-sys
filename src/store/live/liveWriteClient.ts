/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   liveWriteClient.ts                                  :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/10 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * Write-side HTTP for live mounts. Auth/transport mirrors liveMountClient (the
 * osionos BRIDGE — `VITE_API_URL` + `Authorization: Bearer` app-session JWT, NOT
 * Kong which 401s these routes for the browser), but results
 * are STATUS-shaped instead of thrown: the publisher classifies every write
 * as ok | gone | conflict | rejected | failed from `status` (0 = network),
 * mirroring pageOutbox's never-throw discipline. Kept free of the
 * `@notion-db/contract-types` runtime re-export on purpose so node:test can
 * import it with the type-strip loader.
 *
 * The query-router validates bodies with forbidNonWhitelisted — send ONLY
 * whitelisted fields (op/data/filter/…/idempotencyKey; never `returning`:
 * every engine echoes the inserted row by default — PG via RETURNING, MySQL
 * data echo + last_insert_id, Mongo doc echo + _id).
 */

import type { LiveTableSchema } from './liveTypes';

// `?? {}` keeps the module import-safe outside Vite (e.g. node:test).
const env = (import.meta.env ?? {}) as Record<string, string | undefined>;
const BASE_URL = (env.VITE_API_URL ?? '').trim().replace(/\/$/, '');

/** The app-session JWT off the global publish seam (empty until signed in). */
function appSessionJwt(): string {
  try {
    const store = (globalThis as Record<string, unknown>).__playgroundUserStore as
      { getState?: () => { activePageJwt?: () => string | null } } | undefined;
    return store?.getState?.().activePageJwt?.() ?? '';
  } catch {
    return '';
  }
}

const PK_NUMERIC_TYPES = new Set(['integer', 'float', 'decimal']);

/** status 0 = network failure; body = parsed JSON (null when unparseable). */
export interface LiveWriteResult {
  status: number;
  body: unknown;
}

/** POST one JSON payload; never throws — failures become `{status: 0}`. */
export async function postLiveWrite(path: string, payload: unknown): Promise<LiveWriteResult> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const jwt = appSessionJwt();
  if (jwt) headers.Authorization = `Bearer ${jwt}`;
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const body: unknown = await response.json().catch(() => null);
    return { status: response.status, body };
  } catch (error) {
    return { status: 0, body: { message: error instanceof Error ? error.message : String(error) } };
  }
}

/** Single-table write/read op: `POST /api/databases/:dbId/tables/:table`. */
export function writeLiveTableOp(
  dbId: string,
  table: string,
  body: Record<string, unknown>,
): Promise<LiveWriteResult> {
  const path = `/api/databases/${encodeURIComponent(dbId)}/tables/${encodeURIComponent(table)}`;
  return postLiveWrite(path, body);
}

/** One DDL operation: `POST /api/databases/:dbId/schema/ddl`. */
export function postLiveDdl(
  dbId: string,
  request: Record<string, unknown>,
): Promise<LiveWriteResult> {
  return postLiveWrite(`/api/databases/${encodeURIComponent(dbId)}/schema/ddl`, request);
}

/** `<pk>` (joined `:` for composite keys) → a filter on the pk columns, with
 *  numeric pk segments coerced so SQL engines match typed columns. */
export function livePkFilter(table: LiveTableSchema, pk: string): Record<string, unknown> {
  const columns = table.primary_key.length > 0 ? table.primary_key : ['id'];
  const parts = pk.split(':');
  const filter: Record<string, unknown> = {};
  columns.forEach((name, index) => {
    const part = index === columns.length - 1 ? parts.slice(index).join(':') : parts[index] ?? '';
    const column = table.columns.find((candidate) => candidate.name === name);
    const numeric = column && PK_NUMERIC_TYPES.has(column.normalized_type) && part.trim() !== '';
    filter[name] = numeric && Number.isFinite(Number(part)) ? Number(part) : part;
  });
  return filter;
}
