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
 * Cell-update half of the live write publisher. EVERY engine writes each edited
 * cell as ONE single-op `POST /:dbId/tables/:table` update — the same one-round-
 * trip path inserts/deletes already use. (Postgres/MySQL previously batched
 * through the multi-round-trip `/txn`, whose data-plane pinned-connection step
 * intermittently returned 502 and rolled the batch back, so the client retried
 * then reverted the edit. A single cell edit is one UPDATE — it never needed
 * multi-op atomicity, and per-cell independent saves are the expected Notion-style
 * UX: one bad cell no longer rolls back the others.) Outcome discipline:
 * 2xx + affected≥1 → ok (entry removed); affected 0 → gone; 409 → conflict;
 * other 4xx → rejected — gone/conflict/rejected all reconcile through the
 * authoritative refetch (liveConflict) so the UI snaps to server truth; 5xx /
 * network → transient: kept, then row-scoped reconcile after the attempt cap.
 */

import { mapLiveTable } from './liveSchemaMapper';
import { encodeLiveValue } from './liveValueCodec';
import { resolveLiveConflict } from './liveConflict';
import { noteLiveOwnWrite } from './liveEchoRegistry';
import { livePkFilter, writeLiveTableOp } from './liveWriteClient';
import type { ChangeEvent } from '../../component/types';
import { LIVE_MAX_ATTEMPTS, type LiveWriteEntry, type LiveWriteQueue } from './liveWriteQueue';
import type { LiveRowsResponse, LiveTableSchema } from './liveTypes';

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
 *  attempts — then drop it and reset ONLY its row to server truth (not a
 *  whole-mount `state-replaced`, which would also wipe every other unsaved
 *  edit the user made while one write was stuck retrying). reconcileLiveCell
 *  refetches the single row; it degrades to a full reload only if even that
 *  refetch fails (backend genuinely unreachable). */
async function keepOrGiveUp(context: LiveCellWriteContext, item: ReadyCell): Promise<boolean> {
  if (!context.queue.noteFailure(item.entry.id, LIVE_MAX_ATTEMPTS)) return true;
  console.warn(`[live-db] cell write dropped after ${LIVE_MAX_ATTEMPTS} failed attempts — resetting that row to server truth`);
  await reconcileLiveCell(context, item.entry, item.table, `backend unavailable (${LIVE_MAX_ATTEMPTS} attempts)`);
  return false;
}

async function sendCellSingle(context: LiveCellWriteContext, item: ReadyCell): Promise<boolean> {
  // `resource` is a /txn-only field (the table rides in the URL here) and the
  // single-op DTO is forbidNonWhitelisted: sending it is a guaranteed 400.
  const { resource: _txnOnly, ...body } = item.op;
  const result = await writeLiveTableOp(context.dbId, item.entry.table, body);
  if (result.status === 0 || result.status >= 500) return keepOrGiveUp(context, item);
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
  // Every engine: one single-op UPDATE per cell (sendCellSingle strips the
  // `resource` field and rides the table in the URL). No `/txn` batch — its
  // data-plane pinned-transaction step intermittently 502'd and rolled the
  // whole batch back, which is what reverted the user's edits.
  for (const item of ready) {
    if (await sendCellSingle(context, item)) return true;
  }
  return false;
}
