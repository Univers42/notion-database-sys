// ─── File Watcher — inotify-based live sync for DBMS flat files ─────────────
// Uses Node's native fs.watch() which maps directly to Linux inotify(7).
// Zero polling, zero CPU overhead — the kernel pushes events to us.
//
// When a flat file (JSON/CSV) is modified outside the app (e.g. user edits
// in VS Code), this module:
//   1) Detects the change            (inotify — ~0 CPU)
//   2) Reverse-syncs flat → state    (reads file, patches _notion_state.json)
//   3) Pushes a WebSocket event      (Vite HMR channel)
//   4) Browser auto-refreshes data   (no full page reload)
// ─────────────────────────────────────────────────────────────────────────────

import type { ViteDevServer } from 'vite';
import { watch, readFileSync, writeFileSync, existsSync, type FSWatcher } from 'node:fs';
import { join, basename, extname, resolve } from 'node:path';

// ─── Types ───────────────────────────────────────────────────────────────────
type DbSourceType = 'json' | 'csv' | 'mongodb' | 'postgresql';

interface PageLike {
  id: string;
  databaseId: string;
  properties: Record<string, unknown>;
  [key: string]: unknown;
}

interface NotionState {
  databases: Record<string, unknown>;
  pages: Record<string, PageLike>;
  views: Record<string, unknown>;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const ROOT = resolve(process.cwd());

const SOURCE_DIR: Record<DbSourceType, string> = {
  json: join(ROOT, 'src', 'store', 'dbms', 'json'),
  csv: join(ROOT, 'src', 'store', 'dbms', 'csv'),
  mongodb: join(ROOT, 'src', 'store', 'dbms', 'mongodb'),
  postgresql: join(ROOT, 'src', 'store', 'dbms', 'relational'),
};

/** Map entity file basename → database ID (shared across all sources). */
const FILE_TO_DB: Record<string, string> = {
  'tasks': 'db-tasks',
  'contacts': 'db-crm',
  'content': 'db-content',
  'inventory': 'db-inventory',
  'products': 'db-products',
  'projects': 'db-projects',
};

const STATE_FILE = '_notion_state.json';
const FIELD_MAP_FILE = '_field_map.json';

// ─── Write guard — ignore our own writes ─────────────────────────────────────
// When the middleware writes a flat file, it registers the path here.
// The watcher checks and skips those.  Entries auto-expire after 2 s.
const recentOwnWrites = new Map<string, number>();
const GUARD_TTL_MS = 2000;

/** Mark a file as "just written by us" so the watcher ignores the next event. */
export function markOwnWrite(filePath: string): void {
  recentOwnWrites.set(filePath, Date.now());
}

function isOwnWrite(filePath: string): boolean {
  const ts = recentOwnWrites.get(filePath);
  if (!ts) return false;
  if (Date.now() - ts > GUARD_TTL_MS) {
    recentOwnWrites.delete(filePath);
    return false;
  }
  recentOwnWrites.delete(filePath);
  return true;
}

// ─── CSV helpers ─────────────────────────────────────────────────────────────
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = false;
      } else current += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { result.push(current); current = ''; }
    else current += ch;
  }
  result.push(current);
  return result;
}

// ─── Reverse-sync: flat file → _notion_state.json ───────────────────────────

/** Invert a field map: { propId → fieldName } → { fieldName → propId } */
function invertMap(fmap: Record<string, string>): Record<string, string> {
  const inv: Record<string, string> = {};
  for (const [propId, fieldName] of Object.entries(fmap)) {
    // First match wins (some props may map to the same field for formulas)
    if (!(fieldName in inv)) inv[fieldName] = propId;
  }
  return inv;
}

/** Read flat JSON records and merge back into the state pages. */
function syncJsonToState(
  filePath: string, dbId: string, state: NotionState,
  fieldMap: Record<string, string>,
): boolean {
  const inv = invertMap(fieldMap);
  let raw: unknown;
  try { raw = JSON.parse(readFileSync(filePath, 'utf-8')); } catch { return false; }
  const records: Record<string, unknown>[] =
    (raw && typeof raw === 'object' && 'records' in (raw as Record<string, unknown>))
      ? ((raw as Record<string, unknown>).records as Record<string, unknown>[])
      : (raw as Record<string, unknown>[]);
  if (!Array.isArray(records)) return false;

  let changed = false;
  for (const rec of records) {
    const flatId = String(rec.id ?? '');
    // Find the page with this flat ID
    const page = Object.values(state.pages).find((p) => {
      if (p.databaseId !== dbId) return false;
      // Match by page id
      if (p.id === flatId) return true;
      // Match by auto-increment property (e.g. prop-task-id maps to 'id')
      for (const [propId, fname] of Object.entries(fieldMap)) {
        if (fname === 'id' && String(p.properties[propId]) === flatId) return true;
      }
      return false;
    });
    if (!page) continue;

    // Apply each flat field → page property
    for (const [flatField, flatValue] of Object.entries(rec)) {
      if (flatField === 'id') continue; // skip primary key
      const propId = inv[flatField];
      if (!propId) continue;
      // Only update if actually different
      const currentVal = page.properties[propId];
      if (currentVal !== flatValue) {
        page.properties[propId] = flatValue;
        (page as Record<string, unknown>).updatedAt = new Date().toISOString();
        (page as Record<string, unknown>).lastEditedBy = 'External';
        changed = true;
      }
    }
  }
  return changed;
}

