/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   liveMountClient.ts                                 :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/09 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/09 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * Fetch layer for live mounts: schema (60s in-module cache, in-flight dedup)
 * + row listing through the query-router.
 *
 * Auth/env mirrors `src/features/second-brain/baas/baasFetch.ts` (the source
 * of truth the graph feature uses): `VITE_BAAS_URL` base, `X-Baas-Api-Key`
 * tenant key, optional Kong `apikey`. Mirrored — not imported — because
 * notion-database-sys must stay decoupled from app feature modules.
 * Volume stays modest by design: one schema call + one first-page row list
 * per table (the app api-client's concurrency cap is for its own routes).
 */

import { AdapterError } from '../../component/types';
import type { LiveListParams, LiveRowsResponse, LiveSchemaResponse } from './liveTypes';

// `?? {}` keeps the module import-safe outside Vite (e.g. node:test).
const env = (import.meta.env ?? {}) as Record<string, string | undefined>;
const BASE_URL = (env.VITE_BAAS_URL ?? '').trim().replace(/\/$/, '');
const API_KEY = (env.VITE_BAAS_API_KEY ?? '').trim();
const KONG_KEY = (env.VITE_BAAS_KONG_KEY ?? '').trim();

const SCHEMA_TTL_MS = 60_000;
const schemaCache = new Map<string, { value: Promise<LiveSchemaResponse>; expiresAt: number }>();

/** True when the query-router base URL + tenant key are configured. */
export function liveBaasConfigured(): boolean {
  return Boolean(BASE_URL && API_KEY);
}

/** Shared authenticated transport for query-router calls (also used by the
 *  aggregate client in liveAggregateClient.ts). */
export async function requestLive<T>(path: string, init: RequestInit): Promise<T> {
  if (!liveBaasConfigured()) {
    throw new AdapterError(
      'Live BaaS is not configured (set VITE_BAAS_URL and VITE_BAAS_API_KEY).',
      0,
      path,
      'NOT_CONFIGURED',
    );
  }
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Baas-Api-Key': API_KEY,
  };
  if (KONG_KEY) headers.apikey = KONG_KEY;
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new AdapterError(message, 503, path, 'FETCH_FAILED');
  }
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const body = (payload ?? {}) as { message?: unknown; error?: unknown };
    const message = typeof body.message === 'string'
      ? body.message
      : typeof body.error === 'string'
        ? body.error
        : `Live BaaS request failed: HTTP ${response.status}`;
    throw new AdapterError(message, response.status, path);
  }
  return payload as T;
}

/** `GET /query/v1/:dbId/schema` — cached 60s per mount, failures not cached. */
export function getLiveSchema(dbId: string): Promise<LiveSchemaResponse> {
  const cached = schemaCache.get(dbId);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const path = `/query/v1/${encodeURIComponent(dbId)}/schema`;
  const value = requestLive<LiveSchemaResponse>(path, { method: 'GET' });
  const entry = { value, expiresAt: Date.now() + SCHEMA_TTL_MS };
  schemaCache.set(dbId, entry);
  value.catch(() => {
    if (schemaCache.get(dbId) === entry) schemaCache.delete(dbId);
  });
  return value;
}

/** Drop the cached schema for one mount — REQUIRED after any DDL outcome (the
 *  backend busts its own cache on success; ours must follow immediately, not
 *  after the 60s TTL, or the next reload renders a stale property map). */
export function bustLiveSchemaCache(dbId: string): void {
  schemaCache.delete(dbId);
}

/** `POST /query/v1/:dbId/tables/:table` with `op: 'list' | 'get'`. */
export function listLiveRows(
  dbId: string,
  table: string,
  params: LiveListParams = {},
  op: 'list' | 'get' = 'list',
): Promise<LiveRowsResponse> {
  const path = `/query/v1/${encodeURIComponent(dbId)}/tables/${encodeURIComponent(table)}`;
  return requestLive<LiveRowsResponse>(path, {
    method: 'POST',
    body: JSON.stringify({ op, ...params }),
  });
}
