// ─── Query Log — in-memory ring buffer for generated queries ─────────────────

export interface QueryLogEntry {
  ts: string;
  source: string;
  operation: string;
  table: string;
  query: string;
  affected: number;
}

const MAX_ENTRIES = 200;
const entries: QueryLogEntry[] = [];

/** Append a new query to the log (ring buffer). */
export function logQuery(
  source: string, operation: string,
  table: string, query: string, affected: number,
): void {
  const entry: QueryLogEntry = {
    ts: new Date().toISOString(),
    source, operation, table, query, affected,
  };
  entries.push(entry);
  if (entries.length > MAX_ENTRIES) entries.shift();
  console.log(`[query-log] [${source}] ${operation} ${table} → ${query.slice(0, 120)}`);
}

/** Return recent log entries (newest first). */
export function getQueryLog(limit = 50): QueryLogEntry[] {
  return entries.slice(-limit).reverse();
}

/** Clear the log. */
export function clearQueryLog(): void {
  entries.length = 0;
}
