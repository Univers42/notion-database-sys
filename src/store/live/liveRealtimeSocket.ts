/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   liveRealtimeSocket.ts                               :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/10 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * Minimal WebSocket client for the realtime gateway, built against the wire
 * contract in realtime-core `protocol.rs` / gateway `handlers.rs`:
 * connect → `{"type":"AUTH","token"}` (MUST be first) → `AUTH_OK {conn_id,
 * server_time}` → `{"type":"SUBSCRIBE","sub_id","topic"}` → `SUBSCRIBED
 * {sub_id, seq}` → `EVENT {sub_id, event}` deliveries. Keepalive is the
 * protocol's own `PING`/`PONG {server_time}`; any inbound frame counts as
 * liveness, and a silent socket past the idle timeout is force-closed.
 * Failed auth is `ERROR {code:"AUTH_FAILED"}` followed by a server close —
 * ONE retry is allowed, then the socket gives up permanently (caller falls
 * back to polling; never loop reconnects against a broken secret). Non-auth
 * drops reconnect with 2s→30s exponential backoff, reset on SUBSCRIBED.
 */

export interface LiveRealtimeEventFrame {
  event_id: string;
  topic: string;
  event_type: string;
  sequence: number;
  timestamp: string;
  payload: unknown;
}

/** The subset of the DOM WebSocket the client touches (test-injectable). */
export interface LiveWebSocketLike {
  onopen: (() => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
  send(data: string): void;
  close(code?: number, reason?: string): void;
}
export type LiveWebSocketCtor = new (url: string) => LiveWebSocketLike;

export interface LiveSocketOptions {
  url: string;
  token: string;
  /** Exact-match topic, e.g. `table:<dbId>:<table>`. */
  topic: string;
  onEvent: (event: LiveRealtimeEventFrame) => void;
  /** Subscription is live (SUBSCRIBED ack received). */
  onUp?: () => void;
  /** Connection lost (any close); a reconnect may follow. */
  onDown?: () => void;
  /** Gave up for good (repeat auth failure / no WebSocket support). */
  onPermanentFailure?: (reason: string) => void;
  webSocketCtor?: LiveWebSocketCtor;
  minBackoffMs?: number;
  maxBackoffMs?: number;
  pingIntervalMs?: number;
  idleTimeoutMs?: number;
}

const MAX_AUTH_FAILURES = 2; // first failure → one retry; second → permanent

export class LiveRealtimeSocket {
  private readonly opts: LiveSocketOptions;
  private readonly minBackoffMs: number;
  private readonly maxBackoffMs: number;
  private ws: LiveWebSocketLike | null = null;
  private opened = false;
  private stopped = false;
  private authFailures = 0;
  private backoffMs: number;
  private lastSeen = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;

  constructor(opts: LiveSocketOptions) {
    this.opts = opts;
    this.minBackoffMs = opts.minBackoffMs ?? 2_000;
    this.maxBackoffMs = opts.maxBackoffMs ?? 30_000;
    this.backoffMs = this.minBackoffMs;
  }

  start(): void {
    if (this.stopped || this.ws) return;
    this.connect();
  }

  stop(): void {
    this.stopped = true;
    this.clearTimers();
    const ws = this.ws;
    this.ws = null;
    this.opened = false;
    try {
      ws?.close(1000, 'client stop');
    } catch { /* already closing */ }
  }

  private connect(): void {
    const Ctor = this.opts.webSocketCtor
      ?? (globalThis as { WebSocket?: LiveWebSocketCtor }).WebSocket;
    if (!Ctor) {
      this.stopped = true;
      this.opts.onPermanentFailure?.('no WebSocket support');
      return;
    }
    let ws: LiveWebSocketLike;
    try {
      ws = new Ctor(this.opts.url);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.ws = ws;
    this.lastSeen = Date.now();
    ws.onopen = () => {
      this.opened = true;
      this.lastSeen = Date.now();
      this.send({ type: 'AUTH', token: this.opts.token }); // MUST be the first frame
    };
    ws.onmessage = (event) => this.handleFrame(event.data);
    ws.onerror = () => { /* the close event carries the consequence */ };
    ws.onclose = () => this.handleClose(ws);
    this.pingTimer = setInterval(() => this.heartbeat(), this.opts.pingIntervalMs ?? 25_000);
  }

  private handleFrame(data: unknown): void {
    this.lastSeen = Date.now();
    let frame: { type?: string; code?: string; event?: LiveRealtimeEventFrame };
    try {
      frame = JSON.parse(String(data)) as typeof frame;
    } catch {
      return; // not a protocol frame
    }
    if (frame.type === 'AUTH_OK') {
      this.send({ type: 'SUBSCRIBE', sub_id: 'live-mount', topic: this.opts.topic });
    } else if (frame.type === 'SUBSCRIBED') {
      this.authFailures = 0;
      this.backoffMs = this.minBackoffMs;
      this.opts.onUp?.();
    } else if (frame.type === 'EVENT' && frame.event) {
      this.opts.onEvent(frame.event);
    } else if (frame.type === 'ERROR' && frame.code === 'AUTH_FAILED') {
      this.authFailures += 1; // the server closes right after this frame
    }
    // PONG / UNSUBSCRIBED: lastSeen above is all they feed
  }

  private handleClose(ws: LiveWebSocketLike): void {
    if (this.ws !== ws) return; // a socket we already replaced/discarded
    this.ws = null;
    this.opened = false;
    if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = null; }
    if (this.stopped) return;
    this.opts.onDown?.();
    if (this.authFailures >= MAX_AUTH_FAILURES) {
      this.stopped = true; // never loop reconnects on a broken token
      this.opts.onPermanentFailure?.('auth failed');
      return;
    }
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.stopped || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.backoffMs);
    this.backoffMs = Math.min(this.backoffMs * 2, this.maxBackoffMs);
  }

  private heartbeat(): void {
    if (Date.now() - this.lastSeen > (this.opts.idleTimeoutMs ?? 60_000)) {
      try {
        this.ws?.close(); // silent socket → force the close/reconnect path
      } catch { /* already closing */ }
      return;
    }
    if (this.opened) this.send({ type: 'PING' });
  }

  private send(frame: Record<string, unknown>): void {
    try {
      this.ws?.send(JSON.stringify(frame));
    } catch { /* racing a close — the close handler recovers */ }
  }

  private clearTimers(): void {
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = null; }
  }
}
