/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   notifications.routes.ts                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/18 21:19:17 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/18 21:19:17 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { NotificationSettingsDocument } from '../../db/collections.js';
import { appendAudit, getActor, looseRecordSchema, nowIso, parseBody, sendError, settingsCollection } from './helpers.js';

const notificationsPatchSchema = z.object({
  slack: looseRecordSchema.optional(),
  discord: looseRecordSchema.optional(),
  email: looseRecordSchema.optional(),
  inApp: looseRecordSchema.optional(),
}).strict();

const pageOverrideSchema = z.object({
  email: looseRecordSchema.optional(),
  inApp: looseRecordSchema.optional(),
  slack: looseRecordSchema.optional(),
  discord: looseRecordSchema.optional(),
}).strict();

type PageOverride = { pageId: string } & Record<string, unknown>;

function defaultNotifications(userId: string): NotificationSettingsDocument {
  const timestamp = nowIso();
  return {
    userId,
    slack: { enabled: false },
    discord: { enabled: false },
    email: { enabled: true, mentions: true, comments: true, workspaceUpdates: false },
    inApp: { enabled: true, mentions: true, comments: true, workspaceUpdates: true },
    perPageOverrides: [],
    createdAt: timestamp,
    updatedAt: timestamp,
    removedAt: null,
  };
}

async function getNotifications(userId: string) {
  return await settingsCollection('notification_settings').findOne({ userId, removedAt: null }) ?? defaultNotifications(userId);
}

export async function notificationsRoutes(app: FastifyInstance) {
  app.get('/notifications', async (request) => getNotifications(getActor(request).actorId));

  app.patch('/notifications', async (request, reply) => {
    const body = parseBody(notificationsPatchSchema, request.body, reply);
    if (!body) return undefined;
    const { actorId } = getActor(request);
    const current = await getNotifications(actorId);
    const settings: NotificationSettingsDocument = { ...current, ...body, updatedAt: nowIso() };
    await settingsCollection('notification_settings').updateOne(
      { userId: actorId },
      { $set: settings },
      { upsert: true },
    );
    await appendAudit({ actorId, action: 'notifications.update', target: { type: 'notification_settings', id: actorId }, metadata: body });
    return settings;
  });

  app.get('/notifications/page-overrides', async (request) => {
    const settings = await getNotifications(getActor(request).actorId);
    return settings.perPageOverrides;
  });

  app.put<{ Params: { pageId: string } }>('/notifications/page-overrides/:pageId', async (request, reply) => {
    const body = parseBody(pageOverrideSchema, request.body, reply);
    if (!body) return undefined;
    const { actorId } = getActor(request);
    if (!request.params.pageId.trim()) return sendError(reply, 400, 'INVALID_PAGE_ID', 'Invalid page ID');
    const current = await getNotifications(actorId);
    const override: PageOverride = { pageId: request.params.pageId, ...body };
    const nextOverrides = [
      ...current.perPageOverrides.filter((item) => (item as PageOverride).pageId !== request.params.pageId),
      override,
    ];
    await settingsCollection('notification_settings').updateOne(
      { userId: actorId },
      { $set: { ...current, perPageOverrides: nextOverrides, updatedAt: nowIso() } },
      { upsert: true },
    );
    await appendAudit({ actorId, action: 'notifications.page_override.upsert', target: { type: 'page', id: request.params.pageId }, metadata: body });
    return override;
  });

  app.delete<{ Params: { pageId: string } }>('/notifications/page-overrides/:pageId', async (request, reply) => {
    const { actorId } = getActor(request);
    if (!request.params.pageId.trim()) return sendError(reply, 400, 'INVALID_PAGE_ID', 'Invalid page ID');
    const current = await getNotifications(actorId);
    await settingsCollection('notification_settings').updateOne(
      { userId: actorId },
      { $set: { ...current, perPageOverrides: current.perPageOverrides.filter((item) => (item as PageOverride).pageId !== request.params.pageId), updatedAt: nowIso() } },
      { upsert: true },
    );
    await appendAudit({ actorId, action: 'notifications.page_override.remove', target: { type: 'page', id: request.params.pageId } });
    return { ok: true };
  });
}
