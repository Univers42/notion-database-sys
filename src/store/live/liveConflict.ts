/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   liveConflict.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/10 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * Conflict / gone reconciliation for one row: re-fetch the authoritative row
 * (op=get on the pk) and snap the UI back to server truth via ChangeEvents —
 * `page-changed` with the corrected values when the row still exists,
 * `page-deleted` when it is really gone, `state-replaced` as the last resort
 * when even the refetch fails. The dbms host has NO toast system (its only
 * error surface, dbmsError, replaces the whole view with a retry screen — far
 * too heavy for one rejected cell), so the user-facing message goes through
 * console.warn AND the liveNotice seam (the app surfaces a toast) while the UI
 * silently converges to server truth.
 */

import type { ChangeEvent } from '../../component/types';
import { buildLiveDatabase, buildLivePage } from './liveStateBuilder';
import { livePkFilter, writeLiveTableOp } from './liveWriteClient';
import { emitLiveWriteNotice } from './liveNotice';
import { formatLivePageId, type LiveMountRef, type LiveTableSchema } from './liveTypes';

export interface LiveConflictOutcome {
  /** 'corrected' = server row re-applied; 'deleted' = row gone; 'unknown' = refetch failed. */
  resolution: 'corrected' | 'deleted' | 'unknown';
  message: string;
}

function conflictMessage(table: string, resolution: LiveConflictOutcome['resolution'], reason: string): string {
  if (resolution === 'corrected') {
    return `Your change to "${table}" was rejected (${reason}) — the row was reset to the server's values.`;
  }
  if (resolution === 'deleted') {
    return `Your change to "${table}" could not be saved (${reason}) — the row no longer exists on the server.`;
  }
  return `Your change to "${table}" was rejected (${reason}) and the server state could not be re-read — reloading.`;
}

/** Re-fetch the authoritative row and emit the corrective ChangeEvent. */
export async function resolveLiveConflict(
  mount: LiveMountRef,
  table: LiveTableSchema,
  pk: string,
  reason: string,
  emit: (event: ChangeEvent) => void,
): Promise<LiveConflictOutcome> {
  const databaseId = `baas:${mount.dbId}:${mount.table}`;
  const pageId = formatLivePageId(mount, pk);
  const result = await writeLiveTableOp(mount.dbId, mount.table, {
    op: 'get',
    filter: livePkFilter(table, pk),
    limit: 1,
  });
  let outcome: LiveConflictOutcome;
  if (result.status >= 200 && result.status < 300) {
    const rows = (result.body as { rows?: Record<string, unknown>[] } | null)?.rows ?? [];
    if (rows[0]) {
      const page = buildLivePage(rows[0], table, buildLiveDatabase(table, mount), mount);
      emit({ type: 'page-changed', pageId: page.id, changes: page.properties, databaseId });
      outcome = { resolution: 'corrected', message: conflictMessage(mount.table, 'corrected', reason) };
    } else {
      emit({ type: 'page-deleted', pageId, databaseId });
      outcome = { resolution: 'deleted', message: conflictMessage(mount.table, 'deleted', reason) };
    }
  } else {
    emit({ type: 'state-replaced' });
    outcome = { resolution: 'unknown', message: conflictMessage(mount.table, 'unknown', reason) };
  }
  emitLiveWriteNotice({ table: mount.table, message: outcome.message, resolution: outcome.resolution });
  console.warn(`[live-db] ${outcome.message}`);
  return outcome;
}
