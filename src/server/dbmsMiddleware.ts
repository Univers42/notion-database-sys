/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   dbmsMiddleware.ts                                  :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/03 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 23:14:06 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { Connect, ViteDevServer } from 'vite';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { initFileWatcher, stopFileWatcher, markOwnWrite } from './fileWatcher';
import { initLogger, logLifecycle } from './logger';
import {
  dispatchInsert, dispatchDelete, dispatchUpdate,
  dispatchAddColumn, dispatchDropColumn, dispatchChangeType,
  getQueryLog, clearQueryLog,
} from './ops/index';
import { validatePropertyValue } from '../store/validation';
import { safeString } from '../utils/safeString';
import { pgLoadPages } from './db/pgLoader';
import { mongoLoadPages } from './db/mongoLoader';


type DbSourceType = 'json' | 'csv' | 'mongodb' | 'postgresql';

interface NotionState {
  databases: Record<string, unknown>;
  pages: Record<string, unknown>;
  views: Record<string, unknown>;
}

interface SchemaProp {
  id: string;
  name: string;
  type: string;
  options?: { id: string; value: string; color: string }[];
}

const OPTION_TYPES = new Set(['select', 'status', 'multi_select']);

/** Convert a single display value → option ID  (select / status). */
function displayToId(val: unknown, prop: SchemaProp): unknown {
  if (val == null || val === '') return val;
  const opts = prop.options ?? [];
  if (opts.length === 0) return val;
  const s = safeString(val);
  // Already an option ID?
  if (opts.some(o => o.id === s)) return s;
  // Match by display value (case-insensitive)
  const byVal = opts.find(o => o.value.toLowerCase() === s.toLowerCase());
  return byVal ? byVal.id : val;
}

/** Convert multi-select display values → option IDs (deduped). */
function displayArrayToIds(val: unknown, prop: SchemaProp): unknown {
  if (!Array.isArray(val)) return val == null ? val : displayArrayToIds([val], prop);
  const opts = prop.options ?? [];
  if (opts.length === 0) return val;
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of val) {
    const s = String(item);
    // Already an option ID?
    let resolved = opts.some(o => o.id === s) ? s : undefined;
    if (!resolved) {
      const byVal = opts.find(o => o.value.toLowerCase() === s.toLowerCase());
      if (byVal) resolved = byVal.id;
    }
    const id = resolved ?? s;
    if (!seen.has(id)) { seen.add(id); result.push(id); }
  }
  return result;
}

/** Normalise all properties of a page from display values → option IDs. */
function normalizePageToOptionIds(
  properties: Record<string, unknown>,
  schema: Record<string, SchemaProp>,
): Record<string, unknown> {
  const out = { ...properties };
  for (const [propId, prop] of Object.entries(schema)) {
    if (!(propId in out) || !OPTION_TYPES.has(prop.type)) continue;
    const raw = out[propId];
    if (raw == null) continue;
    if (prop.type === 'multi_select') {
      out[propId] = displayArrayToIds(raw, prop);
    } else {
      out[propId] = displayToId(raw, prop);
    }
  }
  return out;
}

/** Convert a single option ID → display value  (select / status). */
function idToDisplay(val: unknown, prop: SchemaProp): unknown {
  if (val == null || val === '') return val;
  const opts = prop.options ?? [];
  if (opts.length === 0) return val;
  const s = safeString(val);
  const byId = opts.find(o => o.id === s);
  return byId ? byId.value : val;            // already a display value? pass through
}

/** Convert multi-select option IDs → display values. */
function idsToDisplayArray(val: unknown, prop: SchemaProp): unknown {
  if (!Array.isArray(val)) return val;
  const opts = prop.options ?? [];
  if (opts.length === 0) return val;
  return val.map(item => {
    const s = String(item);
    const byId = opts.find(o => o.id === s);
    return byId ? byId.value : s;
  });
}

/** Convert a property value from internal (option ID) to DB-friendly display value.
 *  Only affects select / status / multi_select; everything else passes through. */
