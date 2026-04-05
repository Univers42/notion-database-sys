/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   view.routes.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 15:03:26 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/05 03:56:10 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { FastifyInstance } from 'fastify';
import { ViewService, isValidObjectId } from '@notion-db/core';

export async function viewRoutes(app: FastifyInstance) {
  const svc = new ViewService();

  app.addHook('preHandler', app.authenticate);

  // POST /api/views
  app.post<{
    Body: Record<string, unknown>;
  }>('/', async (request, reply) => {
    const view = await svc.create({
      ...request.body,
      createdBy: request.user.sub,
    } as Parameters<ViewService['create']>[0]);
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
    if (!isValidObjectId(request.params.id)) {
      return reply.code(400).send({ error: 'Invalid view ID' });
    }
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
  }>('/:id/overrides', async (request, reply) => {
    if (!isValidObjectId(request.params.id)) {
      return reply.code(400).send({ error: 'Invalid view ID' });
    }
    await svc.saveOverride(
      request.params.id,
      request.user.sub,
      request.body.workspaceId,
      request.body.overrides as Parameters<ViewService['saveOverride']>[3],
    );
    return { ok: true };
  });

  // DELETE /api/views/:id/overrides — reset user overrides
  app.delete<{ Params: { id: string } }>('/:id/overrides', async (request, reply) => {
    if (!isValidObjectId(request.params.id)) {
      return reply.code(400).send({ error: 'Invalid view ID' });
    }
    await svc.resetOverride(request.params.id, request.user.sub);
    return { ok: true };
  });
}
