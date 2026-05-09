import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { ImportHistoryDocument } from '../../db/collections.js';
import {
  appendAudit,
  createRecordId,
  getActor,
  nowIso,
  parseBody,
  requireWorkspaceMember,
  sendError,
  settingsCollection,
} from './helpers.js';

const importCreateSchema = z.object({
  workspaceId: z.string().trim().min(1),
  source: z.string().trim().min(1).max(80).default('upload'),
}).strict();

function multipartField(fields: Record<string, unknown> | undefined, name: string): unknown {
  const field = fields?.[name];
  if (Array.isArray(field)) return multipartField({ value: field[0] }, 'value');
  if (field && typeof field === 'object' && 'value' in field) return (field as { value?: unknown }).value;
  return field;
}

export async function importsRoutes(app: FastifyInstance) {
  app.get('/imports', async (request) => {
    const { actorId } = getActor(request);
    return settingsCollection('import_history').find({ userId: actorId, removedAt: null }).sort({ startedAt: -1 }).toArray();
  });

  app.post('/imports', async (request, reply) => {
    const file = await request.file();
    if (!file) return sendError(reply, 400, 'UPLOAD_REQUIRED', 'Multipart file is required');
    const fields = file.fields as Record<string, unknown> | undefined;
    const body = parseBody(importCreateSchema, {
      workspaceId: multipartField(fields, 'workspaceId'),
      source: multipartField(fields, 'source') ?? 'upload',
    }, reply);
    if (!body) return undefined;
    const { actorId } = getActor(request);
    if (!await requireWorkspaceMember(body.workspaceId, actorId, reply)) return undefined;

    let byteSize = 0;
    for await (const chunk of file.file) {
      byteSize += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk);
    }

    const timestamp = nowIso();
    const entry: ImportHistoryDocument = {
      _id: createRecordId('import'),
      userId: actorId,
      workspaceId: body.workspaceId,
      source: body.source,
      fileName: file.filename,
      byteSize,
      status: 'queued',
      pageIds: [],
      error: null,
      startedAt: timestamp,
      finishedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      removedAt: null,
    };
    await settingsCollection('import_history').insertOne(entry);
    await appendAudit({ actorId, workspaceId: body.workspaceId, action: 'import.create', target: { type: 'import_history', id: entry._id }, metadata: { fileName: file.filename, byteSize } });

    setImmediate(() => {
      const finishedAt = nowIso();
      void settingsCollection('import_history').updateOne(
        { _id: entry._id },
        { $set: { status: 'completed', finishedAt, updatedAt: finishedAt } },
      );
    });

    return reply.code(201).send(entry);
  });

  app.get<{ Params: { id: string } }>('/imports/:id', async (request, reply) => {
    const { actorId } = getActor(request);
    const entry = await settingsCollection('import_history').findOne({ _id: request.params.id, userId: actorId, removedAt: null });
    if (!entry) return sendError(reply, 404, 'IMPORT_NOT_FOUND', 'Import not found');
    return entry;
  });
}
