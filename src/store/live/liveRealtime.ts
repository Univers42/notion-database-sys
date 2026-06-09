/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   liveRealtime.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/10 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * Per-adapter realtime orchestrator. Subscribes to `table:<dbId>:<table>`
 * through Kong (`/realtime/v1/ws`) and turns gateway events into the host's
 * ChangeEvents: `row_changed` with a usable pk → targeted op=get → precise
 * page-inserted / page-changed / page-deleted; without a pk → coalesced
 * (500ms) first-page refresh that emits `state-replaced` only on a real hash
 * change; `schema_changed` → schema-cache bust + `state-replaced`. Echoes of
 * our own writes are dropped via the (dbId, table, pk) registry — the WS
 * delivery frame does not carry the publish idempotency key. Token order:
 * VITE_BAAS_REALTIME_TOKEN, else the app JWT mirrored from the playground
 * user store global (same decoupling rule as liveMountClient: never import
 * app feature modules). No token / repeat AUTH_FAILED / socket down → the
 * 15s poll fallback runs instead; on reconnect one refresh catches missed
 * events. All emissions MUST go through the adapter's echo-guarded emit so
 * server-originated store patches never re-enter the write queue.
 */

import type { ChangeEvent, Page } from '../../component/types';
import { isRecentLiveOwnWrite } from './liveEchoRegistry';
import { LivePoll } from './livePoll';
import {
  LiveRealtimeSocket,
  type LiveRealtimeEventFrame,
  type LiveSocketOptions,
} from './liveRealtimeSocket';
import { parseLiveDatabaseId } from './liveTypes';

const env = (import.meta.env ?? {}) as Record<string, string | undefined>;
const RETRY_GATED_REFRESH_MS = 2_000;

export interface LiveRealtimeDeps {
  /** `baas:<dbId>:<table>` — the adapter's database id. */
  databaseId: string;
  /** Targeted op=get for one pk (the adapter's getPage, pre-bound). */
  getPage: (pk: string) => Promise<Page | null>;
  /** First page of raw rows, same limit loadState uses. */
  fetchFirstPage: () => Promise<Record<string, unknown>[]>;
  /** Outbox depth (pauses refreshes while optimistic writes are pending). */
  pendingWrites: () => number;
  /** MUST be the adapter's echo-guarded emit (LiveAdapterWrites.emitFromServer). */
  emit: (event: ChangeEvent) => void;
  /** Bust the client schema cache (before the state-replaced reload). */
  onSchemaChanged: () => void;
  /** Overrides for tests; `undefined` = resolve from env/globals. */
  token?: string | null;
  socketUrl?: string | null;
  createSocket?: (opts: LiveSocketOptions) => Pick<LiveRealtimeSocket, 'start' | 'stop'>;
  pollIntervalMs?: number;
  coalesceMs?: number;
}

/** (1) demo/dev token from env; (2) the app JWT via the playground user
 *  store global (mirrors getActivePageJwt without importing app modules) —
 *  it may not share the realtime JWT secret: AUTH_FAILED then degrades to
 *  polling, by design; (3) none → poll-only. */
export function resolveLiveRealtimeToken(): string | null {
  const envToken = (env.VITE_BAAS_REALTIME_TOKEN ?? '').trim();
  if (envToken) return envToken;
  try {
    const store = (globalThis as Record<string, unknown>).__playgroundUserStore as
      | { getState: () => { activePageJwt?: () => string | null; activeJwt?: () => string | null } }
      | undefined;
    const state = store?.getState();
    return state?.activePageJwt?.() || state?.activeJwt?.() || null;
  } catch {
    return null;
  }
}

/** Kong WS endpoint derived from VITE_BAAS_URL (http→ws, https→wss). */
export function liveRealtimeUrl(): string | null {
  const base = (env.VITE_BAAS_URL ?? '').trim().replace(/\/$/, '');
  if (!base) return null;
  return `${base.replace(/^http/, 'ws')}/realtime/v1/ws`;
}

export class LiveRealtime {
  private readonly deps: LiveRealtimeDeps;
  private readonly poll: LivePoll;
  private socket: Pick<LiveRealtimeSocket, 'start' | 'stop'> | null = null;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private wasUp = false;
  private disposed = false;

