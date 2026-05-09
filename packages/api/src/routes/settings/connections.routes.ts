import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { ConnectionDocument } from '../../db/collections.js';
import {
  appendAudit,
  createRecordId,
  encryptSecret,
  getActor,
  looseRecordSchema,
  nowIso,
  parseBody,
  sendError,
  settingsCollection,
  stripConnectionSecrets,
} from './helpers.js';

const connectionCreateSchema = z.object({
  provider: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(120).optional(),
  scopes: z.array(z.string().trim().min(1)).default([]),
  metadata: looseRecordSchema.optional(),
}).strict();

const connectionPatchSchema = z.object({
  label: z.string().trim().min(1).max(120).optional(),
  scopes: z.array(z.string().trim().min(1)).optional(),
  status: z.enum(['connected', 'disabled', 'error', 'revoked']).optional(),
  metadata: looseRecordSchema.optional(),
}).strict();

export async function connectionsRoutes(app: FastifyInstance) {
  app.get('/connections', async (request) => {
    const { actorId } = getActor(request);
    const connections = await settingsCollection('connections').find({ userId: actorId, removedAt: null }).sort({ connectedAt: -1 }).toArray();
    return connections.map(stripConnectionSecrets);
  });

  app.post('/connections', async (request, reply) => {
    const body = parseBody(connectionCreateSchema, request.body, reply);
    if (!body) return undefined;
    const { actorId } = getActor(request);
    const timestamp = nowIso();
    const connection: ConnectionDocument = {
      _id: createRecordId('conn'),
      userId: actorId,
      provider: body.provider,
      label: body.label ?? body.provider,
      scopes: body.scopes,
      status: 'connected',
      accessTokenEnc: encryptSecret(`mock-access:${actorId}:${body.provider}:${timestamp}`),
      refreshTokenEnc: encryptSecret(`mock-refresh:${actorId}:${body.provider}:${timestamp}`),
      connectedAt: timestamp,
      lastSyncAt: null,
      error: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      removedAt: null,
    };
    await settingsCollection('connections').insertOne(connection);
    await appendAudit({ actorId, action: 'connection.create', target: { type: 'connection', id: connection._id }, metadata: { provider: body.provider, scopes: body.scopes } });
    return reply.code(201).send(stripConnectionSecrets(connection));
  });

  app.patch<{ Params: { id: string } }>('/connections/:id', async (request, reply) => {
    const body = parseBody(connectionPatchSchema, request.body, reply);
    if (!body) return undefined;
    const { actorId } = getActor(request);
    const timestamp = nowIso();
    const update = { ...body, updatedAt: timestamp };
    const result = await settingsCollection('connections').findOneAndUpdate(
      { _id: request.params.id, userId: actorId, removedAt: null },
      { $set: update },
      { returnDocument: 'after' },
    );
    if (!result) return sendError(reply, 404, 'CONNECTION_NOT_FOUND', 'Connection not found');
    await appendAudit({ actorId, action: 'connection.update', target: { type: 'connection', id: request.params.id }, metadata: body });
    return stripConnectionSecrets(result);
  });

  app.delete<{ Params: { id: string } }>('/connections/:id', async (request, reply) => {
    const { actorId } = getActor(request);
    const timestamp = nowIso();
    const result = await settingsCollection('connections').updateOne(
      { _id: request.params.id, userId: actorId, removedAt: null },
      { $set: { removedAt: timestamp, status: 'revoked', updatedAt: timestamp } },
    );
    if (!result.matchedCount) return sendError(reply, 404, 'CONNECTION_NOT_FOUND', 'Connection not found');
    await appendAudit({ actorId, action: 'connection.remove', target: { type: 'connection', id: request.params.id } });
    return { ok: true };
  });

  app.post<{ Params: { id: string } }>('/connections/:id/sync', async (request, reply) => {
    const { actorId } = getActor(request);
    const timestamp = nowIso();
    const result = await settingsCollection('connections').findOneAndUpdate(
      { _id: request.params.id, userId: actorId, removedAt: null },
      { $set: { lastSyncAt: timestamp, status: 'connected', error: null, updatedAt: timestamp } },
      { returnDocument: 'after' },
    );
    if (!result) return sendError(reply, 404, 'CONNECTION_NOT_FOUND', 'Connection not found');
    await appendAudit({ actorId, action: 'connection.sync', target: { type: 'connection', id: request.params.id } });
    return stripConnectionSecrets(result);
  });
}
