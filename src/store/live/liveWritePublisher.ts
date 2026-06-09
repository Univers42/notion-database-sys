/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   liveWritePublisher.ts                               :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/10 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * Drains the live write queue: cell updates via liveCellWrites (atomic /txn
 * on transactional engines, sequential on mongo), then inserts / deletes /
 * DDL in FIFO order. Inserts stay single `op=insert` calls because every
 * engine echoes the inserted row (PG RETURNING / MySQL last_insert_id echo /
 * Mongo _id echo) — the echoed pk becomes the real page id with no reload
 * guess; only a pk-less echo falls back to `state-replaced`. 5xx/network →
 * the entry is KEPT, the drain stops, and retries back off exponentially
 * 2s→60s (usePageSync semantics: never hammer a struggling server). Hard 4xx
 * rejections drop the entry and snap the UI back to server truth. Per-entry
 * uuid rides as the op idempotencyKey. After any DDL outcome the client
 * schema cache is busted (the backend busts its own on success).
 */

import type { ChangeEvent } from '../../component/types';
import { noteLiveOwnWrite } from './liveEchoRegistry';
import { mapLiveTable } from './liveSchemaMapper';
import { buildLiveDatabase, buildLivePage } from './liveStateBuilder';
import { drainLiveCells, encodeLiveCellData, type LiveCellEntry } from './liveCellWrites';
import { livePkFilter, postLiveDdl, writeLiveTableOp } from './liveWriteClient';
import type { LiveWriteEntry, LiveWriteQueue } from './liveWriteQueue';
import type { LiveMountRef, LiveRowsResponse, LiveSchemaResponse, LiveTableSchema } from './liveTypes';

export const LIVE_BACKOFF_MIN_MS = 2_000;
export const LIVE_BACKOFF_MAX_MS = 60_000;
export const LIVE_DRAIN_DEBOUNCE_MS = 500;

export interface LiveWritePublisherDeps {
  mount: LiveMountRef;
  queue: LiveWriteQueue;
  getSchema: () => Promise<LiveSchemaResponse>;
  emit: (event: ChangeEvent) => void;
  /** Bust the client-side schema cache after any DDL outcome. */
  onSchemaChanged?: () => void;
}

// Explicit fields (no TS parameter properties): --experimental-strip-types.
export class LiveWritePublisher {
  private draining = false;
  private rerun = false;
  private disposed = false;
  private backoffMs = LIVE_BACKOFF_MIN_MS;
  private timer: ReturnType<typeof setTimeout> | null = null;

  private readonly deps: LiveWritePublisherDeps;

  constructor(deps: LiveWritePublisherDeps) {
    this.deps = deps;
  }

