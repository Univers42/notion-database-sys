// ─── View routes — CRUD + user overrides ────────────────────────────────────

import type { FastifyInstance } from 'fastify';
import { ViewService } from '@notion-db/core';

export async function viewRoutes(app: FastifyInstance) {
  const svc = new ViewService();

  app.addHook('preHandler', app.authenticate);

  // POST /api/views
  app.post<{
    Body: Record<string, unknown>;
  }>('/', async (request, reply) => {
    const view = await svc.create({
      ...(request.body as any),
      createdBy: request.user.sub,
    });
    reply.code(201).send(view);
  });

  // GET /api/views?databaseId=&workspaceId=
  app.get<{
    Querystring: { databaseId: string; workspaceId: string };
  }>('/', async (request) => {
    return svc.listByDatabase(request.query.databaseId, request.query.workspaceId);
  });

  // GET /api/views/:id — effective view (base + user overrides)
  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    try {
      return await svc.getEffective(request.params.id, request.user.sub);
    } catch {
      return reply.code(404).send({ error: 'View not found' });
    }
  });

  // PUT /api/views/:id/overrides — save user overrides
  app.put<{
    Params: { id: string };
    Body: { workspaceId: string; overrides: Record<string, unknown> };
  }>('/:id/overrides', async (request) => {
    await svc.saveOverride(
      request.params.id,
      request.user.sub,
      request.body.workspaceId,
      request.body.overrides as any,
    );
    return { ok: true };
  });

  // DELETE /api/views/:id/overrides — reset user overrides
  app.delete<{ Params: { id: string } }>('/:id/overrides', async (request) => {
    await svc.resetOverride(request.params.id, request.user.sub);
    return { ok: true };
  });
}
