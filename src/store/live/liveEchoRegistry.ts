/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   liveEchoRegistry.ts                                 :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/10 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * Module-level registry of rows OUR write pipeline just touched, keyed
 * `dbId:table:pk` with a ~10s TTL. The realtime orchestrator consults it to
 * drop `row_changed` echoes of our own writes. It is (table, pk)-based — NOT
 * idempotency-key-based — because the realtime delivery frame (protocol.rs
 * `EventPayload`: event_id/topic/event_type/sequence/timestamp/payload) does
 * NOT forward the publish envelope's `idempotency_key`, and the query-router
 * puts no key inside `payload` either. TTL semantics (no one-shot consume):
 * a remote edit to the same row within the window is shadowed, which the 15s
 * poll fallback then converges — the safe direction, per the write contract.
 */

export const LIVE_ECHO_TTL_MS = 10_000;

const recentOwnWrites = new Map<string, number>(); // key → expiry epoch ms

function echoKey(dbId: string, table: string, pk: string): string {
  return `${dbId}:${table}:${pk}`;
}

/** Record at SEND time (and on insert echo, once the real pk is known). */
export function noteLiveOwnWrite(dbId: string, table: string, pk: string): void {
  const now = Date.now();
  for (const [key, expiry] of recentOwnWrites) {
    if (expiry <= now) recentOwnWrites.delete(key); // lazy purge
  }
  recentOwnWrites.set(echoKey(dbId, table, pk), now + LIVE_ECHO_TTL_MS);
}

/** True when this row was touched by our own writes inside the TTL window. */
export function isRecentLiveOwnWrite(dbId: string, table: string, pk: string): boolean {
  const expiry = recentOwnWrites.get(echoKey(dbId, table, pk));
  return expiry !== undefined && expiry > Date.now();
}

/** Test hook — the registry is module-level shared state. */
export function clearLiveEchoRegistry(): void {
  recentOwnWrites.clear();
}
