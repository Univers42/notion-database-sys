/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   subscribe.ts                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/06 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 18:48:28 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { ChangeEvent } from '@notion-db/contract-types';
import { changeEmitter } from '../events/emitter';

const KEEP_ALIVE_MS = 15_000;

/** Registers the server-sent events subscription endpoint. */
export async function registerSubscribeRoutes(app: FastifyInstance): Promise<void> {
  app.get('/subscribe', (request, reply) => subscribe(request, reply));
}

/**
 * Streams ChangeEvent messages as SSE.
 * Uses reply.hijack() so Fastify does not attempt to serialize a JSON response.
 */
function subscribe(request: FastifyRequest, reply: FastifyReply): void {
  reply.hijack();
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': process.env.CONTRACT_SERVER_CORS_ORIGIN || '*',
  });
  reply.raw.write(': connected\n\n');

  const listener = (event: ChangeEvent): void => {
    try {
      reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
    } catch {
      cleanup();
    }
  };
  const heartbeat = setInterval(() => {
    try {
      reply.raw.write(': ping\n\n');
    } catch {
      cleanup();
    }
  }, KEEP_ALIVE_MS);

  const cleanup = (): void => {
    clearInterval(heartbeat);
    changeEmitter.off('change', listener);
  };

  changeEmitter.on('change', listener);
  request.raw.on('close', cleanup);
}
