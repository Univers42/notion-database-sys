// ─── Block routes ───────────────────────────────────────────────────────────

import type { FastifyInstance } from 'fastify';
import { BlockService } from '@notion-db/core';

export async function blockRoutes(app: FastifyInstance) {
  const svc = new BlockService();

  app.addHook('preHandler', app.authenticate);

  // POST /api/blocks
  app.post<{
    Body: {
      pageId: string;
      workspaceId: string;
      parentBlockId?: string;
      type: string;
      content?: string;
      order: string;
    };
  }>('/', async (request, reply) => {
    const block = await svc.create(request.body as any);
    reply.code(201).send(block);
  });

  // GET /api/blocks?pageId=
  app.get<{
    Querystring: { pageId: string };
  }>('/', async (request) => {
    return svc.listByPage(request.query.pageId);
  });

  // GET /api/blocks/:id/children
  app.get<{ Params: { id: string } }>('/:id/children', async (request) => {
    return svc.listChildren(request.params.id);
  });

  // PATCH /api/blocks/:id
  app.patch<{
    Params: { id: string };
    Body: Record<string, unknown>;
  }>('/:id', async (request, reply) => {
    const block = await svc.update(request.params.id, request.body as any);
    if (!block) return reply.code(404).send({ error: 'Block not found' });
    return block;
  });

  // PATCH /api/blocks/:id/reorder
  app.patch<{
    Params: { id: string };
    Body: { order: string };
  }>('/:id/reorder', async (request) => {
    await svc.reorder(request.params.id, request.body.order);
    return { ok: true };
  });

  // DELETE /api/blocks/:id (soft delete)
  app.delete<{ Params: { id: string } }>('/:id', async (request) => {
    await svc.archive(request.params.id, request.user.sub);
    return { ok: true };
  });
}
