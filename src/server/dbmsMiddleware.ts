// ─── DBMS API Middleware for Vite Dev Server ────────────────────────────────
// Provides REST endpoints that bridge the browser frontend to the
// file-based DBMS adapters.  Runs inside the Vite Node.js process.
//
// Endpoints:
//   GET  /api/dbms/state                                → full { databases, pages, views }
//   GET  /api/dbms/source                               → { source: "json" | "csv" | … }
//   PUT  /api/dbms/source                               → { source }  — switch active source
//   PATCH /api/dbms/pages/:id                           → { propertyId, value }
//   PATCH /api/dbms/state                               → partial state  — bulk update
//   POST  /api/dbms/records                             → create record
//   DELETE /api/dbms/records/:pageId                    → delete record
//   POST  /api/dbms/columns                             → add column
//   DELETE /api/dbms/columns/:databaseId/:propId        → remove column
//   PATCH  /api/dbms/columns/:databaseId/:propId/type   → change column type
//   GET  /api/dbms/query-log                            → recent generated queries
// ─────────────────────────────────────────────────────────────────────────────

import type { Connect, ViteDevServer } from 'vite';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { initFileWatcher, stopFileWatcher, markOwnWrite } from './fileWatcher';
import {
  dispatchInsert, dispatchDelete, dispatchUpdate,
  dispatchAddColumn, dispatchDropColumn, dispatchChangeType,
  getQueryLog, clearQueryLog,
} from './ops/index';
import { validatePropertyValue } from '../store/validation';
import { pgLoadPages } from './db/pgLoader';
import { mongoLoadPages } from './db/mongoLoader';

// ─── Types ───────────────────────────────────────────────────────────────────
type DbSourceType = 'json' | 'csv' | 'mongodb' | 'postgresql';

interface NotionState {
  databases: Record<string, unknown>;
  pages: Record<string, unknown>;
  views: Record<string, unknown>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
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

/** Expose a getter for the file watcher. */
export function getActiveSource(): DbSourceType { return activeSource; }

/** Whether the source is backed by a live database container. */
function isLiveDbSource(src: DbSourceType): boolean { return src === 'postgresql' || src === 'mongodb'; }

/** Load pages from the live DB, merging with the seed state for schemas/views.
 *  Falls back to seed state if the container is unreachable. */
async function loadLiveState(source: DbSourceType): Promise<NotionState> {
  const seed = readState(source); // always need schemas + views from seed
  const fieldMaps = readFieldMap(source);
  let livePages: Record<string, Record<string, unknown>> | null = null;

  if (source === 'postgresql') {
    livePages = await pgLoadPages(fieldMaps);
  } else if (source === 'mongodb') {
    livePages = await mongoLoadPages(fieldMaps);
  }

  if (livePages) {
    // Merge: keep seed page metadata (icon, content) but overlay live properties
    for (const [pageId, livePage] of Object.entries(livePages)) {
      const seedPage = seed.pages[pageId] as Record<string, unknown> | undefined;
      if (seedPage) {
        // Preserve seed metadata that doesn't exist in the DB
        livePage.icon = livePage.icon ?? seedPage.icon;
        livePage.content = seedPage.content ?? [];
        // Merge: live properties override, but keep seed-only props (formula/rollup)
        const seedProps = (seedPage.properties ?? {}) as Record<string, unknown>;
        const liveProps = (livePage.properties ?? {}) as Record<string, unknown>;
        livePage.properties = { ...seedProps, ...liveProps };
      }
      livePages[pageId] = livePage;
    }
    seed.pages = livePages;
  }
  return seed;
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

// ─── Flat-file sync helpers ─────────────────────────────────────────────────
// When a page property changes, also update the corresponding flat file.

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
      ids.push(String(page.properties[propId]));
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
      return String(page.properties[propId]);
    }
  }
  return page.id;
}

