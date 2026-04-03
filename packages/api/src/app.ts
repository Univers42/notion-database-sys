// ─── Fastify app builder ─────────────────────────────────────────────────────

import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import websocket from '@fastify/websocket';
import { connectDatabase, syncIndexes } from '@notion-db/core';
import { authRoutes } from './routes/auth.routes';
import { workspaceRoutes } from './routes/workspace.routes';
import { pageRoutes } from './routes/page.routes';
import { blockRoutes } from './routes/block.routes';
import { viewRoutes } from './routes/view.routes';
import { wsRoutes } from './routes/ws.routes';
import { authHook } from './hooks/auth.hook';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
      transport: process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    },
  });

  // ── Plugins ────────────────────────────────────────────────────────────────
  const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:3000,http://localhost:3001')
    .split(',').map(o => o.trim());
  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
  });

  await app.register(jwt, {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
    sign: { expiresIn: process.env.JWT_EXPIRES_IN ?? '15m' },
  });

  await app.register(websocket);

  // ── Auth hook (runs before all protected routes) ───────────────────────────
  app.decorate('authenticate', authHook);

  // ── Connect to MongoDB ─────────────────────────────────────────────────────
  const mongoUri = process.env.MONGO_URI ?? 'mongodb://localhost:27017/notion_db';
  await connectDatabase({ uri: mongoUri, dbName: process.env.MONGO_DB });

  if (process.env.SYNC_INDEXES !== 'false') {
    await syncIndexes();
  }

  // ── Routes ─────────────────────────────────────────────────────────────────
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(workspaceRoutes, { prefix: '/api/workspaces' });
  await app.register(pageRoutes, { prefix: '/api/pages' });
  await app.register(blockRoutes, { prefix: '/api/blocks' });
  await app.register(viewRoutes, { prefix: '/api/views' });
  await app.register(wsRoutes, { prefix: '/ws' });

  // ── Health check ───────────────────────────────────────────────────────────
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  return app;
}

