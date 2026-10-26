// ─── lastViewMemory — the tab a viewer last opened, per database block ───────
// A block pins its initial view, so a reload or HMR remount snapped back to it
// and lost the tab the user had switched to. Notion reopens the last tab; this
// remembers it per block identity (`<databaseId>:<initialView>`).
// Caveat: per browser only (localStorage) — another device, a private window or
// cleared site data reopens the pinned view. A remembered view that no longer
// exists or now belongs to another database is ignored.

import type { ViewConfig } from '../types/database';

const STORAGE_KEY = 'nds:lastView:v1';
const MAX_ENTRIES = 200;

function readAll(): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(globalThis.localStorage?.getItem(STORAGE_KEY) ?? '{}');
    return parsed && typeof parsed === 'object' ? parsed as Record<string, string> : {};
  } catch {
    return {};
  }
}

export function rememberView(blockKey: string, viewId: string): void {
  const all = readAll();
  if (all[blockKey] === viewId) return;
  delete all[blockKey];
  all[blockKey] = viewId;
  const keys = Object.keys(all);
  for (const stale of keys.slice(0, Math.max(0, keys.length - MAX_ENTRIES))) delete all[stale];
  try { globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(all)); } catch { /* quota / privacy mode */ }
}

/** The remembered view of a block, when it still exists in `databaseId`. */
export function rememberedView(
  views: Record<string, ViewConfig>, blockKey: string, databaseId: string | undefined,
): string | null {
  const id = readAll()[blockKey];
  const view = id ? views[id] : undefined;
  return view && (!databaseId || view.databaseId === databaseId) ? view.id : null;
}
