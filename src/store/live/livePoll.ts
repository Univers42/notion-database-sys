/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   livePoll.ts                                         :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/10 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * Poll fallback for live mounts: every 15s (while the realtime socket is
 * down, the tab visible, and the outbox empty) refetch the first page and
 * hash-compare against what the host last loaded — `state-replaced` only on
 * a real change. The baseline is seeded by loadState (noteBaseline) so the
 * comparison means "did the server diverge from what the host shows", and a
 * pending outbox pauses polling entirely: a refetch mid-edit would clobber
 * the optimistic UI with pre-write server rows. The realtime orchestrator
 * reuses `pollNow` for its coalesced no-pk refreshes (ignoring visibility —
 * an event is change evidence, not a periodic guess).
 */

export const LIVE_POLL_INTERVAL_MS = 15_000;

export interface LivePollDeps {
  /** First page of rows, same limit the adapter loads (raw wire rows). */
  fetchRows: () => Promise<Record<string, unknown>[]>;
  /** Outbox depth; >0 pauses polling (optimistic state must win). */
  pendingWrites: () => number;
  /** The first page diverged from the baseline → host should reload. */
  onChanged: () => void;
  /** A PERMANENT fetch denial (403 not-accessible / 401) — the poll has
   *  already stopped; the caller tears realtime down so it never restarts. */
  onPermanentError?: (error: unknown) => void;
  intervalMs?: number;
}

/** 403 (no workspace access) / 401 (no session) are permanent for this table —
 *  retrying just hammers the bridge. Matches status or the bridge's message. */
export function isPermanentDenial(error: unknown): boolean {
  const e = error as { status?: number; statusCode?: number; message?: unknown } | null;
  const status = e?.status ?? e?.statusCode;
  if (status === 403 || status === 401) return true;
  return typeof e?.message === 'string' && /accessible workspace|forbidden|unauthor|HTTP 40[13]/i.test(e.message);
}

/** Cheap order-insensitive fingerprint: rows sorted by their pk string,
 *  then djb2 over the concatenated row JSON (length-prefixed). Mongo wire
 *  alias: rows surface `_id` as `id` (normalize_doc) — without the fallback
 *  every pk is '' and natural-order drift flips the hash (false reloads). */
export function hashLiveRows(rows: Record<string, unknown>[], pkColumns: string[]): string {
  const keyed = rows.map((row) => ({
    pk: pkColumns
      .map((column) => String(row[column] ?? (column === '_id' ? row.id : undefined) ?? ''))
      .join(':'),
    json: JSON.stringify(row),
  }));
  keyed.sort((a, b) => (a.pk < b.pk ? -1 : a.pk > b.pk ? 1 : 0));
  let hash = 5381;
  const text = keyed.map((entry) => entry.json).join('\n');
  for (let index = 0; index < text.length; index += 1) {
    hash = (Math.imul(hash, 33) ^ text.charCodeAt(index)) >>> 0;
  }
  return `${rows.length}:${hash.toString(36)}`;
}

function isDocumentVisible(): boolean {
  const doc = (globalThis as { document?: { visibilityState?: string } }).document;
  return !doc || doc.visibilityState !== 'hidden';
}

export class LivePoll {
  private readonly deps: LivePollDeps;
  private baseline: string | null = null;
  private pkColumns: string[] = ['id'];
  private timer: ReturnType<typeof setInterval> | null = null;
  private inFlight = false;

  constructor(deps: LivePollDeps) {
    this.deps = deps;
  }

  /** Seed/refresh the comparison point from a loadState result. */
  noteBaseline(rows: Record<string, unknown>[], pkColumns?: string[]): void {
    if (pkColumns && pkColumns.length > 0) this.pkColumns = pkColumns;
    this.baseline = hashLiveRows(rows, this.pkColumns);
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(
      () => { void this.pollNow(); },
      this.deps.intervalMs ?? LIVE_POLL_INTERVAL_MS,
    );
  }

  stop(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  /** One compare pass. `false` = gated (hidden tab / pending writes / already
   *  in flight) so callers may retry; a failed fetch still counts as ran. */
  async pollNow(options: { ignoreVisibility?: boolean } = {}): Promise<boolean> {
    if (this.inFlight) return false;
    if (!options.ignoreVisibility && !isDocumentVisible()) return false;
    if (this.deps.pendingWrites() > 0) return false;
    this.inFlight = true;
    try {
      const rows = await this.deps.fetchRows();
      const hash = hashLiveRows(rows, this.pkColumns);
      const changed = this.baseline !== null && hash !== this.baseline;
      this.baseline = hash;
      if (changed) this.deps.onChanged();
    } catch (error) {
      if (isPermanentDenial(error)) {
        this.stop(); // no access — stop the 15s loop instead of hammering the bridge
        this.deps.onPermanentError?.(error);
      } // else transient — next pass converges
    } finally {
      this.inFlight = false;
    }
    return true;
  }
}