/** Sync a page change to its flat JSON entity file. */
function syncJsonEntity(source: DbSourceType, page: PageLike, fieldMap: Record<string, string>): void {
  if (source !== 'json') return;
  const flatIds = resolveFlatIds(page, fieldMap);

  const dir = SOURCE_DIR.json;
  const entityFiles = getEntityFiles(dir, '.json');
  for (const filePath of entityFiles) {
    try {
      const raw = JSON.parse(readFileSync(filePath, 'utf-8'));
      const records: Record<string, unknown>[] = raw.records ?? raw;
      const idx = records.findIndex((r) => flatIds.includes(String(r.id)));
      if (idx === -1) continue;
      // Update the flat record (skip the 'id' field itself)
      for (const [propId, fieldName] of Object.entries(fieldMap)) {
        if (fieldName === 'id') continue; // never overwrite the primary key
        if (propId in page.properties) {
          records[idx][fieldName] = page.properties[propId];
        }
      }
      // Write back (mark as our own write so the watcher ignores it)
      markOwnWrite(filePath);
      if (raw.records) {
        raw.records = records;
        writeFileSync(filePath, JSON.stringify(raw, null, 2), 'utf-8');
      } else {
        writeFileSync(filePath, JSON.stringify(records, null, 2), 'utf-8');
      }
      return;
    } catch {
      // skip files that don't parse
    }
  }
}

