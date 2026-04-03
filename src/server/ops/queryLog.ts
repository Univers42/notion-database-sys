/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   queryLog.ts                                        :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/03 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 13:58:30 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

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

/** Returns recent log entries (newest first). */
export function getQueryLog(limit = 50): QueryLogEntry[] {
  return entries.slice(-limit).reverse();
}

/** Clears all entries from the query log. */
export function clearQueryLog(): void {
  entries.length = 0;
}
