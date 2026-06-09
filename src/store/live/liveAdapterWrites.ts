/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   liveAdapterWrites.ts                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/10 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * Write-side collaborator of LiveMountAdapter: persistState snapshots →
 * liveStateDiff → outbox queue → debounced publisher drain. Two echo guards
 * keep server-originated store mutations from re-entering the queue:
 * (1) a loadState/reload pages map is remembered by REFERENCE — a persist
 * whose `next.pages` is exactly that map is the reload itself, not an edit;
 * (2) corrective events (page-changed / page-deleted from conflict
 * reconciliation) record one-shot suppressions consumed by the next diff.
 * Schema edits become DDL intents via liveDdlMapper; UI-temp property ids
 * (`prop-*`, never a mapper column name) are filtered from drop/retype since
 * those columns never existed server-side. Unsupported schema intents are
 * surfaced via console.warn — the dbms host has no toast system (its only
 * error surface replaces the whole view), as noted in liveConflict.
 */

import type { ChangeEvent, NotionState } from '../../component/types';
import { diffLiveState, type LiveStateDiff } from './liveStateDiff';
import { LiveWriteQueue, type LiveQueueStorage } from './liveWriteQueue';
import { LiveWritePublisher } from './liveWritePublisher';
import { ddlAddColumnRequest, ddlDropColumnRequest, ddlRetypeRequest } from './liveDdlMapper';
import { parseLiveDatabaseId, parseLivePageId, type LiveSchemaResponse } from './liveTypes';

export interface LiveAdapterWritesDeps {
  getSchema: () => Promise<LiveSchemaResponse>;
  /** Fan out to the host's subscribe() callbacks. */
  emit: (event: ChangeEvent) => void;
  /** Bust the client-side schema cache after any DDL outcome. */
  onSchemaChanged?: () => void;
  /** Test injection; defaults to localStorage inside the queue. */
  storage?: LiveQueueStorage;
}

/** UI-added properties get `prop-<hex>` ids (databaseSlice); mapper property
 *  ids are raw column names — so this safely tags never-created columns. */
function isUiTempPropertyId(propertyId: string): boolean {
  return propertyId.startsWith('prop-');
}

export class LiveAdapterWrites {
  private readonly table: string;
  private readonly queue: LiveWriteQueue;
  private readonly publisher: LiveWritePublisher;
  private readonly emitOut: (event: ChangeEvent) => void;
  private lastLoadedPages: NotionState['pages'] | null = null;
  /** table:pk:column → {raw JSON, expiry}; consumed once or expired (~10s). */
  private suppressedCells = new Map<string, { value: string; expiresAt: number }>();
  private suppressedDeletes = new Map<string, number>(); // table:pk → expiry

  private readonly databaseId: string;

  // Explicit field (no TS parameter property): --experimental-strip-types.
  constructor(databaseId: string, deps: LiveAdapterWritesDeps) {
    this.databaseId = databaseId;
    this.emitOut = deps.emit;
    const mount = parseLiveDatabaseId(databaseId) ?? { dbId: '', table: '' };
    this.table = mount.table;
    this.queue = new LiveWriteQueue(databaseId, deps.storage);
    this.publisher = new LiveWritePublisher({
      mount,
      queue: this.queue,
      getSchema: deps.getSchema,
      emit: (event) => this.emitFromServer(event),
      onSchemaChanged: deps.onSchemaChanged,
    });
    if (this.queue.size() > 0) this.publisher.schedule(); // resume a reloaded outbox
  }

  /** Server-originated events (write corrections AND realtime deliveries):
   *  arm the persist echo guards, then fan out — so the host store patch
   *  these cause can never re-enter the outbox as a fresh write. */
  emitFromServer(event: ChangeEvent): void {
    this.recordEcho(event);
    this.emitOut(event);
  }

  /** Outbox depth — the poller pauses while optimistic writes are pending. */
  pendingWrites(): number {
    return this.queue.size();
  }

  /** Remember the loadState result by reference (reload-echo guard). */
  noteLoadedPages(pages: NotionState['pages']): void {
    this.lastLoadedPages = pages;
  }

