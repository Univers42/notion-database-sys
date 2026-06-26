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
 * + row listing.
 *
 * Routed through the osionos BRIDGE (`VITE_API_URL` + `/api/databases/*`), NOT
 * Kong directly: the browser's anon key 401s on `/query/v1` + `/admin/v1`, so
 * the bridge proxies to the internal query-router with the tenant key. Auth is
 * the app-session JWT read from the `__playgroundUserStore` global publish seam
 * (the same seam the app api-client uses) — a runtime global, so the submodule
 * stays free of app-module imports.
 */

import { AdapterError } from '../../component/types';
import type { LiveListParams, LiveRowsResponse, LiveSchemaResponse } from './liveTypes';

// `?? {}` keeps the module import-safe outside Vite (e.g. node:test).
const env = (import.meta.env ?? {}) as Record<string, string | undefined>;
const BASE_URL = (env.VITE_API_URL ?? '').trim().replace(/\/$/, '');

const SCHEMA_TTL_MS = 60_000;
const schemaCache = new Map<string, { value: Promise<LiveSchemaResponse>; expiresAt: number }>();

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

/** True when the bridge base URL is configured (the JWT is checked per call). */
export function liveBaasConfigured(): boolean {
  return Boolean(BASE_URL);
}

/** Shared authenticated transport for query-router calls (also used by the
 *  aggregate client in liveAggregateClient.ts). */
export async function requestLive<T>(path: string, init: RequestInit): Promise<T> {
  if (!liveBaasConfigured()) {
    throw new AdapterError(
      'Live databases are not configured (set VITE_API_URL to the osionos bridge).',
      0,
      path,
      'NOT_CONFIGURED',
    );
  }
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const jwt = appSessionJwt();
  if (jwt) headers.Authorization = `Bearer ${jwt}`;
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

/** `GET /api/databases/:dbId/schema` — cached 60s per mount, failures not cached. */
export function getLiveSchema(dbId: string): Promise<LiveSchemaResponse> {
  const cached = schemaCache.get(dbId);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const path = `/api/databases/${encodeURIComponent(dbId)}/schema`;
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

/** `POST /api/databases/:dbId/tables/:table` with `op: 'list' | 'get'`. */
export function listLiveRows(
  dbId: string,
  table: string,
  params: LiveListParams = {},
  op: 'list' | 'get' = 'list',
): Promise<LiveRowsResponse> {
  const path = `/api/databases/${encodeURIComponent(dbId)}/tables/${encodeURIComponent(table)}`;
  return requestLive<LiveRowsResponse>(path, {
    method: 'POST',
    body: JSON.stringify({ op, ...params }),
  });
}
