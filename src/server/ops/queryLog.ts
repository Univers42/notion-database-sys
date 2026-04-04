// ─── Query Log — in-memory ring buffer for generated queries ─────────────────
// Stores entries in a JS ring buffer (for the REST API) and forwards each
// event to the native C++ addon via emitQuery().  The addon triggers
// libcpp::core::Observer<string>::notify("query") which drives the
// TermWriter / ILogger formatting pipeline directly to stderr.

import { emitQuery } from '../logger';

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

/** Append a new query to the log (ring buffer) and emit via Observer pipeline. */
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

  // Emit through the native C++ pipeline:
  // N-API ─▶ Observer::notify("query") ─▶ TermWriter/ILogger ─▶ stderr
  emitQuery(source, operation, table, query, affected);
}

/** Return recent log entries (newest first). */
export function getQueryLog(limit = 50): QueryLogEntry[] {
  return entries.slice(-limit).reverse();
}

/** Clear the log. */
export function clearQueryLog(): void {
  entries.length = 0;
}
