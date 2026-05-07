/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   page.routes.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 15:03:17 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/07 20:22:19 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { FastifyInstance } from 'fastify';
import { AbacEngine, PageService, WorkspaceService, isValidObjectId } from '@notion-db/core';

type PageLike = {
  _id: unknown;
  workspaceId: unknown;
};

function idString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'toHexString' in value) {
    const toHexString = (value as { toHexString?: () => string }).toHexString;
    return typeof toHexString === 'function' ? toHexString.call(value) : '';
  }
  return '';
}

export async function pageRoutes(app: FastifyInstance) {
  const svc = new PageService();
  const workspaceSvc = new WorkspaceService();
  const abac = new AbacEngine();

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
    if (!isValidObjectId(request.body.workspaceId)) {
      return reply.code(400).send({ error: 'Invalid workspace ID' });
    }
    if (!await abac.check(request.user.sub, request.body.workspaceId, request.body.workspaceId, 'workspace', 'can_edit')) {
      return reply.code(403).send({ error: 'Forbidden' });
    }
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
  }>('/all', async (request, reply) => {
    if (!isValidObjectId(request.query.workspaceId)) {
      return reply.code(400).send({ error: 'Invalid workspace ID' });
    }
    if (!await workspaceSvc.hasAccess(request.query.workspaceId, request.user.sub)) return [];
    return svc.listAllPages(request.query.workspaceId);
  });

  // GET /api/pages/:id
  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    if (!isValidObjectId(request.params.id)) {
      return reply.code(400).send({ error: 'Invalid page ID' });
    }
    const page = await svc.getById(request.params.id);
    if (!page) return reply.code(404).send({ error: 'Page not found' });
    const typedPage = page as PageLike;
    const workspaceId = idString(typedPage.workspaceId);
    if (!await abac.check(request.user.sub, workspaceId, request.params.id, 'page', 'can_view')) {
      return reply.code(404).send({ error: 'Page not found' });
    }
    return page;
  });

  // GET /api/pages?workspaceId=&databaseId=
  app.get<{
    Querystring: { workspaceId: string; databaseId?: string };
  }>('/', async (request, reply) => {
    const { workspaceId, databaseId } = request.query;
    if (!isValidObjectId(workspaceId)) {
      return reply.code(400).send({ error: 'Invalid workspace ID' });
    }
    if (!await workspaceSvc.hasAccess(workspaceId, request.user.sub)) return [];
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
    if (!isValidObjectId(request.params.id)) {
      return reply.code(400).send({ error: 'Invalid page ID' });
    }
    const existing = await svc.getById(request.params.id) as PageLike | null;
    if (!existing) return reply.code(404).send({ error: 'Page not found' });
    if (!await abac.check(request.user.sub, idString(existing.workspaceId), request.params.id, 'page', 'can_edit')) {
      return reply.code(403).send({ error: 'Forbidden' });
    }
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
    if (!isValidObjectId(request.params.id)) {
      return reply.code(400).send({ error: 'Invalid page ID' });
    }
    const existing = await svc.getById(request.params.id) as PageLike | null;
    if (!existing) return reply.code(404).send({ error: 'Page not found' });
    if (!await abac.check(request.user.sub, idString(existing.workspaceId), request.params.id, 'page', 'can_edit')) {
      return reply.code(403).send({ error: 'Forbidden' });
    }
    const page = await svc.updateProperties(
      request.params.id,
      request.body.properties,
      request.user.sub,
    );
    if (!page) return reply.code(404).send({ error: 'Page not found' });
    return page;
  });

  // DELETE /api/pages/:id (soft delete)
  app.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    if (!isValidObjectId(request.params.id)) {
      return reply.code(400).send({ error: 'Invalid page ID' });
    }
    const existing = await svc.getById(request.params.id) as PageLike | null;
    if (!existing) return reply.code(404).send({ error: 'Page not found' });
    if (!await abac.check(request.user.sub, idString(existing.workspaceId), request.params.id, 'page', 'can_edit')) {
      return reply.code(403).send({ error: 'Forbidden' });
    }
    await svc.archive(request.params.id, request.user.sub);
    return { ok: true };
  });

  // POST /api/pages/:id/restore
  app.post<{ Params: { id: string } }>('/:id/restore', async (request, reply) => {
    if (!isValidObjectId(request.params.id)) {
      return reply.code(400).send({ error: 'Invalid page ID' });
    }
    const existing = await svc.getById(request.params.id) as PageLike | null;
    if (!existing) return reply.code(404).send({ error: 'Page not found' });
    if (!await abac.check(request.user.sub, idString(existing.workspaceId), request.params.id, 'page', 'can_edit')) {
      return reply.code(403).send({ error: 'Forbidden' });
    }
    await svc.restore(request.params.id);
    return { ok: true };
  });
}