function convertValueToDisplay(value: unknown, prop: SchemaProp | undefined): unknown {
  if (!prop || !OPTION_TYPES.has(prop.type)) return value;
  if (prop.type === 'multi_select') return idsToDisplayArray(value, prop);
  return idToDisplay(value, prop);
}

const ROOT = resolve(process.cwd());

/** Map source type → directory holding seed files. */
const SOURCE_DIR: Record<DbSourceType, string> = {
  json: join(ROOT, 'src', 'store', 'dbms', 'json'),
  csv: join(ROOT, 'src', 'store', 'dbms', 'csv'),
  mongodb: join(ROOT, 'src', 'store', 'dbms', 'mongodb'),
  postgresql: join(ROOT, 'src', 'store', 'dbms', 'relational'),
};

const STATE_FILE = '_notion_state.json';
const FIELD_MAP_FILE = '_field_map.json';

/** Active source — persists across requests in the Vite process. */
let activeSource: DbSourceType = (process.env.ACTIVE_DB_SOURCE as DbSourceType) ?? 'json';

/** Returns the currently active DBMS source type. */
export function getActiveSource(): DbSourceType { return activeSource; }

/** Reject mutation requests from a stale source (race condition guard).
 *  Returns true if the request should be skipped. */
function isStaleSource(body: Record<string, unknown>, res: import('node:http').ServerResponse): boolean {
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
function isLiveDbSource(src: DbSourceType): boolean { return src === 'postgresql' || src === 'mongodb'; }

/** Merge a live page with its seed counterpart, preserving metadata. */
function mergeLivePage(
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

let liveCache: NotionState | null = null;
let liveCacheSource: DbSourceType | null = null;

/** Get state for any source — uses in-memory cache for live DB sources. */
async function getEffectiveState(source: DbSourceType): Promise<NotionState> {
  if (!isLiveDbSource(source)) return readState(source);
  if (liveCache && liveCacheSource === source) return liveCache;
  const state = await loadLiveState(source);
  liveCache = state;
  liveCacheSource = source;
  return state;
}

/** Invalidate the live state cache (on source switch or external refresh). */
function invalidateLiveCache(): void {
  liveCache = null;
  liveCacheSource = null;
}

function statePath(source: DbSourceType): string {
  return join(SOURCE_DIR[source], STATE_FILE);
}

function fieldMapPath(source: DbSourceType): string {
  return join(SOURCE_DIR[source], FIELD_MAP_FILE);
}

function readState(source: DbSourceType): NotionState {
  const p = statePath(source);
  if (!existsSync(p)) {
    throw new Error(`State file not found for source "${source}": ${p}`);
  }
  return JSON.parse(readFileSync(p, 'utf-8')) as NotionState;
}

function writeState(source: DbSourceType, state: NotionState): void {
  const p = statePath(source);
  markOwnWrite(p);
  writeFileSync(p, JSON.stringify(state, null, 2), 'utf-8');
}


interface PageLike {
  id: string;
  databaseId: string;
  properties: Record<string, unknown>;
  [key: string]: unknown;
}

function readFieldMap(source: DbSourceType): Record<string, Record<string, string>> {
  const p = fieldMapPath(source);
  if (!existsSync(p)) return {};
  return JSON.parse(readFileSync(p, 'utf-8'));
}

/** Resolve possible flat-file IDs for this page.
 *  Returns candidates: auto-increment property value (if mapped) + page ID. */
function resolveFlatIds(page: PageLike, fieldMap: Record<string, string>): string[] {
  const ids: string[] = [];
  for (const [propId, fieldName] of Object.entries(fieldMap)) {
    if (fieldName === 'id' && propId in page.properties) {
      ids.push(safeString(page.properties[propId]));
    }
  }
  // Always include raw page ID as fallback
  if (!ids.includes(page.id)) ids.push(page.id);
  return ids;
}

/** Resolve the single best flat-file ID for a page (auto-increment first). */
function resolveFlatId(page: PageLike, fieldMap: Record<string, string>): string {
  for (const [propId, fieldName] of Object.entries(fieldMap)) {
    if (fieldName === 'id' && propId in page.properties) {
      return safeString(page.properties[propId]);
    }
  }
  return page.id;
}

/** Update flat record fields from page properties (skip 'id'). */
function updateFlatRecord(
  record: Record<string, unknown>, page: PageLike, fieldMap: Record<string, string>,
): void {
  for (const [propId, fieldName] of Object.entries(fieldMap)) {
    if (fieldName === 'id') continue;
    if (propId in page.properties) {
      record[fieldName] = page.properties[propId];
    }
  }
}

/** Sync a page change to its flat JSON entity file. */
function syncJsonEntity(source: DbSourceType, page: PageLike, fieldMap: Record<string, string>): void {
  if (source !== 'json') return;
  const flatIds = resolveFlatIds(page, fieldMap);

  const entityFiles = getEntityFiles(SOURCE_DIR.json, '.json');
  for (const filePath of entityFiles) {
    try {
      const raw = JSON.parse(readFileSync(filePath, 'utf-8'));
      const records: Record<string, unknown>[] = raw.records ?? raw;
      const idx = records.findIndex((r) => flatIds.includes(safeString(r.id)));
      if (idx === -1) continue;
      updateFlatRecord(records[idx], page, fieldMap);
      markOwnWrite(filePath);
      const output = raw.records ? { ...raw, records } : records;
      writeFileSync(filePath, JSON.stringify(output, null, 2), 'utf-8');
      return;
    } catch {
      // skip files that don't parse
    }
  }
}

/** Update CSV cells from page properties (skip 'id'). */
function updateCsvCells(
  cells: string[], headers: string[], page: PageLike, fieldMap: Record<string, string>,
): void {
  for (const [propId, fieldName] of Object.entries(fieldMap)) {
    if (fieldName === 'id') continue;
    const col = headers.indexOf(fieldName);
    if (col !== -1 && propId in page.properties) {
      cells[col] = safeString(page.properties[propId] ?? '');
    }
  }
}

/** Find and update the matching CSV row. Returns true if found. */
function findAndUpdateCsvRow(
  lines: string[], headers: string[], idCol: number,
  flatIds: string[], page: PageLike, fieldMap: Record<string, string>,
): boolean {
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cells = parseCSVLine(lines[i]);
    if (!flatIds.includes(cells[idCol])) continue;
    updateCsvCells(cells, headers, page, fieldMap);
    lines[i] = cells.map(csvEscape).join(',');
    return true;
  }
  return false;
}

/** Sync a page change to its flat CSV entity file. */
function syncCsvEntity(source: DbSourceType, page: PageLike, fieldMap: Record<string, string>): void {
  if (source !== 'csv') return;
  const flatIds = resolveFlatIds(page, fieldMap);

  const entityFiles = getEntityFiles(SOURCE_DIR.csv, '.csv');
  for (const filePath of entityFiles) {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      if (lines.length < 2) continue;
      const headers = parseCSVLine(lines[0]);
      const idCol = headers.indexOf('id');
      if (idCol === -1) continue;

      if (findAndUpdateCsvRow(lines, headers, idCol, flatIds, page, fieldMap)) {
        markOwnWrite(filePath);
        writeFileSync(filePath, lines.join('\n'), 'utf-8');
        return;
      }
    } catch {
      // skip
    }
  }
}

