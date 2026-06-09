/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   liveWriteQueue.ts                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/10 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * Coalescing outbox for live-mount writes. ONE ordered list per database:
 * cell changes coalesce by `${table}:${pk}` (later values for the same column
 * replace earlier pending ones, keeping the entry's queue position); inserts,
 * deletes and DDL stay FIFO. Entries persist to localStorage (pattern:
 * src/shared/sync/outboxLedger.ts) under ONE shared key for all mounts, each
 * instance owning only its database's slice — so a reload mid-outage loses
 * nothing. Entries are removed only after the publisher confirms (ok), the
 * server says the row is gone, or a conflict was reconciled — mirroring the
 * pageOutbox ok|gone|failed result discipline.
 */

export const LIVE_WRITE_OUTBOX_KEY = 'osionos.liveWriteOutbox.v1';

/** Raw notion values keyed by column; the publisher encodes column-aware. */
export type LiveWriteEntry =
  | { id: string; kind: 'cell'; databaseId: string; table: string; pk: string; data: Record<string, unknown> }
  | { id: string; kind: 'insert'; databaseId: string; table: string; values: Record<string, unknown>; tempId: string }
  | { id: string; kind: 'delete'; databaseId: string; table: string; pk: string }
  | { id: string; kind: 'ddl'; databaseId: string; table: string; request: Record<string, unknown> };

/** Injectable storage so node tests stub localStorage. */
export interface LiveQueueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Omit that distributes over a union (plain Omit collapses shared keys). */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** What callers enqueue: id + databaseId are stamped by the queue. */
export type LiveWriteIntent =
  DistributiveOmit<Extract<LiveWriteEntry, { kind: 'insert' | 'delete' | 'ddl' }>, 'id' | 'databaseId'>;

function entryId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `lw-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

// NOTE: explicit fields (no TS parameter properties) — node:test runs these
// modules with --experimental-strip-types, which forbids constructor sugar.
export class LiveWriteQueue {
  private entries: LiveWriteEntry[] = [];

  private readonly databaseId: string;

  private readonly storage: LiveQueueStorage | undefined;

  private readonly storageKey: string;

  constructor(databaseId: string, storage?: LiveQueueStorage, storageKey = LIVE_WRITE_OUTBOX_KEY) {
    this.databaseId = databaseId;
    this.storage = storage ?? (globalThis as { localStorage?: LiveQueueStorage }).localStorage;
    this.storageKey = storageKey;
    this.entries = this.othersAndMine()[1];
  }

  /** Coalesce a row's cell edits: merge columns into the pending entry for
   *  `${table}:${pk}` (keeping its position), else append a new one. */
  enqueueCell(table: string, pk: string, data: Record<string, unknown>): void {
    const existing = this.entries.find(
      (entry) => entry.kind === 'cell' && entry.table === table && entry.pk === pk,
    ) as Extract<LiveWriteEntry, { kind: 'cell' }> | undefined;
    if (existing) {
      existing.data = { ...existing.data, ...data };
    } else {
      this.entries.push({ id: entryId(), kind: 'cell', databaseId: this.databaseId, table, pk, data });
    }
    this.save();
  }

  /** FIFO append for insert / delete / ddl intents. */
  enqueue(entry: LiveWriteIntent): void {
    this.entries.push({ ...entry, id: entryId(), databaseId: this.databaseId });
    this.save();
  }

  /** Pending entries in drain order (queue order; cells keep their slot). */
  pending(): LiveWriteEntry[] {
    return [...this.entries];
  }

  /** Drop confirmed / reconciled entries and persist the remainder. */
  remove(ids: Iterable<string>): void {
    const drop = new Set(ids);
    this.entries = this.entries.filter((entry) => !drop.has(entry.id));
    this.save();
  }

  size(): number {
    return this.entries.length;
  }

  /** [other mounts' persisted entries, this database's] from the shared key. */
  private othersAndMine(): [LiveWriteEntry[], LiveWriteEntry[]] {
    let all: LiveWriteEntry[] = [];
    try {
      const raw = this.storage?.getItem(this.storageKey);
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed)) all = parsed as LiveWriteEntry[];
    } catch {
      all = []; // unreadable ledger → start clean (entries re-derive from edits)
    }
    return [
      all.filter((entry) => entry?.databaseId !== this.databaseId),
      all.filter((entry) => entry?.databaseId === this.databaseId && typeof entry.id === 'string'),
    ];
  }

  private save(): void {
    try {
      const [others] = this.othersAndMine();
      this.storage?.setItem(this.storageKey, JSON.stringify([...others, ...this.entries]));
    } catch {
      // quota / private mode — the queue then lives only in memory this session
    }
  }
}
