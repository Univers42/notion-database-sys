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
 * Write-side HTTP for live mounts. Auth/env mirrors liveMountClient (same
 * `VITE_BAAS_URL` / `X-Baas-Api-Key` / optional Kong `apikey`), but results
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
const BASE_URL = (env.VITE_BAAS_URL ?? '').trim().replace(/\/$/, '');
const API_KEY = (env.VITE_BAAS_API_KEY ?? '').trim();
const KONG_KEY = (env.VITE_BAAS_KONG_KEY ?? '').trim();

const PK_NUMERIC_TYPES = new Set(['integer', 'float', 'decimal']);

/** status 0 = network failure; body = parsed JSON (null when unparseable). */
export interface LiveWriteResult {
  status: number;
  body: unknown;
}

/** POST one JSON payload; never throws — failures become `{status: 0}`. */
export async function postLiveWrite(path: string, payload: unknown): Promise<LiveWriteResult> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Baas-Api-Key': API_KEY,
  };
  if (KONG_KEY) headers.apikey = KONG_KEY;
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

/** Single-table write/read op: `POST /query/v1/:dbId/tables/:table`. */
export function writeLiveTableOp(
  dbId: string,
  table: string,
  body: Record<string, unknown>,
): Promise<LiveWriteResult> {
  const path = `/query/v1/${encodeURIComponent(dbId)}/tables/${encodeURIComponent(table)}`;
  return postLiveWrite(path, body);
}

/** Atomic single-mount batch: `POST /query/v1/txn` (PG + MySQL only). */
export function postLiveTxn(
  dbId: string,
  operations: Record<string, unknown>[],
): Promise<LiveWriteResult> {
  return postLiveWrite('/query/v1/txn', { mount: dbId, operations });
}

/** One DDL operation: `POST /query/v1/:dbId/schema/ddl`. */
export function postLiveDdl(
  dbId: string,
  request: Record<string, unknown>,
): Promise<LiveWriteResult> {
  return postLiveWrite(`/query/v1/${encodeURIComponent(dbId)}/schema/ddl`, request);
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