function getEntityFiles(dir: string, ext: string): string[] {
  try {
    return readdirSync(dir)
      .filter((f: string) => f.endsWith(ext) && !f.startsWith('_'))
      .map((f: string) => join(dir, f));
  } catch {
    return [];
  }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes && ch === '"' && i + 1 < line.length && line[i + 1] === '"') {
      current += '"';
      i++;
    } else if (inQuotes && ch === '"') {
      inQuotes = false;
    } else if (inQuotes) {
      current += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function csvEscape(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replaceAll('"', '""')}"`;
  }
  return val;
}


function parseBody(req: Connect.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk: Buffer) => { data += chunk.toString(); });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

/* ────────────────── Type aliases ────────────────── */

type Req = Connect.IncomingMessage;
type Res = import('node:http').ServerResponse;
type ApiHandler = (req: Req, res: Res, params?: string[]) => Promise<void> | void;

/* ────────────────── Shared extraction helpers ────────────────── */

/** Build a flat record from page properties using the field map. */
function buildFlatRecord(
  fieldMap: Record<string, string>,
  properties: Record<string, unknown>,
  pageId: string,
  source: DbSourceType,
  dbSchema: Record<string, SchemaProp> | undefined,
): Record<string, unknown> {
  const flatRecord: Record<string, unknown> = {};
  for (const [propId, fieldName] of Object.entries(fieldMap)) {
    if (fieldName === 'id') {
      flatRecord.id = isLiveDbSource(source) ? pageId : (properties[propId] ?? pageId);
    } else {
      let val = properties[propId] ?? null;
      if (isLiveDbSource(source) && val != null) {
        const sp = dbSchema?.[propId];
        val = convertValueToDisplay(val, sp);
      }
      flatRecord[fieldName] = val;
    }
  }
  if (!flatRecord.id) flatRecord.id = pageId;
  return flatRecord;
}

