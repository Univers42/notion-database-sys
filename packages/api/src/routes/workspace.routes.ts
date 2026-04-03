// ─── Workspace routes ───────────────────────────────────────────────────────

import type { FastifyInstance } from 'fastify';
import { WorkspaceService } from '@notion-db/core';

export async function workspaceRoutes(app: FastifyInstance) {
  const svc = new WorkspaceService();

  // All workspace routes require authentication
  app.addHook('preHandler', app.authenticate);

  // POST /api/workspaces — create workspace
  app.post<{
    Body: { name: string };
  }>('/', async (request, reply) => {
    const workspace = await svc.create(request.body.name, request.user.sub);
    reply.code(201).send(workspace);
  });

  // GET /api/workspaces — list user's workspaces
  app.get('/', async (request) => {
    return svc.listForUser(request.user.sub);
  });

  // GET /api/workspaces/:id
  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const ws = await svc.getById(request.params.id);
    if (!ws) return reply.code(404).send({ error: 'Workspace not found' });
    return ws;
  });

  // GET /api/workspaces/:id/members
  app.get<{ Params: { id: string } }>('/:id/members', async (request) => {
    return svc.listMembers(request.params.id);
  });

  // POST /api/workspaces/:id/members — invite
  app.post<{
    Params: { id: string };
    Body: { userId: string; role?: string };
  }>('/:id/members', async (request, reply) => {
    const { userId, role } = request.body;
    await svc.addMember(request.params.id, userId, (role as any) ?? 'member', request.user.sub);
    reply.code(201).send({ ok: true });
  });

  // PATCH /api/workspaces/:id/members/:userId
  app.patch<{
    Params: { id: string; userId: string };
    Body: { role: string };
  }>('/:id/members/:userId', async (request) => {
    await svc.updateMemberRole(request.params.id, request.params.userId, request.body.role as any);
    return { ok: true };
  });

  // DELETE /api/workspaces/:id/members/:userId
  app.delete<{
    Params: { id: string; userId: string };
  }>('/:id/members/:userId', async (request) => {
    await svc.removeMember(request.params.id, request.params.userId);
    return { ok: true };
  });
}
