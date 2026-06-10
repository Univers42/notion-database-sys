/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   liveCellWrites.ts                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/10 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * Cell-update half of the live write publisher. Transactional engines
 * (postgresql/mysql) get ONE atomic `/txn` batch per ≤50 updates — a multi-op
 * 409 falls back to sequential singles to isolate the conflicting row, since
 * the txn response carries no per-op blame and the WHOLE batch rolled back.
 * mongodb (transactions: false) is always sequential. Outcome discipline:
 * 2xx + affected≥1 → ok (entry removed); affected 0 → gone; 409 → conflict;
 * other 4xx → rejected — gone/conflict/rejected all reconcile through the
 * authoritative refetch (liveConflict) so the UI snaps to server truth; 5xx /
 * network → transient: entries KEPT, `true` returned so the caller backs off.
 */

import { mapLiveTable } from './liveSchemaMapper';
import { encodeLiveValue } from './liveValueCodec';
import { resolveLiveConflict } from './liveConflict';
import { noteLiveOwnWrite } from './liveEchoRegistry';
import { livePkFilter, postLiveTxn, writeLiveTableOp } from './liveWriteClient';
import type { ChangeEvent } from '../../component/types';
import { LIVE_MAX_ATTEMPTS, type LiveWriteEntry, type LiveWriteQueue } from './liveWriteQueue';
import type { LiveRowsResponse, LiveSchemaResponse, LiveTableSchema } from './liveTypes';

const TXN_MAX_OPS = 50;
const TXN_ENGINES = new Set(['postgresql', 'mysql']);

export type LiveCellEntry = Extract<LiveWriteEntry, { kind: 'cell' }>;

export interface LiveCellWriteContext {
  dbId: string;
  queue: LiveWriteQueue;
  emit: (event: ChangeEvent) => void;
}

interface ReadyCell { entry: LiveCellEntry; table: LiveTableSchema; op: Record<string, unknown> }

/** Raw cell values → column-aware encoded write data (read-only skipped;
 *  owner_id/tenant_id can never appear — the mapper excludes them). */
export function encodeLiveCellData(
  dbId: string,
  table: LiveTableSchema,
  data: Record<string, unknown>,
): Record<string, unknown> {
  const { properties } = mapLiveTable(table, dbId);
  const out: Record<string, unknown> = {};
  for (const [column, raw] of Object.entries(data)) {
    const property = properties[column];
    if (!property) continue;
    const encoded = encodeLiveValue(raw, property, table.columns.find((candidate) => candidate.name === column));
    if (encoded !== undefined) out[column] = encoded;
  }
  return out;
}

/** Refetch server truth for one row and snap the UI back (gone/conflict). */
export async function reconcileLiveCell(
  context: LiveCellWriteContext,
  entry: LiveCellEntry,
  table: LiveTableSchema,
  reason: string,
): Promise<void> {
  await resolveLiveConflict({ dbId: context.dbId, table: entry.table }, table, entry.pk, reason, context.emit);
}

/** Transient outcome: keep (true → backoff) unless the entry burned its
 *  attempts — then drop it + reload so it can't block the queue forever. */
function keepOrGiveUp(context: LiveCellWriteContext, entryId: string): boolean {
  if (!context.queue.noteFailure(entryId, LIVE_MAX_ATTEMPTS)) return true;
  console.warn(`[live-db] cell write dropped after ${LIVE_MAX_ATTEMPTS} failed attempts — reloading server truth`);
  context.emit({ type: 'state-replaced' });
  return false;
}

async function sendCellSingle(context: LiveCellWriteContext, item: ReadyCell): Promise<boolean> {
  // `resource` is a /txn-only field (the table rides in the URL here) and the
  // single-op DTO is forbidNonWhitelisted: sending it is a guaranteed 400.
  const { resource: _txnOnly, ...body } = item.op;
  const result = await writeLiveTableOp(context.dbId, item.entry.table, body);
  if (result.status === 0 || result.status >= 500) return keepOrGiveUp(context, item.entry.id);
  context.queue.remove([item.entry.id]);
  if (result.status >= 200 && result.status < 300) {
    const affected = (result.body as LiveRowsResponse | null)?.affected_rows ?? 1;
    if (affected === 0) await reconcileLiveCell(context, item.entry, item.table, 'row vanished or not owned');
    return false;
  }
  const reason = result.status === 409 ? 'server constraint' : `rejected (HTTP ${result.status})`;
  await reconcileLiveCell(context, item.entry, item.table, reason);
  return false;
}

/** Drain all pending cell entries; returns true on transient failure. */
export async function drainLiveCells(
  context: LiveCellWriteContext,
  cells: LiveCellEntry[],
  schema: LiveSchemaResponse,
  tables: Map<string, LiveTableSchema>,
): Promise<boolean> {
  const ready: ReadyCell[] = [];
  for (const entry of cells) {
    const table = tables.get(entry.table);
    const data = table ? encodeLiveCellData(context.dbId, table, entry.data) : {};
    if (!table || Object.keys(data).length === 0) { context.queue.remove([entry.id]); continue; }
    noteLiveOwnWrite(context.dbId, entry.table, entry.pk); // realtime echo guard
    ready.push({ entry, table, op: {
      op: 'update', resource: entry.table, filter: livePkFilter(table, entry.pk), data, idempotencyKey: entry.id,
    } });
  }
  if (!TXN_ENGINES.has(schema.engine)) {
    for (const item of ready) {
      if (await sendCellSingle(context, item)) return true;
    }
    return false;
  }
  for (let start = 0; start < ready.length; start += TXN_MAX_OPS) {
    const chunk = ready.slice(start, start + TXN_MAX_OPS);
    const result = await postLiveTxn(context.dbId, chunk.map((item) => item.op));
    if (result.status >= 200 && result.status < 300) {
      const rowCounts = (result.body as { results?: { rowCount?: number }[] } | null)?.results ?? [];
      for (const [index, item] of chunk.entries()) {
        context.queue.remove([item.entry.id]);
        if ((rowCounts[index]?.rowCount ?? 1) === 0) {
          await reconcileLiveCell(context, item.entry, item.table, 'row vanished or not owned');
        }
      }
    } else if (result.status === 409 && chunk.length > 1) {
      for (const item of chunk) {
        if (await sendCellSingle(context, item)) return true; // isolate the conflicting row
      }
    } else if (result.status === 0 || result.status >= 500) {
      // Transient — note one failure per chunk entry; if any survive, back
      // off with them; if the whole chunk burned out, move on (dropped).
      let surviving = false;
      for (const item of chunk) {
        if (keepOrGiveUp(context, item.entry.id)) surviving = true;
      }
      if (surviving) return true;
    } else {
      const reason = result.status === 409 ? 'server constraint' : `rejected (HTTP ${result.status})`;
      for (const item of chunk) {
        context.queue.remove([item.entry.id]);
        await reconcileLiveCell(context, item.entry, item.table, reason);
      }
    }
  }
  return false;
}
