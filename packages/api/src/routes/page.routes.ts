// ─── Page routes ────────────────────────────────────────────────────────────

import type { FastifyInstance } from 'fastify';
import { PageService } from '@notion-db/core';

export async function pageRoutes(app: FastifyInstance) {
  const svc = new PageService();

  app.addHook('preHandler', app.authenticate);

  // POST /api/pages
  app.post<{
    Body: {
      workspaceId: string;
      databaseId?: string;
      parentPageId?: string;
      properties?: Record<string, unknown>;
      icon?: string;
      cover?: string;
      title?: string;
      content?: unknown[];
    };
  }>('/', async (request, reply) => {
    const page = await svc.create({
      ...request.body,
      createdBy: request.user.sub,
    });
    reply.code(201).send(page);
  });

  // GET /api/pages/all?workspaceId= — all pages in workspace (root + children)
  // ⚠️ Must be registered BEFORE /:id to avoid matching "all" as a param
  app.get<{
    Querystring: { workspaceId: string };
  }>('/all', async (request) => {
    return svc.listAllPages(request.query.workspaceId);
  });

  // GET /api/pages/:id
  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const page = await svc.getById(request.params.id);
    if (!page) return reply.code(404).send({ error: 'Page not found' });
    return page;
  });

  // GET /api/pages?workspaceId=&databaseId=
  app.get<{
    Querystring: { workspaceId: string; databaseId?: string };
  }>('/', async (request) => {
    const { workspaceId, databaseId } = request.query;
    if (databaseId) {
      return svc.listByDatabase(workspaceId, databaseId);
    }
    return svc.listRootPages(workspaceId);
  });

  // PATCH /api/pages/:id — general page update (title, icon, content)
  app.patch<{
    Params: { id: string };
    Body: { title?: string; icon?: string; cover?: string; content?: unknown[]; parentPageId?: string | null };
  }>('/:id', async (request, reply) => {
    const page = await svc.updatePage(
      request.params.id,
      request.body,
      request.user.sub,
    );
    if (!page) return reply.code(404).send({ error: 'Page not found' });
    return page;
  });

  // PATCH /api/pages/:id/properties
  app.patch<{
    Params: { id: string };
    Body: { properties: Record<string, unknown> };
  }>('/:id/properties', async (request, reply) => {
    const page = await svc.updateProperties(
      request.params.id,
      request.body.properties,
      request.user.sub,
    );
    if (!page) return reply.code(404).send({ error: 'Page not found' });
    return page;
  });

  // DELETE /api/pages/:id (soft delete)
  app.delete<{ Params: { id: string } }>('/:id', async (request) => {
    await svc.archive(request.params.id, request.user.sub);
    return { ok: true };
  });

  // POST /api/pages/:id/restore
  app.post<{ Params: { id: string } }>('/:id/restore', async (request) => {
    await svc.restore(request.params.id);
    return { ok: true };
  });
}