/** Sync a page change to its flat CSV entity file. */
function syncCsvEntity(source: DbSourceType, page: PageLike, fieldMap: Record<string, string>): void {
  if (source !== 'csv') return;
  const flatIds = resolveFlatIds(page, fieldMap);

  const dir = SOURCE_DIR.csv;
  const entityFiles = getEntityFiles(dir, '.csv');
  for (const filePath of entityFiles) {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      if (lines.length < 2) continue;
      const headers = parseCSVLine(lines[0]);
      const idCol = headers.indexOf('id');
      if (idCol === -1) continue;

      let found = false;
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const cells = parseCSVLine(lines[i]);
        if (!flatIds.includes(cells[idCol])) continue;
        // Update cells (skip the 'id' column to preserve primary key)
        for (const [propId, fieldName] of Object.entries(fieldMap)) {
          if (fieldName === 'id') continue;
          const col = headers.indexOf(fieldName);
          if (col !== -1 && propId in page.properties) {
            cells[col] = String(page.properties[propId] ?? '');
          }
        }
        lines[i] = cells.map(csvEscape).join(',');
        found = true;
        break;
      }
      if (found) {
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
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
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
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

// ─── JSON body parser helper ─────────────────────────────────────────────────
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

// ─── Middleware factory ──────────────────────────────────────────────────────
export function dbmsMiddleware(server: ViteDevServer): void {
  // Start file watcher (inotify — zero CPU)
  initFileWatcher(server, getActiveSource);
  server.httpServer?.on('close', stopFileWatcher);

  server.middlewares.use(async (req, res, next) => {
    const url = req.url ?? '';
    if (!url.startsWith('/api/dbms/')) return next();

    res.setHeader('Content-Type', 'application/json');

    try {
      // ── GET /api/dbms/state ──
      if (url === '/api/dbms/state' && req.method === 'GET') {
        const state = isLiveDbSource(activeSource)
          ? await loadLiveState(activeSource)
          : readState(activeSource);
        res.writeHead(200);
        res.end(JSON.stringify(state));
        return;
      }

      // ── GET /api/dbms/source ──
      if (url === '/api/dbms/source' && req.method === 'GET') {
        res.writeHead(200);
        res.end(JSON.stringify({ source: activeSource }));
        return;
      }

      // ── PUT /api/dbms/source ──
      if (url === '/api/dbms/source' && req.method === 'PUT') {
        const body = await parseBody(req);
        const newSource = body.source as DbSourceType;
        if (!SOURCE_DIR[newSource]) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: `Unknown source: ${newSource}` }));
          return;
        }
        activeSource = newSource;
        const state = isLiveDbSource(activeSource)
          ? await loadLiveState(activeSource)
          : readState(activeSource);
        res.writeHead(200);
        res.end(JSON.stringify(state));
        return;
      }

      // ── PATCH /api/dbms/pages/:pageId ──
      const pageMatch = url.match(/^\/api\/dbms\/pages\/([^/]+)$/);
      if (pageMatch && req.method === 'PATCH') {
        const pageId = decodeURIComponent(pageMatch[1]);
        const body = await parseBody(req);
        const propertyId = body.propertyId as string;
        let value = body.value;

        const state = readState(activeSource);
        const page = state.pages[pageId] as PageLike | undefined;
        if (!page) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: `Page ${pageId} not found` }));
          return;
        }

        // Server-side validation & coercion
        const dbId = page.databaseId;
        const db = state.databases[dbId] as { properties: Record<string, { id: string; name: string; type: string; options?: { id: string; value: string; color: string }[]; relationConfig?: { databaseId: string } }> } | undefined;
        const prop = db?.properties?.[propertyId];
        if (prop) {
          // Cast to SchemaProperty-compatible shape for validation
          const vr = validatePropertyValue(value, prop as never, state.pages as never);
          if (!vr.ok) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: vr.reason }));
            return;
          }
          value = vr.value;
        }

        // Update property in state object
        (page.properties as Record<string, unknown>)[propertyId] = value;
        (page as Record<string, unknown>).updatedAt = new Date().toISOString();
        (page as Record<string, unknown>).lastEditedBy = 'You';

        const allFieldMaps = readFieldMap(activeSource);
        const fieldMap = allFieldMaps[dbId] ?? {};

        if (isLiveDbSource(activeSource)) {
          // Live DB source: use page.id as the DB primary key (NOT display ID)
          const fieldName = fieldMap[propertyId];
          if (fieldName) {
            dispatchUpdate(activeSource, dbId, page.id, fieldName, value, fieldMap);
          }
        } else {
          // File-based source: persist state + sync flat files
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
        return;
      }

      // ── POST /api/dbms/records — create a new record ──
      if (url === '/api/dbms/records' && req.method === 'POST') {
        const body = await parseBody(req);
        const databaseId = body.databaseId as string;
        const properties = (body.properties ?? {}) as Record<string, unknown>;
        const pageId = (body.pageId as string) ?? crypto.randomUUID();

        const state = readState(activeSource);
        const allFieldMaps = readFieldMap(activeSource);
        const fieldMap = allFieldMaps[databaseId] ?? {};

        // Build flat record from properties + field map
        const flatRecord: Record<string, unknown> = {};
        for (const [propId, fieldName] of Object.entries(fieldMap)) {
          if (fieldName === 'id') {
            // Live DB: id column = page primary key, not display value
            flatRecord.id = isLiveDbSource(activeSource) ? pageId : (properties[propId] ?? pageId);
          } else {
            flatRecord[fieldName] = properties[propId] ?? null;
          }
        }
        if (!flatRecord.id) flatRecord.id = pageId;

        // Add page to state
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

        // Dispatch to ops layer (live DB sources execute the query)
        const result = dispatchInsert(activeSource, databaseId, flatRecord, fieldMap);

        // File-based sources: persist state to disk
        if (!isLiveDbSource(activeSource)) {
          writeState(activeSource, state);
        }

        res.writeHead(201);
        res.end(JSON.stringify({ ok: true, pageId, query: result?.query ?? null }));
        return;
      }

      // ── DELETE /api/dbms/records/:pageId — delete a record ──
      const deleteRecordMatch = url.match(/^\/api\/dbms\/records\/([^/]+)$/);
      if (deleteRecordMatch && req.method === 'DELETE') {
        const pageId = decodeURIComponent(deleteRecordMatch[1]);
        const state = readState(activeSource);
        const page = state.pages[pageId] as PageLike | undefined;
        if (!page) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: `Page ${pageId} not found` }));
          return;
        }

        const dbId = page.databaseId;
        const allFieldMaps = readFieldMap(activeSource);
        const fieldMap = allFieldMaps[dbId] ?? {};
        // Live DB: use page.id as the DB primary key
        const flatId = isLiveDbSource(activeSource) ? pageId : resolveFlatId(page, fieldMap);

        // Remove from state
        delete state.pages[pageId];

        // Dispatch to ops layer (live DB sources execute the query)
        const result = flatId
          ? dispatchDelete(activeSource, dbId, flatId, fieldMap)
          : null;

        // File-based sources: persist state to disk
        if (!isLiveDbSource(activeSource)) {
          writeState(activeSource, state);
        }

        res.writeHead(200);
        res.end(JSON.stringify({ ok: true, query: result?.query ?? null }));
        return;
      }

      // ── POST /api/dbms/columns — add a column ──
      if (url === '/api/dbms/columns' && req.method === 'POST') {
        const body = await parseBody(req);
        const databaseId = body.databaseId as string;
        const columnName = body.columnName as string;
        const propType = (body.propType as string) ?? 'text';

        const result = dispatchAddColumn(activeSource, databaseId, columnName, propType);

        // File-based sources: persist to state (add empty values for all pages)
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
        return;
      }

      // ── DELETE /api/dbms/columns/:databaseId/:propId — remove a column ──
      const dropColMatch = url.match(/^\/api\/dbms\/columns\/([^/]+)\/([^/]+)$/);
      if (dropColMatch && req.method === 'DELETE') {
        const databaseId = decodeURIComponent(dropColMatch[1]);
        const propId = decodeURIComponent(dropColMatch[2]);

        const allFieldMaps = readFieldMap(activeSource);
        const fieldMap = allFieldMaps[databaseId] ?? {};
        const fieldName = fieldMap[propId];

        let result = null;
        if (fieldName) {
          result = dispatchDropColumn(activeSource, databaseId, fieldName);
        }

        // File-based sources: remove from all pages in state
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
        return;
      }

      // ── PATCH /api/dbms/columns/:databaseId/:propId/type — change column type ──
      const changeTypeMatch = url.match(/^\/api\/dbms\/columns\/([^/]+)\/([^/]+)\/type$/);
      if (changeTypeMatch && req.method === 'PATCH') {
        const databaseId = decodeURIComponent(changeTypeMatch[1]);
        const propId = decodeURIComponent(changeTypeMatch[2]);
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
        return;
      }

      // ── GET /api/dbms/query-log — recent generated queries ──
      if (url.startsWith('/api/dbms/query-log') && req.method === 'GET') {
        const params = new URL(url, 'http://localhost').searchParams;
        const limit = Number(params.get('limit')) || 50;
        res.writeHead(200);
        res.end(JSON.stringify(getQueryLog(limit)));
        return;
      }

      // ── DELETE /api/dbms/query-log — clear query log ──
      if (url === '/api/dbms/query-log' && req.method === 'DELETE') {
        clearQueryLog();
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true }));
        return;
      }
      // ── POST /api/dbms/ops — ops-only dispatch (no state modification) ──
      if (url === '/api/dbms/ops' && req.method === 'POST') {
        const body = await parseBody(req);
        const action = body.action as string;
        const databaseId = body.databaseId as string;

        const allFieldMaps = readFieldMap(activeSource);
        const fieldMap = allFieldMaps[databaseId] ?? {};

        let result: ReturnType<typeof dispatchInsert> = null;

        switch (action) {
          case 'insert': {
            const properties = (body.properties ?? {}) as Record<string, unknown>;
            const pageId = body.pageId as string;
            const flatRecord: Record<string, unknown> = {};
            for (const [propId, fieldName] of Object.entries(fieldMap)) {
              flatRecord[fieldName === 'id' ? 'id' : fieldName] =
                fieldName === 'id' ? (properties[propId] ?? pageId) : (properties[propId] ?? null);
            }
            if (!flatRecord.id) flatRecord.id = pageId;
            result = dispatchInsert(activeSource, databaseId, flatRecord, fieldMap);
            break;
          }
          case 'delete': {
            const pageId = body.pageId as string;
            // Try to resolve flat ID from current state
            try {
              const state = readState(activeSource);
              const page = state.pages[pageId] as PageLike | undefined;
              const flatId = page ? resolveFlatId(page, fieldMap) : pageId;
              result = dispatchDelete(activeSource, databaseId, flatId, fieldMap);
            } catch {
              result = dispatchDelete(activeSource, databaseId, pageId, fieldMap);
            }
            break;
          }
          case 'addColumn': {
            const columnName = body.columnName as string;
            const propType = (body.propType as string) ?? 'text';
            result = dispatchAddColumn(activeSource, databaseId, columnName, propType);
            break;
          }
          case 'dropColumn': {
            const columnName = body.columnName as string;
            result = dispatchDropColumn(activeSource, databaseId, columnName);
            break;
          }
          case 'changeType': {
            const columnName = body.columnName as string;
            const oldType = body.oldType as string;
            const newType = body.newType as string;
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
        return;
      }
      // ── PATCH /api/dbms/state — full state replacement ──
      if (url === '/api/dbms/state' && req.method === 'PATCH') {
        if (isLiveDbSource(activeSource)) {
          // Live DB sources: no-op — the container is the source of truth
          res.writeHead(200);
          res.end(JSON.stringify({ ok: true, skipped: true }));
          return;
        }
        const body = await parseBody(req);
        const state = readState(activeSource);

        // Full replacement — critical so deletions propagate correctly
        if (body.databases) state.databases = body.databases as Record<string, unknown>;
        if (body.pages) state.pages = body.pages as Record<string, unknown>;
        if (body.views) state.views = body.views as Record<string, unknown>;

        writeState(activeSource, state);
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true }));
        return;
      }

      // ── Not matched ──
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[dbms-middleware]', message);
      res.writeHead(500);
      res.end(JSON.stringify({ error: message }));
    }
  });
}