/** Resolve the flat-file ID for a delete operation. */
function resolveOpsDeleteId(
  source: DbSourceType, pageId: string, fieldMap: Record<string, string>,
): string {
  if (isLiveDbSource(source)) return pageId;
  try {
    const state = readState(source);
    const page = state.pages[pageId] as PageLike | undefined;
    return page ? resolveFlatId(page, fieldMap) : pageId;
  } catch {
    return pageId;
  }
}

/** Apply database/page/view patches to a state object. */
function applyStatePatch(
  body: Record<string, unknown>, state: NotionState, includePages: boolean,
): void {
  if (body.databases) state.databases = body.databases as Record<string, unknown>;
  if (includePages && body.pages) state.pages = body.pages as Record<string, unknown>;
  if (body.views) state.views = body.views as Record<string, unknown>;
}

/** Sync the live cache schema when operating in live-DB mode. */
function syncLiveCacheSchemas(body: Record<string, unknown>, source: DbSourceType): void {
  if (!liveCache || liveCacheSource !== source) return;
  if (body.databases) liveCache.databases = body.databases as Record<string, unknown>;
  if (body.views) liveCache.views = body.views as Record<string, unknown>;
}

/* ────────────────── Route handler functions ────────────────── */

async function handleGetState(_req: Req, res: Res): Promise<void> {
  if (isLiveDbSource(activeSource)) invalidateLiveCache();
  const state = await getEffectiveState(activeSource);
  res.writeHead(200);
  res.end(JSON.stringify({ ...state, _source: activeSource }));
}

function handleGetSource(_req: Req, res: Res): void {
  res.writeHead(200);
  res.end(JSON.stringify({ source: activeSource }));
}

async function handlePutSource(req: Req, res: Res): Promise<void> {
  const body = await parseBody(req);
  const newSource = body.source as DbSourceType;
  if (!SOURCE_DIR[newSource]) {
    res.writeHead(400);
    res.end(JSON.stringify({ error: `Unknown source: ${newSource}` }));
    return;
  }
  activeSource = newSource;
  logLifecycle(`Source switched → ${newSource}`);
  invalidateLiveCache();
  const state = await getEffectiveState(activeSource);
  res.writeHead(200);
  res.end(JSON.stringify(state));
}

