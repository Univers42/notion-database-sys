/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   fileWatcher.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/03 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/05 03:46:49 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { ViteDevServer } from 'vite';
import { watch, readFileSync, existsSync, type FSWatcher } from 'node:fs';
import { join, basename, extname } from 'node:path';
import type { DbSourceType, Changeset, NotionState } from './fileWatcher.types';
import { SOURCE_DIR, FILE_TO_DB, STATE_FILE, FIELD_MAP_FILE } from './fileWatcher.constants';
import { markOwnWrite, isOwnWrite } from './fileWatcher.guard';
import { syncJsonToState, syncCsvToState } from './fileWatcher.sync';
import { atomicWriteSync } from './atomicWrite';

// Re-export public API so consumers keep the same import path
export { markOwnWrite } from './fileWatcher.guard';

const watchers: FSWatcher[] = [];

/** Get the active source from the middleware (injected at init). */
let getActiveSource: () => DbSourceType = () => 'json';

/**
 * Starts inotify-based file watchers for all DBMS source directories.
 *
 * Detects external edits to flat files, reverse-syncs them into
 * `_notion_state.json`, and pushes granular patches via Vite WebSocket.
 */
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
        handleFileChange(server, sourceType as DbSourceType, filePath, stem, ext); // NOSONAR
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

    // 3) Reverse-sync flat → state, collecting changed page properties
    let patches: Changeset = {};
    if (ext === '.json') {
      patches = syncJsonToState(filePath, dbId, state, fieldMap);
    } else if (ext === '.csv') {
      patches = syncCsvToState(filePath, dbId, state, fieldMap);
    }

    if (Object.keys(patches).length === 0) {
      console.log(`[file-watcher]    No property changes detected, skipping push.`);
      return;
    }

    // 4) Write updated state (mark as own write so we don't loop)
    markOwnWrite(stateFilePath);
    atomicWriteSync(stateFilePath, JSON.stringify(state, null, 2));
    const patchCount = Object.values(patches).reduce(
      (n, p) => n + Object.keys(p).length, 0,
    );
    console.log(`[file-watcher]    ✅ State updated (${patchCount} property changes), pushing patches…`);

    // 5) Push granular patches to browser via Vite WebSocket
    //    Browser patches Zustand store directly — no full page reload.
    server.ws.send({
      type: 'custom',
      event: 'dbms:file-changed',
      data: { source, file: `${stem}${ext}`, database: dbId, patches },
    });
  } catch (err) {
    console.error(`[file-watcher] ❌ Error processing ${stem}${ext}:`, err);
  }
}

/** Closes all active file watchers. */
export function stopFileWatcher(): void {
  for (const w of watchers) {
    try { w.close(); } catch { /* ignore */ }
  }
  watchers.length = 0;
  console.log('[file-watcher] Stopped.');
}
