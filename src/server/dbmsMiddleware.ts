/** @file dbmsMiddleware.ts — Barrel: DBMS middleware router + Vite integration. */

import type { ViteDevServer } from 'vite';
import type { Req, Res, ApiHandler } from './dbmsTypes';
import { initFileWatcher, stopFileWatcher } from './fileWatcher';
import { initLogger } from './logger';
import { getActiveSource } from './stateManager';
import {
  handlePatchPage, handlePostRecord, handleDeleteRecord,
} from './routeHandlersCrud';
import {
  handleGetState, handleGetSource, handlePutSource,
  handlePostColumn, handleDeleteColumn, handleChangeColumnType,
  handleGetQueryLog, handleDeleteQueryLog, handlePostOps,
  handlePatchState,
} from './routeHandlersAdmin';

/* ── Re-export public API (preserves existing import paths) ── */
export { getActiveSource } from './stateManager';

/* ────────────────── Route tables ────────────────── */

const EXACT_ROUTES: Record<string, ApiHandler> = {
  'GET /api/dbms/state': handleGetState,
  'GET /api/dbms/source': handleGetSource,
  'PUT /api/dbms/source': handlePutSource,
  'POST /api/dbms/records': handlePostRecord,
  'POST /api/dbms/columns': handlePostColumn,
  'GET /api/dbms/query-log': handleGetQueryLog,
  'DELETE /api/dbms/query-log': handleDeleteQueryLog,
  'POST /api/dbms/ops': handlePostOps,
  'PATCH /api/dbms/state': handlePatchState,
};

const PARAM_ROUTES: Array<{ method: string; pattern: RegExp; handler: ApiHandler }> = [
  { method: 'PATCH', pattern: /^\/api\/dbms\/pages\/([^/]+)$/, handler: handlePatchPage },
  { method: 'DELETE', pattern: /^\/api\/dbms\/records\/([^/]+)$/, handler: handleDeleteRecord },
  { method: 'DELETE', pattern: /^\/api\/dbms\/columns\/([^/]+)\/([^/]+)$/, handler: handleDeleteColumn },
  { method: 'PATCH', pattern: /^\/api\/dbms\/columns\/([^/]+)\/([^/]+)\/type$/, handler: handleChangeColumnType },
];

/** Dispatch an API request to the appropriate route handler. */
async function dbmsApiRouter(req: Req, res: Res): Promise<void> {
  const rawUrl = req.url ?? '';
  const qIdx = rawUrl.indexOf('?');
  const path = qIdx === -1 ? rawUrl : rawUrl.slice(0, qIdx);
  const method = req.method ?? '';
  const key = `${method} ${path}`;

  const exact = EXACT_ROUTES[key];
  if (exact) { await exact(req, res); return; }

  for (const route of PARAM_ROUTES) {
    if (method !== route.method) continue;
    const m = route.pattern.exec(path);
    if (!m) continue;
    await route.handler(req, res, m.slice(1).map(decodeURIComponent));
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
}

/** Registers DBMS REST API routes on the Vite dev server. */
export function dbmsMiddleware(server: ViteDevServer): void {
  // Initialize the styled logger system (Observer + Decorator chain)
  initLogger(getActiveSource());

  // Start file watcher (inotify — zero CPU)
  initFileWatcher(server, getActiveSource);
  server.httpServer?.on('close', stopFileWatcher);

  server.middlewares.use(async (req, res, next) => {
    const url = req.url ?? '';
    if (!url.startsWith('/api/dbms/')) return next();
    res.setHeader('Content-Type', 'application/json');
    try {
      await dbmsApiRouter(req, res);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[dbms-middleware]', message);
      res.writeHead(500);
      res.end(JSON.stringify({ error: message }));
    }
  });
}
