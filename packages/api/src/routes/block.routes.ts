/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   block.routes.ts                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 15:03:10 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/05 03:56:11 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { FastifyInstance } from 'fastify';
import { BlockService, isValidObjectId } from '@notion-db/core';

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
    const block = await svc.create(request.body as Parameters<BlockService['create']>[0]);
    reply.code(201).send(block);
  });

  // GET /api/blocks?pageId=
  app.get<{
    Querystring: { pageId: string };
  }>('/', async (request) => {
    return svc.listByPage(request.query.pageId);
  });

  // GET /api/blocks/:id/children
  app.get<{ Params: { id: string } }>('/:id/children', async (request, reply) => {
    if (!isValidObjectId(request.params.id)) {
      return reply.code(400).send({ error: 'Invalid block ID' });
    }
    return svc.listChildren(request.params.id);
  });

  // PATCH /api/blocks/:id
  app.patch<{
    Params: { id: string };
    Body: Record<string, unknown>;
  }>('/:id', async (request, reply) => {
    if (!isValidObjectId(request.params.id)) {
      return reply.code(400).send({ error: 'Invalid block ID' });
    }
    const block = await svc.update(request.params.id, request.body as Parameters<BlockService['update']>[1]);
    if (!block) return reply.code(404).send({ error: 'Block not found' });
    return block;
  });

  // PATCH /api/blocks/:id/reorder
  app.patch<{
    Params: { id: string };
    Body: { order: string };
  }>('/:id/reorder', async (request, reply) => {
    if (!isValidObjectId(request.params.id)) {
      return reply.code(400).send({ error: 'Invalid block ID' });
    }
    await svc.reorder(request.params.id, request.body.order);
    return { ok: true };
  });

  // DELETE /api/blocks/:id (soft delete)
  app.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    if (!isValidObjectId(request.params.id)) {
      return reply.code(400).send({ error: 'Invalid block ID' });
    }
    await svc.archive(request.params.id, request.user.sub);
    return { ok: true };
  });
}