async function handlePatchPage(req: Req, res: Res, params?: string[]): Promise<void> {
  const pageId = params?.[0] ?? '';
  const body = await parseBody(req);
  if (isStaleSource(body, res)) return;
  const propertyId = body.propertyId as string;
  let value = body.value;

  const state = await getEffectiveState(activeSource);
  const page = state.pages[pageId] as PageLike | undefined;
  if (!page) {
    res.writeHead(404);
    res.end(JSON.stringify({ error: `Page ${pageId} not found` }));
    return;
  }

  const dbId = page.databaseId;
  const db = state.databases[dbId] as { properties: Record<string, { id: string; name: string; type: string; options?: { id: string; value: string; color: string }[]; relationConfig?: { databaseId: string } }> } | undefined;
  const prop = db?.properties?.[propertyId];
  if (prop) {
    const vr = validatePropertyValue(value, prop as never, state.pages as never);
    if (!vr.ok) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: vr.reason }));
      return;
    }
    value = vr.value;
  }

  page.properties[propertyId] = value;
  (page as Record<string, unknown>).updatedAt = new Date().toISOString();
  (page as Record<string, unknown>).lastEditedBy = 'You';

  const allFieldMaps = readFieldMap(activeSource);
  const fieldMap = allFieldMaps[dbId] ?? {};

  if (isLiveDbSource(activeSource)) {
    const fieldName = fieldMap[propertyId];
    if (fieldName) {
      const dbValue = convertValueToDisplay(value, prop as SchemaProp | undefined);
      dispatchUpdate(activeSource, dbId, page.id, fieldName, dbValue, fieldMap);
    }
  } else {
    writeState(activeSource, state);
    syncJsonEntity(activeSource, page, fieldMap);
    syncCsvEntity(activeSource, page, fieldMap);
    const flatId = resolveFlatId(page, fieldMap);
    const fieldName = fieldMap[propertyId];
    if (flatId && fieldName) {
      dispatchUpdate(activeSource, dbId, flatId, fieldName, value, fieldMap);
    }
  }

  res.writeHead(200);
  res.end(JSON.stringify({ ok: true }));
}

async function handlePostRecord(req: Req, res: Res): Promise<void> {
  const body = await parseBody(req);
  if (isStaleSource(body, res)) return;
  const databaseId = body.databaseId as string;
  const properties = (body.properties ?? {}) as Record<string, unknown>;
  const pageId = (body.pageId as string) ?? crypto.randomUUID();

  const state = await getEffectiveState(activeSource);
  const allFieldMaps = readFieldMap(activeSource);
  const fieldMap = allFieldMaps[databaseId] ?? {};
  const db = state.databases[databaseId] as { properties: Record<string, SchemaProp> } | undefined;
  const flatRecord = buildFlatRecord(fieldMap, properties, pageId, activeSource, db?.properties);

  state.pages[pageId] = {
    id: pageId,
    databaseId,
    properties,
    content: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'You',
    lastEditedBy: 'You',
  };

  const result = dispatchInsert(activeSource, databaseId, flatRecord, fieldMap);
  if (!isLiveDbSource(activeSource)) writeState(activeSource, state);

  res.writeHead(201);
  res.end(JSON.stringify({ ok: true, pageId, query: result?.query ?? null }));
}

async function handleDeleteRecord(_req: Req, res: Res, params?: string[]): Promise<void> {
  const pageId = params?.[0] ?? '';
  const state = await getEffectiveState(activeSource);
  const page = state.pages[pageId] as PageLike | undefined;
  if (!page) {
    res.writeHead(404);
    res.end(JSON.stringify({ error: `Page ${pageId} not found` }));
    return;
  }

  const dbId = page.databaseId;
  const allFieldMaps = readFieldMap(activeSource);
  const fieldMap = allFieldMaps[dbId] ?? {};
  const flatId = isLiveDbSource(activeSource) ? pageId : resolveFlatId(page, fieldMap);

  delete state.pages[pageId];

  const result = flatId
    ? dispatchDelete(activeSource, dbId, flatId, fieldMap)
    : null;

  if (!isLiveDbSource(activeSource)) writeState(activeSource, state);

  res.writeHead(200);
  res.end(JSON.stringify({ ok: true, query: result?.query ?? null }));
}

