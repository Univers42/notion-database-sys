/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   server.ts                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/06 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 19:24:13 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import fastify, { type FastifyError, type FastifyInstance } from 'fastify';
import type { Db } from 'mongodb';
import { registerAuthHook } from './auth';
import { getMongoDb } from './db/connections';
import { registerPageRoutes } from './routes/pages';
import { registerSchemaRoutes } from './routes/schema';
import { registerStateRoutes } from './routes/state';
import { registerSubscribeRoutes } from './routes/subscribe';

declare module 'fastify' {
  interface FastifyInstance {
    mongo: Db;
  }
}

/** Builds the Fastify contract server application. */
export async function buildServer(): Promise<FastifyInstance> {
  const app = fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
  });

  app.addHook('onRequest', (request, reply, done) => {
    reply.header('Access-Control-Allow-Origin', process.env.CONTRACT_SERVER_CORS_ORIGIN || '*');
    reply.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Last-Event-ID');
    if (request.method === 'OPTIONS') {
      void reply.status(204).send();
      return;
    }
    done();
  });

  const mongo = await getMongoDb();
  app.decorate('mongo', mongo);

  app.setErrorHandler((err: FastifyError, _request, reply) => {
    const statusCode = err.statusCode ?? 500;
    requestLog(app, err, statusCode);
    void reply.status(statusCode).send({ error: err.message, code: err.code });
  });

  app.get('/health', async () => {
    let mongoStatus: 'up' | 'down' = 'down';
    try {
      await app.mongo.admin().ping();
      mongoStatus = 'up';
    } catch {
      mongoStatus = 'down';
    }
    return { status: 'ok', mongo: mongoStatus, timestamp: new Date().toISOString() };
  });

  await app.register(async (v1) => {
    registerAuthHook(v1);
    await registerStateRoutes(v1);
    await registerPageRoutes(v1);
    await registerSchemaRoutes(v1);
    await registerSubscribeRoutes(v1);
  }, { prefix: '/v1' });

  return app;
}

function requestLog(app: FastifyInstance, err: Error & { code?: string }, statusCode: number): void {
  app.log.error({ err, statusCode, code: err.code }, 'contract-server request failed');
}