  constructor(deps: LiveRealtimeDeps) {
    this.deps = deps;
    this.poll = new LivePoll({
      fetchRows: deps.fetchFirstPage,
      pendingWrites: deps.pendingWrites,
      onChanged: () => deps.emit({ type: 'state-replaced' }),
      intervalMs: deps.pollIntervalMs,
    });
  }

  /** Forwarded from loadState so "changed" means "diverged from the host". */
  noteBaseline(rows: Record<string, unknown>[], pkColumns?: string[]): void {
    this.poll.noteBaseline(rows, pkColumns);
  }

  start(): void {
    if (this.disposed || this.socket) return;
    const token = this.deps.token !== undefined ? this.deps.token : resolveLiveRealtimeToken();
    const url = this.deps.socketUrl !== undefined ? this.deps.socketUrl : liveRealtimeUrl();
    this.poll.start(); // covers no-WS mode AND the window until SUBSCRIBED
    if (!token || !url) return; // poll-only: no credential to offer the gateway
    const ref = parseLiveDatabaseId(this.deps.databaseId);
    if (!ref) return;
    const make = this.deps.createSocket ?? ((opts: LiveSocketOptions) => new LiveRealtimeSocket(opts));
    this.socket = make({
      url,
      token,
      topic: `table:${ref.dbId}:${ref.table}`,
      onEvent: (frame) => this.handleEvent(frame),
      onUp: () => this.handleUp(),
      onDown: () => { if (!this.disposed) this.poll.start(); },
      onPermanentFailure: () => { if (!this.disposed) this.poll.start(); },
    });
    this.socket.start();
  }

  stop(): void {
    this.disposed = true;
    if (this.refreshTimer) { clearTimeout(this.refreshTimer); this.refreshTimer = null; }
    this.socket?.stop();
    this.socket = null;
    this.poll.stop();
  }

  private handleUp(): void {
    this.poll.stop();
    if (this.wasUp) this.scheduleRefresh(); // catch events missed while down
    this.wasUp = true;
  }

  private handleEvent(frame: LiveRealtimeEventFrame): void {
    if (this.disposed) return;
    if (frame.event_type === 'schema_changed') {
      this.deps.onSchemaChanged(); // bust BEFORE the host reloads
      this.deps.emit({ type: 'state-replaced' });
      return;
    }
    if (frame.event_type !== 'row_changed') return;
    const payload = (frame.payload ?? {}) as { op?: string; pk?: unknown };
    const pk = payload.pk;
    if (typeof pk !== 'string' && typeof pk !== 'number') {
      this.scheduleRefresh(); // filter-shaped write: no row to target
      return;
    }
    const ref = parseLiveDatabaseId(this.deps.databaseId);
    if (ref && isRecentLiveOwnWrite(ref.dbId, ref.table, String(pk))) return; // our own echo
    void this.applyRowEvent(String(pk), payload.op ?? '');
  }

  /** Targeted convergence for one row (op=get is the authority). */
  private async applyRowEvent(pk: string, op: string): Promise<void> {
    const databaseId = this.deps.databaseId;
    const pageId = `${databaseId}:${pk}`;
    if (op === 'delete') {
      this.deps.emit({ type: 'page-deleted', pageId, databaseId });
      return;
    }
    try {
      const page = await this.deps.getPage(pk);
      if (!page) this.deps.emit({ type: 'page-deleted', pageId, databaseId });
      else if (op === 'insert') this.deps.emit({ type: 'page-inserted', page });
      else this.deps.emit({ type: 'page-changed', pageId: page.id, changes: page.properties, databaseId });
    } catch {
      if (!this.disposed) this.scheduleRefresh(); // fall back to the page diff
    }
  }

  /** Coalesced refresh; re-armed when gated by pending optimistic writes. */
  private scheduleRefresh(delayMs = this.deps.coalesceMs ?? 500): void {
    if (this.disposed || this.refreshTimer) return;
    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = null;
      void this.poll.pollNow({ ignoreVisibility: true }).then((ran) => {
        if (!ran && !this.disposed) this.scheduleRefresh(RETRY_GATED_REFRESH_MS);
      });
    }, delayMs);
  }
}