async function handlePostColumn(req: Req, res: Res): Promise<void> {
  const body = await parseBody(req);
  if (isStaleSource(body, res)) return;
  const databaseId = body.databaseId as string;
  const columnName = body.columnName as string;
  const propType = (body.propType as string) ?? 'text';

  const result = dispatchAddColumn(activeSource, databaseId, columnName, propType);

  if (!isLiveDbSource(activeSource)) {
    const state = readState(activeSource);
    for (const page of Object.values(state.pages) as PageLike[]) {
      if (page.databaseId === databaseId) {
        if (!(body.propId as string in page.properties)) {
          page.properties[body.propId as string] = null;
        }
      }
    }
    writeState(activeSource, state);
  }

  res.writeHead(201);
  res.end(JSON.stringify({ ok: true, query: result?.query ?? null }));
}

async function handleDeleteColumn(_req: Req, res: Res, params?: string[]): Promise<void> {
  const databaseId = params?.[0] ?? '';
  const propId = params?.[1] ?? '';

  const allFieldMaps = readFieldMap(activeSource);
  const fieldMap = allFieldMaps[databaseId] ?? {};
  const fieldName = fieldMap[propId];

  let result = null;
  if (fieldName) {
    result = dispatchDropColumn(activeSource, databaseId, fieldName);
  }

  if (!isLiveDbSource(activeSource)) {
    const state = readState(activeSource);
    for (const page of Object.values(state.pages) as PageLike[]) {
      if (page.databaseId === databaseId) {
        delete page.properties[propId];
      }
    }
    writeState(activeSource, state);
  }

  res.writeHead(200);
  res.end(JSON.stringify({ ok: true, query: result?.query ?? null }));
}

async function handleChangeColumnType(req: Req, res: Res, params?: string[]): Promise<void> {
  const databaseId = params?.[0] ?? '';
  const propId = params?.[1] ?? '';
  const body = await parseBody(req);
  const oldType = body.oldType as string;
  const newType = body.newType as string;

  const allFieldMaps = readFieldMap(activeSource);
  const fieldMap = allFieldMaps[databaseId] ?? {};
  const fieldName = fieldMap[propId];

  let result = null;
  if (fieldName) {
    result = dispatchChangeType(activeSource, databaseId, fieldName, oldType, newType);
  }

  res.writeHead(200);
  res.end(JSON.stringify({ ok: true, query: result?.query ?? null }));
}

function handleGetQueryLog(req: Req, res: Res): void {
  const params = new URL(req.url ?? '', 'http://localhost').searchParams;
  const limit = Number(params.get('limit')) || 50;
  res.writeHead(200);
  res.end(JSON.stringify(getQueryLog(limit)));
}

function handleDeleteQueryLog(_req: Req, res: Res): void {
  clearQueryLog();
  res.writeHead(200);
  res.end(JSON.stringify({ ok: true }));
}

async function handlePostOps(req: Req, res: Res): Promise<void> {
  const body = await parseBody(req);
  if (isStaleSource(body, res)) return;
  const action = body.action as string;
  const databaseId = body.databaseId as string;

  const allFieldMaps = readFieldMap(activeSource);
  const fieldMap = allFieldMaps[databaseId] ?? {};

  let result: ReturnType<typeof dispatchInsert> = null;

  switch (action) {
    case 'insert': {
      const opsState = await getEffectiveState(activeSource);
      const opsDb = opsState.databases[databaseId] as { properties: Record<string, SchemaProp> } | undefined;
      const properties = (body.properties ?? {}) as Record<string, unknown>;
      const pageId = body.pageId as string;
      result = dispatchInsert(activeSource, databaseId,
        buildFlatRecord(fieldMap, properties, pageId, activeSource, opsDb?.properties), fieldMap);
      break;
    }
    case 'delete': {
      const deleteId = resolveOpsDeleteId(activeSource, body.pageId as string, fieldMap);
      result = dispatchDelete(activeSource, databaseId, deleteId, fieldMap);
      break;
    }
    case 'addColumn': {
      const columnName = body.columnName as string;
      const propType = (body.propType as string) ?? 'text';
      result = dispatchAddColumn(activeSource, databaseId, columnName, propType);
      break;
    }
    case 'dropColumn':
      result = dispatchDropColumn(activeSource, databaseId, body.columnName as string);
      break;
    case 'changeType': {
      const { columnName, oldType, newType } = body as Record<string, string>;
      result = dispatchChangeType(activeSource, databaseId, columnName, oldType, newType);
      break;
    }
    default:
      res.writeHead(400);
      res.end(JSON.stringify({ error: `Unknown ops action: ${action}` }));
      return;
  }

  res.writeHead(200);
  res.end(JSON.stringify({ ok: true, query: result?.query ?? null }));
}

