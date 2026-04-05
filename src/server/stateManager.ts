/** @file stateManager.ts — State read/write, live-DB caching, source management. */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { DbSourceType, NotionState, SchemaProp } from './dbmsTypes';
import { SOURCE_DIR, STATE_FILE, FIELD_MAP_FILE } from './dbmsTypes';
import { markOwnWrite } from './fileWatcher';
import { atomicWriteSync } from './atomicWrite';
import { logLifecycle } from './logger';
import { normalizePageToOptionIds } from './optionConversion';
import { pgLoadPages } from './db/pgLoader';
import { mongoLoadPages } from './db/mongoLoader';

/** Active source — persists across requests in the Vite process. */
let activeSource: DbSourceType = (process.env.ACTIVE_DB_SOURCE as DbSourceType) ?? 'json';

let liveCache: NotionState | null = null;
let liveCacheSource: DbSourceType | null = null;

/** Returns the currently active DBMS source type. */
export function getActiveSource(): DbSourceType { return activeSource; }

/** Updates the active DBMS source type. */
export function setActiveSource(src: DbSourceType): void { activeSource = src; }

/** Reject mutation requests from a stale source (race condition guard).
 *  Returns true if the request should be skipped. */
export function isStaleSource(body: Record<string, unknown>, res: import('node:http').ServerResponse): boolean {
  const reqSource = body._source as string | undefined;
  if (reqSource && reqSource !== activeSource) {
    logLifecycle(`Stale request from '${reqSource}' (active: '${activeSource}') — skipped`);
    res.writeHead(409);
    res.end(JSON.stringify({ ok: false, skipped: true, reason: 'source_mismatch' }));
    return true;
  }
  return false;
}

/** Whether the source is backed by a live database container. */
export function isLiveDbSource(src: DbSourceType): boolean { return src === 'postgresql' || src === 'mongodb'; }

export function statePath(source: DbSourceType): string {
  return join(SOURCE_DIR[source], STATE_FILE);
}

export function fieldMapPath(source: DbSourceType): string {
  return join(SOURCE_DIR[source], FIELD_MAP_FILE);
}

export function readState(source: DbSourceType): NotionState {
  const p = statePath(source);
  if (!existsSync(p)) {
    throw new Error(`State file not found for source "${source}": ${p}`);
  }
  return JSON.parse(readFileSync(p, 'utf-8')) as NotionState;
}

export function writeState(source: DbSourceType, state: NotionState): void {
  const p = statePath(source);
  markOwnWrite(p);
  atomicWriteSync(p, JSON.stringify(state, null, 2));
}

export function readFieldMap(source: DbSourceType): Record<string, Record<string, string>> {
  const p = fieldMapPath(source);
  if (!existsSync(p)) return {};
  return JSON.parse(readFileSync(p, 'utf-8'));
}

/** Merge a live page with its seed counterpart, preserving metadata. */
export function mergeLivePage(
  livePage: Record<string, unknown>,
  seedPage: Record<string, unknown> | undefined,
  dbSchema: Record<string, SchemaProp>,
): void {
  if (seedPage) {
    livePage.icon = livePage.icon ?? seedPage.icon;
    livePage.content = seedPage.content ?? [];
    const seedProps = (seedPage.properties ?? {}) as Record<string, unknown>;
    const liveProps = (livePage.properties ?? {}) as Record<string, unknown>;
    const filteredLive: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(liveProps)) {
      if (v != null) filteredLive[k] = v;
    }
    livePage.properties = { ...seedProps, ...filteredLive };
  }
  livePage.properties = normalizePageToOptionIds(
    livePage.properties as Record<string, unknown>,
    dbSchema,
  );
}

/** Load pages from the live DB, merging with the seed state for schemas/views.
 *  Falls back to seed state if the container is unreachable. */
async function loadLiveState(source: DbSourceType): Promise<NotionState> {
  const seed = readState(source);
  const fieldMaps = readFieldMap(source);
  let livePages: Record<string, Record<string, unknown>> | null = null;

  if (source === 'postgresql') {
    livePages = await pgLoadPages(fieldMaps);
  } else if (source === 'mongodb') {
    livePages = await mongoLoadPages(fieldMaps);
  }

  if (livePages) {
    for (const [pageId, livePage] of Object.entries(livePages)) {
      const seedPage = seed.pages[pageId] as Record<string, unknown> | undefined;
      const dbId = livePage.databaseId as string;
      const dbSchema = (seed.databases[dbId] as { properties: Record<string, SchemaProp> } | undefined)?.properties ?? {};
      mergeLivePage(livePage, seedPage, dbSchema);
      livePages[pageId] = livePage;
    }
    seed.pages = livePages;
  }
  return seed;
}

/** Get state for any source — uses in-memory cache for live DB sources. */
export async function getEffectiveState(source: DbSourceType): Promise<NotionState> {
  if (!isLiveDbSource(source)) return readState(source);
  if (liveCache && liveCacheSource === source) return liveCache;
  const state = await loadLiveState(source);
  liveCache = state;
  liveCacheSource = source;
  return state;
}

/** Invalidate the live state cache (on source switch or external refresh). */
export function invalidateLiveCache(): void {
  liveCache = null;
  liveCacheSource = null;
}

/** Sync the live cache schema when operating in live-DB mode. */
export function syncLiveCacheSchemas(body: Record<string, unknown>, source: DbSourceType): void {
  if (!liveCache || liveCacheSource !== source) return;
  if (body.databases) liveCache.databases = body.databases as Record<string, unknown>;
  if (body.views) liveCache.views = body.views as Record<string, unknown>;
}
