/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   subscribe.ts                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/06 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 19:24:16 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import crypto from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { canReceiveEvent } from '../auth';
import {
  createStateReplacedEntry,
  getReplaySince,
  getSequenceCounter,
  type ReplayEntry,
} from '../events/buffer';
import { changeEmitter } from '../events/emitter';

const KEEP_ALIVE_MS = 15_000;
const BACKPRESSURE_TIMEOUT_MS = 5_000;

/** Registers the server-sent events subscription endpoint. */
export async function registerSubscribeRoutes(app: FastifyInstance): Promise<void> {
  app.get('/subscribe', (request, reply) => subscribe(app, request, reply));
}

/**
 * Streams ChangeEvent messages as SSE.
 * Uses reply.hijack() so Fastify does not attempt to serialize a JSON response.
 */
function subscribe(app: FastifyInstance, request: FastifyRequest, reply: FastifyReply): void {
  const connectionId = crypto.randomUUID();
  const user = request.user;
  const openedAt = new Date().toISOString();
  const lastEventId = readLastEventId(request);
  let eventsDelivered = 0;
  let lastDeliveredId: string | null = null;
  let closed = false;
  let replaying = true;
  let paused = false;
  let replayPending = false;
  const queuedLiveEntries: ReplayEntry[] = [];
  let backpressureTimer: ReturnType<typeof setTimeout> | null = null;
  let drainHandler: (() => void) | null = null;

  reply.hijack();
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': process.env.CONTRACT_SERVER_CORS_ORIGIN || '*',
  });
  reply.raw.write(': connected\n\n');

  app.log.info({ connectionId, openedAt, lastEventId }, 'sse connection opened');

  const listener = (entry: ReplayEntry): void => {
    if (replaying) {
      queuedLiveEntries.push(entry);
      return;
    }
    sendEntry(entry);
  };
  const heartbeat = setInterval(() => {
    try {
      reply.raw.write(': ping\n\n');
    } catch {
      close('write-error');
    }
  }, KEEP_ALIVE_MS);

  const close = (reason: string): void => {
    if (closed) return;
    closed = true;
    clearInterval(heartbeat);
    clearBackpressureTimer();
    changeEmitter.off('change', listener);
    const closedAt = new Date().toISOString();
    app.log.info({
      connectionId,
      openedAt,
      closedAt,
      reason,
      eventsDelivered,
      lastEventId,
      lastDeliveredId,
    }, 'sse connection closed');
    if (reason !== 'client-closed' && !reply.raw.destroyed) reply.raw.destroy();
  };

  changeEmitter.on('change', listener);
  request.raw.on('close', () => close('client-closed'));

  if (lastEventId) replayFrom(lastEventId);
  replaying = false;
  flushQueuedLiveEntries();

  function sendEntry(entry: ReplayEntry): boolean {
    if (closed) return false;
    if (!canReceiveEvent(user, entry.event)) return true;
    if (paused) {
      replayPending = true;
      return false;
    }

    try {
      const canContinue = reply.raw.write(formatSse(entry));
      eventsDelivered += 1;
      lastDeliveredId = entry.id;
      if (!canContinue) startBackpressureTimer();
      return canContinue;
    } catch {
      close('write-error');
      return false;
    }
  }

  function replayFrom(cursor: string): void {
    const replay = getReplaySince(cursor);
    if (replay.status === 'gap') {
      app.log.info({ connectionId, lastEventId: cursor, reason: replay.reason }, 'sse replay gap');
      sendEntry(createStateReplacedEntry());
      return;
    }
    for (const entry of replay.entries) {
      if (!sendEntry(entry)) return;
    }
  }

  function flushQueuedLiveEntries(): void {
    while (queuedLiveEntries.length > 0) {
      const entry = queuedLiveEntries.shift();
      if (!entry) return;
      const lastCounter = getSequenceCounter(lastDeliveredId);
      if (lastCounter !== null && entry.counter <= lastCounter) continue;
      if (!sendEntry(entry)) return;
    }
  }

  function startBackpressureTimer(): void {
    if (paused) return;
    paused = true;
    app.log.warn({ connectionId, lastDeliveredId }, 'sse backpressure detected');

    drainHandler = () => {
      clearBackpressureTimer();
      paused = false;
      app.log.info({ connectionId, lastDeliveredId }, 'sse backpressure drained');
      if (replayPending) {
        replayPending = false;
        replayFrom(lastDeliveredId ?? '');
      }
      flushQueuedLiveEntries();
    };

    reply.raw.once('drain', drainHandler);
    backpressureTimer = setTimeout(() => close('backpressure-timeout'), BACKPRESSURE_TIMEOUT_MS);
  }

  function clearBackpressureTimer(): void {
    if (backpressureTimer) clearTimeout(backpressureTimer);
    backpressureTimer = null;
    if (drainHandler) reply.raw.off('drain', drainHandler);
    drainHandler = null;
  }
}

function formatSse(entry: ReplayEntry): string {
  return `id: ${entry.id}\ndata: ${JSON.stringify(entry.event)}\n\n`;
}

function readLastEventId(request: FastifyRequest): string | null {
  const value = request.headers['last-event-id'];
  if (Array.isArray(value)) return value[0] ?? null;
  return typeof value === 'string' && value.length > 0 ? value : null;
}