async function handlePatchState(req: Req, res: Res): Promise<void> {
  const body = await parseBody(req);
  if (isStaleSource(body, res)) return;
  const state = readState(activeSource);
  const isLive = isLiveDbSource(activeSource);
  applyStatePatch(body, state, !isLive);
  writeState(activeSource, state);
  if (isLive) syncLiveCacheSchemas(body, activeSource);
  res.writeHead(200);
  res.end(JSON.stringify({ ok: true }));
}

/* ────────────────── Route tables ────────────────── */

const EXACT_ROUTES: Record<string, ApiHandler> = {
  'GET /api/dbms/state': handleGetState,
  'GET /api/dbms/source': handleGetSource,
  'PUT /api/dbms/source': handlePutSource,
  'POST /api/dbms/records': handlePostRecord,
  'POST /api/dbms/columns': handlePostColumn,
  'GET /api/dbms/query-log': handleGetQueryLog,
  'DELETE /api/dbms/query-log': handleDeleteQueryLog,
  'POST /api/dbms/ops': handlePostOps,
  'PATCH /api/dbms/state': handlePatchState,
};

const PARAM_ROUTES: Array<{ method: string; pattern: RegExp; handler: ApiHandler }> = [
  { method: 'PATCH', pattern: /^\/api\/dbms\/pages\/([^/]+)$/, handler: handlePatchPage },
  { method: 'DELETE', pattern: /^\/api\/dbms\/records\/([^/]+)$/, handler: handleDeleteRecord },
  { method: 'DELETE', pattern: /^\/api\/dbms\/columns\/([^/]+)\/([^/]+)$/, handler: handleDeleteColumn },
  { method: 'PATCH', pattern: /^\/api\/dbms\/columns\/([^/]+)\/([^/]+)\/type$/, handler: handleChangeColumnType },
];

/** Dispatch an API request to the appropriate route handler. */
async function dbmsApiRouter(req: Req, res: Res): Promise<void> {
  const rawUrl = req.url ?? '';
  const qIdx = rawUrl.indexOf('?');
  const path = qIdx === -1 ? rawUrl : rawUrl.slice(0, qIdx);
  const method = req.method ?? '';
  const key = `${method} ${path}`;

  const exact = EXACT_ROUTES[key];
  if (exact) { await exact(req, res); return; }

  for (const route of PARAM_ROUTES) {
    if (method !== route.method) continue;
    const m = route.pattern.exec(path);
    if (!m) continue;
    await route.handler(req, res, m.slice(1).map(decodeURIComponent));
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
}

/** Registers DBMS REST API routes on the Vite dev server. */
export function dbmsMiddleware(server: ViteDevServer): void {
  // Initialize the styled logger system (Observer + Decorator chain)
  initLogger(activeSource);

  // Start file watcher (inotify — zero CPU)
  initFileWatcher(server, getActiveSource);
  server.httpServer?.on('close', stopFileWatcher);

  server.middlewares.use(async (req, res, next) => {
    const url = req.url ?? '';
    if (!url.startsWith('/api/dbms/')) return next();
    res.setHeader('Content-Type', 'application/json');
    try {
      await dbmsApiRouter(req, res);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[dbms-middleware]', message);
      res.writeHead(500);
      res.end(JSON.stringify({ error: message }));
    }
  });
}