/** Read flat CSV records and merge back into the state pages. */
function syncCsvToState(
  filePath: string, dbId: string, state: NotionState,
  fieldMap: Record<string, string>,
): boolean {
  const inv = invertMap(fieldMap);
  let content: string;
  try { content = readFileSync(filePath, 'utf-8'); } catch { return false; }
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length < 2) return false;

  const headers = parseCSVLine(lines[0]);
  const idCol = headers.indexOf('id');
  if (idCol === -1) return false;

  let changed = false;
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]);
    const flatId = cells[idCol];
    if (!flatId) continue;

    const page = Object.values(state.pages).find((p) => {
      if (p.databaseId !== dbId) return false;
      if (p.id === flatId) return true;
      for (const [propId, fname] of Object.entries(fieldMap)) {
        if (fname === 'id' && String(p.properties[propId]) === flatId) return true;
      }
      return false;
    });
    if (!page) continue;

    for (let c = 0; c < headers.length; c++) {
      if (c === idCol) continue;
      const headerName = headers[c];
      const propId = inv[headerName];
      if (!propId) continue;
      const flatValue = cells[c] ?? '';
      // Coerce to number / boolean if the current value is of that type
      let coerced: unknown = flatValue;
      const cur = page.properties[propId];
      if (typeof cur === 'number') coerced = flatValue === '' ? null : Number(flatValue);
      else if (typeof cur === 'boolean') coerced = flatValue === 'true';
      if (cur !== coerced) {
        page.properties[propId] = coerced;
        (page as Record<string, unknown>).updatedAt = new Date().toISOString();
        (page as Record<string, unknown>).lastEditedBy = 'External';
        changed = true;
      }
    }
  }
  return changed;
}

// ─── Main watcher ────────────────────────────────────────────────────────────

const watchers: FSWatcher[] = [];

/** Get the active source from the middleware (injected at init). */
let getActiveSource: () => DbSourceType = () => 'json';

export function initFileWatcher(
  server: ViteDevServer,
  activeSourceGetter: () => DbSourceType,
): void {
  getActiveSource = activeSourceGetter;

  // Debounce map — one timer per file to coalesce rapid saves
  const debounce = new Map<string, ReturnType<typeof setTimeout>>();
  const DEBOUNCE_MS = 300;

  // Watch ALL source directories (we only react to the active one)
  for (const [sourceType, dir] of Object.entries(SOURCE_DIR)) {
    if (!existsSync(dir)) continue;

    const watcher = watch(dir, { persistent: false }, (_event, filename) => {
      if (!filename) return;
      // Only react to entity files (skip _notion_state.json, _field_map.json)
      if (filename.startsWith('_')) return;
      // Only react to the active source
      if (sourceType !== getActiveSource()) return;

      const filePath = join(dir, filename);
      const ext = extname(filename);
      const stem = basename(filename, ext);

      // Only handle JSON/CSV entity files we know about
      if (ext !== '.json' && ext !== '.csv') return;
      if (!(stem in FILE_TO_DB)) return;

      // Check write guard
      if (isOwnWrite(filePath)) return;

      // Debounce — editors save in bursts (format-on-save, etc.)
      const key = filePath;
      const prev = debounce.get(key);
      if (prev) clearTimeout(prev);

      debounce.set(key, setTimeout(() => {
        debounce.delete(key);
        handleFileChange(server, sourceType as DbSourceType, filePath, stem, ext);
      }, DEBOUNCE_MS));
    });

    watchers.push(watcher);
    console.log(`[file-watcher] 👁️  Watching ${sourceType}/ (inotify)`);
  }
}

function handleFileChange(
  server: ViteDevServer,
  source: DbSourceType,
  filePath: string,
  stem: string,
  ext: string,
): void {
  const dbId = FILE_TO_DB[stem];
  if (!dbId) return;

  console.log(`[file-watcher] 📝 External change detected: ${stem}${ext} (${source})`);

  try {
    // 1) Read current state
    const stateFilePath = join(SOURCE_DIR[source], STATE_FILE);
    if (!existsSync(stateFilePath)) return;
    const state: NotionState = JSON.parse(readFileSync(stateFilePath, 'utf-8'));

    // 2) Read field map
    const mapPath = join(SOURCE_DIR[source], FIELD_MAP_FILE);
    const allFieldMaps: Record<string, Record<string, string>> =
      existsSync(mapPath) ? JSON.parse(readFileSync(mapPath, 'utf-8')) : {};
    const fieldMap = allFieldMaps[dbId] ?? {};

    // 3) Reverse-sync flat → state
    let changed = false;
    if (ext === '.json') {
      changed = syncJsonToState(filePath, dbId, state, fieldMap);
    } else if (ext === '.csv') {
      changed = syncCsvToState(filePath, dbId, state, fieldMap);
    }

    if (!changed) {
      console.log(`[file-watcher]    No property changes detected, skipping push.`);
      return;
    }

    // 4) Write updated state (mark as own write so we don't loop)
    markOwnWrite(stateFilePath);
    writeFileSync(stateFilePath, JSON.stringify(state, null, 2), 'utf-8');
    console.log(`[file-watcher]    ✅ State updated, pushing to browser…`);

    // 5) Push to browser via Vite's WebSocket
    server.ws.send({
      type: 'custom',
      event: 'dbms:file-changed',
      data: { source, file: `${stem}${ext}`, database: dbId },
    });
  } catch (err) {
    console.error(`[file-watcher] ❌ Error processing ${stem}${ext}:`, err);
  }
}

/** Clean up watchers on server close. */
export function stopFileWatcher(): void {
  for (const w of watchers) {
    try { w.close(); } catch { /* ignore */ }
  }
  watchers.length = 0;
  console.log('[file-watcher] Stopped.');
}
