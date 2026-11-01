import type { LiveTableSchema } from './liveTypes';

/**
 * Identical reads still on the wire share one request: a dashboard of six widgets on
 * one table sent 25 list calls for `orders` when it opened (#264). Only while in
 * flight, so nothing here can serve a stale row.
 */
export function shareInFlight<T>(reads: Map<string, Promise<T>>, key: string, start: () => Promise<T>): Promise<T> {
  const pending = reads.get(key);
  if (pending) return pending;
  const read = start().finally(() => reads.delete(key));
  reads.set(key, read);
  return read;
}

/** The distinct keys `primaryRows` point at in `tableName` that `loaded` does not hold. */
export function missingReferenceKeys(
  primary: LiveTableSchema,
  tableName: string,
  keyColumn: string,
  loaded: readonly Record<string, unknown>[],
  primaryRows: readonly Record<string, unknown>[],
): unknown[] {
  const known = new Set(loaded.map((row) => String(row[keyColumn])));
  const missing = new Map<string, unknown>();
  for (const column of primary.columns) {
    if (column.references?.table !== tableName) continue;
    for (const row of primaryRows) {
      const value = row[column.name];
      if (value === null || value === undefined || known.has(String(value))) continue;
      missing.set(String(value), value);
    }
  }
  return [...missing.values()];
}

export type RememberedReads<T> = Map<string, { value: Promise<T>; expiresAt: number }>;

/**
 * One read per key per `ttlMs`, failures not kept.
 * Caveat: a label renamed in the database shows its old text for up to `ttlMs`.
 */
export function rememberRead<T>(
  reads: RememberedReads<T>,
  key: string,
  ttlMs: number,
  start: () => Promise<T>,
  now: number = Date.now(),
): Promise<T> {
  const held = reads.get(key);
  if (held && held.expiresAt > now) return held.value;
  const value = start();
  reads.set(key, { value, expiresAt: now + ttlMs });
  value.catch(() => reads.delete(key));
  return value;
}

const SCAN_PAGES_AT_ONCE = 6;
const SCAN_MAX_PAGES = 20;

type Row = Record<string, unknown>;

/** `read`'s answer if it arrives within `budgetMs`, else null; the read carries on. */
export async function settledWithin<T>(read: Promise<T>, budgetMs: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const budget = new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), budgetMs); });
  const answer = await Promise.race([read, budget]);
  clearTimeout(timer);
  return answer;
}

/**
 * Every row of a table past `firstPageSize`, read in pages with no filter at all.
 * Caveat: stops at SCAN_MAX_PAGES pages, so a referenced table above about 10,000 rows
 * keeps showing keys for the rows past that. Offset pages taken while rows are being
 * inserted can skip one; labels are display, and the next load corrects it.
 */
export async function scanRowsAfterFirstPage(
  firstPageSize: number,
  readPage: (offset: number) => Promise<Row[]>,
): Promise<Row[]> {
  const rows: Row[] = [];
  for (let page = 1; page < SCAN_MAX_PAGES; page += SCAN_PAGES_AT_ONCE) {
    const offsets = Array.from({ length: Math.min(SCAN_PAGES_AT_ONCE, SCAN_MAX_PAGES - page) },
      (_, index) => (page + index) * firstPageSize);
    const pages = await Promise.all(offsets.map(readPage));
    for (const found of pages) rows.push(...found);
    if (pages.some((found) => found.length < firstPageSize)) break;
  }
  return rows;
}

/**
 * The rows for `ids`: by chunks when the deployment allows it, else picked out of a scan
 * of the table. grobase's WAF answers 403 to every `$` operator in a filter, `$in`
 * included. Never throws: a label is display, and must not cost the rows already loaded.
 */
export async function readRowsByKeys(
  ids: readonly unknown[],
  keyColumn: string,
  chunkSize: number,
  readChunk: (chunk: unknown[]) => Promise<Row[]>,
  scanTable: () => Promise<Row[]>,
): Promise<Row[]> {
  if (ids.length === 0) return [];
  try {
    const rows: Row[] = [];
    for (let start = 0; start < ids.length; start += chunkSize) {
      rows.push(...await readChunk(ids.slice(start, start + chunkSize)));
    }
    return rows;
  } catch {
    const wanted = new Set(ids.map(String));
    return (await scanTable().catch(() => [])).filter((row) => wanted.has(String(row[keyColumn])));
  }
}