  /** Debounced drain (edits settle ~500ms before publishing). */
  schedule(delayMs = LIVE_DRAIN_DEBOUNCE_MS): void {
    if (this.disposed) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => { this.timer = null; void this.drain(); }, delayMs);
  }

  /** Drain now; serialized — a re-entrant call queues one follow-up pass. */
  async drain(): Promise<void> {
    if (this.disposed) return;
    if (this.draining) { this.rerun = true; return; }
    this.draining = true;
    let failed = false;
    try {
      failed = await this.drainOnce();
    } finally {
      this.draining = false;
      if (failed) {
        this.schedule(this.backoffMs); // back off — never hammer a struggling server
        this.backoffMs = Math.min(this.backoffMs * 2, LIVE_BACKOFF_MAX_MS);
      } else {
        this.backoffMs = LIVE_BACKOFF_MIN_MS;
        if (this.rerun) { this.rerun = false; void this.drain(); }
      }
    }
  }

  /** Test/diagnostic introspection of the next retry delay. */
  get retryDelayMs(): number { return this.backoffMs; }

  stop(): void {
    this.disposed = true;
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
  }

  /** One pass over the queue; true = transient failure (caller backs off). */
  private async drainOnce(): Promise<boolean> {
    if (this.deps.queue.size() === 0) return false;
    const schema = await this.deps.getSchema().catch(() => null);
    if (!schema) return true; // schema unreachable = transient
    const tables = new Map(schema.tables.map((table) => [table.name, table]));
    const entries = this.deps.queue.pending();
    const cells = entries.filter((entry): entry is LiveCellEntry => entry.kind === 'cell');
    const context = { dbId: this.deps.mount.dbId, queue: this.deps.queue, emit: this.deps.emit };
    if (cells.length > 0 && await drainLiveCells(context, cells, schema, tables)) return true;
    for (const entry of entries) {
      if (entry.kind === 'cell') continue;
      const failed = entry.kind === 'ddl'
        ? await this.sendDdl(entry)
        : await this.sendRowOp(entry, tables.get(entry.table));
      if (failed) return true; // keep entry + stop the batch (backoff)
    }
    return false;
  }

  /** insert / delete; returns true on transient failure (entry kept). */
  private async sendRowOp(
    entry: Extract<LiveWriteEntry, { kind: 'insert' | 'delete' }>,
    table: LiveTableSchema | undefined,
  ): Promise<boolean> {
    if (!table) { this.deps.queue.remove([entry.id]); return false; } // stale intent
    if (entry.kind === 'delete') noteLiveOwnWrite(this.deps.mount.dbId, entry.table, entry.pk);
    const body: Record<string, unknown> = entry.kind === 'insert'
      ? { op: 'insert', data: this.insertData(entry, table), idempotencyKey: entry.id }
      : { op: 'delete', filter: livePkFilter(table, entry.pk), idempotencyKey: entry.id };
    const result = await writeLiveTableOp(this.deps.mount.dbId, entry.table, body);
    if (result.status === 0 || result.status >= 500) return true;
    this.deps.queue.remove([entry.id]);
    if (result.status >= 200 && result.status < 300) {
      if (entry.kind === 'insert') this.emitInserted(entry, table, result.body);
      return false; // delete with affected 0 = already gone = target state reached
    }
    console.warn(`[live-db] ${entry.kind} on "${entry.table}" rejected (HTTP ${result.status}) — reloading server truth`);
    this.deps.emit({ type: 'state-replaced' }); // delete-409 (FK) restores the row; insert-409 clears the temp row
    return false;
  }

  /** Inserted-row echo → real page events; reload only when no pk came back. */
  private emitInserted(
    entry: Extract<LiveWriteEntry, { kind: 'insert' }>,
    table: LiveTableSchema,
    body: unknown,
  ): void {
    const ref: LiveMountRef = { dbId: this.deps.mount.dbId, table: entry.table };
    const row = (body as LiveRowsResponse | null)?.rows?.[0];
    const pkColumns = table.primary_key.length > 0 ? table.primary_key : ['id'];
    if (row && pkColumns.every((column) => row[column] !== undefined && row[column] !== null)) {
      // Best-effort realtime echo guard: the event's pk mirrors the row's `id`.
      noteLiveOwnWrite(ref.dbId, entry.table, String(row[pkColumns[0]]));
      this.deps.emit({ type: 'page-deleted', pageId: entry.tempId, databaseId: `baas:${ref.dbId}:${ref.table}` });
      this.deps.emit({ type: 'page-inserted', page: buildLivePage(row, table, buildLiveDatabase(table, ref), ref) });
    } else {
      this.deps.emit({ type: 'state-replaced' });
    }
  }

  private insertData(
    entry: Extract<LiveWriteEntry, { kind: 'insert' }>,
    table: LiveTableSchema,
  ): Record<string, unknown> {
    const data = encodeLiveCellData(this.deps.mount.dbId, table, entry.values);
    delete data._id; // mongo pk cannot be set on insert (server strips it anyway)
    if (Object.keys(data).length === 0) {
      data[mapLiveTable(table, this.deps.mount.dbId).titlePropertyId] = ''; // never send an empty insert
    }
    return data;
  }

  /** One DDL op; success and hard rejection both refresh schema + state. */
  private async sendDdl(entry: Extract<LiveWriteEntry, { kind: 'ddl' }>): Promise<boolean> {
    const result = await postLiveDdl(this.deps.mount.dbId, entry.request);
    if (result.status === 0 || result.status >= 500) return true;
    this.deps.queue.remove([entry.id]);
    if (result.status < 200 || result.status >= 300) {
      const why = result.status === 409
        ? 'existing data is incompatible'
        : result.status === 422 ? 'this engine has no schema DDL' : `HTTP ${result.status}`;
      console.warn(`[live-db] schema change on "${entry.table}" was rejected (${why}) — reverting to the server schema`);
    }
    this.deps.onSchemaChanged?.(); // backend busted its cache on success; bust ours either way
    this.deps.emit({ type: 'state-replaced' });
    return false;
  }
}
