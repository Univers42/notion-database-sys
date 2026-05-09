/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   workspace.routes.ts                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 15:03:31 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/09 15:08:26 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { FastifyInstance } from 'fastify';
import { AbacEngine, WorkspaceService, isValidObjectId } from '@notion-db/core';
import type { WorkspaceRole } from '@notion-db/types';

export async function workspaceRoutes(app: FastifyInstance) {
  const svc = new WorkspaceService();
  const abac = new AbacEngine();

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
    if (!isValidObjectId(request.params.id)) {
      return reply.code(400).send({ error: 'Invalid workspace ID' });
    }
    const ws = await svc.getById(request.params.id);
    if (!ws) return reply.code(404).send({ error: 'Workspace not found' });
    if (!await svc.hasAccess(request.params.id, request.user.sub)) {
      return reply.code(404).send({ error: 'Workspace not found' });
    }
    return ws;
  });

  // POST /api/workspaces/:id/members — invite
  app.post<{
    Params: { id: string };
    Body: { userId: string; role?: string };
  }>('/:id/members', async (request, reply) => {
    if (!isValidObjectId(request.params.id)) {
      return reply.code(400).send({ error: 'Invalid workspace ID' });
    }
    if (!await abac.check(request.user.sub, request.params.id, request.params.id, 'workspace', 'full_access')) {
      return reply.code(403).send({ error: 'Forbidden' });
    }
    const { userId, role } = request.body;
    await svc.addMember(request.params.id, userId, (role ?? 'member') as WorkspaceRole, request.user.sub);
    reply.code(201).send({ ok: true });
  });

}
