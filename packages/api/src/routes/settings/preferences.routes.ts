import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { UserPreferencesDocument } from '../../db/collections.js';
import { appendAudit, getActor, looseRecordSchema, nowIso, parseBody, settingsCollection } from './helpers.js';

const preferencesPatchSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  language: z.string().trim().min(2).max(16).optional(),
  weekStart: z.enum(['sunday', 'monday']).optional(),
  dateFormat: z.string().trim().min(1).max(64).optional(),
  timezone: z.string().trim().min(1).max(128).optional(),
  autoTimezone: z.boolean().optional(),
  numberFormat: z.string().trim().min(1).max(64).optional(),
  enterAddsNewline: z.boolean().optional(),
  cookies: looseRecordSchema.optional(),
  privacy: looseRecordSchema.optional(),
  desktop: looseRecordSchema.optional(),
}).strict();

function defaultPreferences(userId: string): UserPreferencesDocument {
  const timestamp = new Date().toISOString();
  return {
    userId,
    theme: 'system',
    language: 'en',
    weekStart: 'monday',
    dateFormat: 'relative',
    timezone: 'UTC',
    autoTimezone: true,
    numberFormat: 'en-US',
    enterAddsNewline: false,
    cookies: { functional: true, analytics: false, marketing: false },
    privacy: { telemetry: false, profileDiscoverable: false },
    desktop: { launchAtLogin: false, nativeNotifications: true },
    createdAt: timestamp,
    updatedAt: timestamp,
    removedAt: null,
  };
}

async function getPreferences(userId: string) {
  return await settingsCollection('user_preferences').findOne({ userId, removedAt: null }) ?? defaultPreferences(userId);
}

export async function preferencesRoutes(app: FastifyInstance) {
  app.get('/preferences', async (request) => getPreferences(getActor(request).actorId));

  app.patch('/preferences', async (request, reply) => {
    const body = parseBody(preferencesPatchSchema, request.body, reply);
    if (!body) return undefined;
    const { actorId } = getActor(request);
    const current = await getPreferences(actorId);
    const preferences: UserPreferencesDocument = { ...current, ...body, updatedAt: nowIso() };
    await settingsCollection('user_preferences').updateOne(
      { userId: actorId },
      { $set: preferences },
      { upsert: true },
    );
    await appendAudit({ actorId, action: 'preferences.update', target: { type: 'user_preferences', id: actorId }, metadata: body });
    return preferences;
  });

  app.post('/preferences/reset', async (request) => {
    const { actorId } = getActor(request);
    const preferences = defaultPreferences(actorId);
    await settingsCollection('user_preferences').updateOne(
      { userId: actorId },
      { $set: preferences },
      { upsert: true },
    );
    await appendAudit({ actorId, action: 'preferences.reset', target: { type: 'user_preferences', id: actorId } });
    return preferences;
  });
}