  /** persistState entry point: diff, enqueue, schedule a debounced drain. */
  persist(next: NotionState, prev?: NotionState): void {
    if (!prev || next.pages === this.lastLoadedPages) return; // reload itself, not an edit
    const diff = diffLiveState(next, prev, this.databaseId);
    let mutated = this.enqueueRowChanges(diff);
    mutated = this.enqueueSchemaChanges(diff) || mutated;
    for (const message of diff.skipped) console.warn(`[live-db] ${message}`);
    if (mutated) this.publisher.schedule();
  }

  stop(): void {
    this.publisher.stop();
  }

  private enqueueRowChanges(diff: LiveStateDiff): boolean {
    let mutated = false;
    const byRow = new Map<string, { table: string; pk: string; data: Record<string, unknown> }>();
    const now = Date.now();
    for (const change of diff.cellChanges) {
      const cellKey = `${change.table}:${change.pk}:${change.column}`;
      const suppressed = this.suppressedCells.get(cellKey);
      if (suppressed && suppressed.expiresAt > now
        && suppressed.value === (JSON.stringify(change.value) ?? 'undefined')) {
        this.suppressedCells.delete(cellKey);
        continue; // server-corrected value echoing back — already server truth
      }
      const rowKey = `${change.table}:${change.pk}`;
      const row = byRow.get(rowKey) ?? { table: change.table, pk: change.pk, data: {} };
      row.data[change.column] = change.value;
      byRow.set(rowKey, row);
    }
    for (const row of byRow.values()) {
      this.queue.enqueueCell(row.table, row.pk, row.data);
      mutated = true;
    }
    for (const insert of diff.inserts) {
      this.queue.enqueue({ kind: 'insert', table: insert.table, values: insert.values, tempId: insert.tempId });
      mutated = true;
    }
    for (const removal of diff.deletes) {
      const deleteKey = `${removal.table}:${removal.pk}`;
      if ((this.suppressedDeletes.get(deleteKey) ?? 0) > now) {
        this.suppressedDeletes.delete(deleteKey);
        continue; // server-side deletion echoing back
      }
      this.queue.enqueue({ kind: 'delete', table: removal.table, pk: removal.pk });
      mutated = true;
    }
    return mutated;
  }

  private enqueueSchemaChanges(diff: LiveStateDiff): boolean {
    let mutated = false;
    for (const property of diff.schemaAdds) {
      const { request, skipped } = ddlAddColumnRequest(this.table, property);
      if (request) { this.queue.enqueue({ kind: 'ddl', table: this.table, request }); mutated = true; }
      if (skipped) console.warn(`[live-db] schema change skipped: ${skipped}`);
    }
    for (const propertyId of diff.schemaRemoves) {
      if (isUiTempPropertyId(propertyId)) continue; // column was never created server-side
      this.queue.enqueue({ kind: 'ddl', table: this.table, request: ddlDropColumnRequest(this.table, propertyId) });
      mutated = true;
    }
    for (const retype of diff.schemaRetypes) {
      if (isUiTempPropertyId(retype.propertyId)) continue; // pending add already carries a type
      const { request, skipped } = ddlRetypeRequest(this.table, retype.property);
      if (request) { this.queue.enqueue({ kind: 'ddl', table: this.table, request }); mutated = true; }
      if (skipped) console.warn(`[live-db] schema change skipped: ${skipped}`);
    }
    return mutated;
  }

  /** One-shot suppressions so corrective events never echo into the queue. */
  private recordEcho(event: ChangeEvent): void {
    const expiresAt = Date.now() + 10_000; // generous: persist debounce is ~150ms+500ms
    for (const [key, entry] of this.suppressedCells) {
      if (entry.expiresAt <= Date.now()) this.suppressedCells.delete(key); // lazy purge
    }
    if (event.type === 'page-changed' && event.databaseId === this.databaseId) {
      const ref = parseLivePageId(event.pageId);
      if (!ref) return;
      for (const [column, value] of Object.entries(event.changes)) {
        this.suppressedCells.set(
          `${ref.table}:${ref.pk}:${column}`,
          { value: JSON.stringify(value) ?? 'undefined', expiresAt },
        );
      }
    } else if (event.type === 'page-deleted' && event.databaseId === this.databaseId) {
      const ref = parseLivePageId(event.pageId);
      if (ref) this.suppressedDeletes.set(`${ref.table}:${ref.pk}`, expiresAt);
    }
  }
}
