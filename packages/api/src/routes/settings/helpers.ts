import type { FastifyReply, FastifyRequest } from 'fastify';
import { createCipheriv, createHash, randomBytes, randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { z, type ZodType } from 'zod';
import {
  COLLECTION_DEFINITIONS,
  CONNECTION_SECRET_FIELDS,
  type AuditLogDocument,
  type CollectionDocument,
  type CollectionKey,
  type ConnectionDocument,
  type EncryptedSecret,
  type WorkspaceMemberDocument,
  type WorkspaceMemberRole,
} from '../../db/collections.js';

export const workspaceRoleSchema = z.enum(['owner', 'admin', 'member', 'guest']);
export const looseRecordSchema = z.record(z.string(), z.unknown());

export interface ActorContext {
  actorId: string;
  email: string;
}

export interface AuditInput {
  actorId: string;
  workspaceId?: string;
  action: string;
  target: { type: string; id?: string };
  metadata?: Record<string, unknown>;
}

type MongoCollection<TKey extends CollectionKey> = mongoose.mongo.Collection<CollectionDocument<TKey>>;
type FlexibleMongoDocument = Record<string, unknown> & { _id?: string | mongoose.Types.ObjectId };

export function nowIso(): string {
  return new Date().toISOString();
}

export function createRecordId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

export function getActor(request: FastifyRequest): ActorContext {
  return { actorId: request.user.sub, email: request.user.email };
}

export function sendError(
  reply: FastifyReply,
  statusCode: number,
  code: string,
  error: string,
  details?: unknown,
) {
  return reply.code(statusCode).send({ error, code, ...(details === undefined ? {} : { details }) });
}

export function parseBody<TSchema extends ZodType>(
  schema: TSchema,
  body: unknown,
  reply: FastifyReply,
): z.infer<TSchema> | undefined {
  const parsed = schema.safeParse(body ?? {});
  if (!parsed.success) {
    sendError(reply, 400, 'VALIDATION_FAILED', 'Invalid request body', parsed.error.issues);
    return undefined;
  }
  return parsed.data;
}

export function getDb() {
  const db = mongoose.connection.db;
  if (!db) throw new Error('MongoDB connection is not ready.');
  return db;
}

export function settingsCollection<TKey extends CollectionKey>(key: TKey): MongoCollection<TKey> {
  return getDb().collection<CollectionDocument<TKey>>(COLLECTION_DEFINITIONS[key].name);
}

export function rawCollection<TDocument extends object = FlexibleMongoDocument>(name: string) {
  return getDb().collection<TDocument>(name);
}

export function objectIdOrNull(id: string): mongoose.Types.ObjectId | null {
  return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null;
}

export function idSelector(id: string) {
  const objectId = objectIdOrNull(id);
  return objectId ? { $in: [id, objectId] } : id;
}

export function documentSelector(id: string): mongoose.mongo.Filter<FlexibleMongoDocument> {
  const objectId = objectIdOrNull(id);
  return objectId ? { $or: [{ _id: id }, { _id: objectId }] } : { _id: id };
}

export function toPublicId(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (value && typeof value === 'object') {
    const maybeObjectId = value as { toHexString?: () => string; _id?: unknown };
    if (typeof maybeObjectId.toHexString === 'function') return maybeObjectId.toHexString();
    if (maybeObjectId._id !== undefined) return toPublicId(maybeObjectId._id);
  }
  return '';
}

export function assertIdParam(reply: FastifyReply, id: string, label = 'ID'): boolean {
  if (id.trim()) return true;
  sendError(reply, 400, 'INVALID_ID', `Invalid ${label}`);
  return false;
}

export async function appendAudit(input: AuditInput) {
  const entry: AuditLogDocument = {
    _id: createRecordId('audit'),
    actorId: input.actorId,
    workspaceId: input.workspaceId,
    action: input.action,
    target: input.target,
    metadata: input.metadata ?? {},
    createdAt: nowIso(),
  };
  await settingsCollection('audit_log').insertOne(entry);
}

export async function findWorkspaceMember(workspaceId: string, userId: string) {
  return settingsCollection('workspace_members').findOne({ workspaceId, userId, removedAt: null });
}

export async function requireWorkspaceMember(workspaceId: string, userId: string, reply: FastifyReply) {
  if (!assertIdParam(reply, workspaceId, 'workspace ID')) return undefined;
  const member = await findWorkspaceMember(workspaceId, userId);
  if (!member) {
    sendError(reply, 404, 'WORKSPACE_NOT_FOUND', 'Workspace not found');
    return undefined;
  }
  return member;
}

export async function requireWorkspaceRole(
  workspaceId: string,
  userId: string,
  allowedRoles: WorkspaceMemberRole[],
  reply: FastifyReply,
): Promise<WorkspaceMemberDocument | undefined> {
  const member = await requireWorkspaceMember(workspaceId, userId, reply);
  if (!member) return undefined;
  if (!allowedRoles.includes(member.role)) {
    sendError(reply, 403, 'FORBIDDEN', 'Forbidden');
    return undefined;
  }
  return member;
}

function encryptionKey(): Buffer {
  const configured = process.env.BRIDGE_ENCRYPTION_KEY;
  if (!configured) throw new Error('BRIDGE_ENCRYPTION_KEY is required to encrypt connection tokens.');

  const hex = /^[a-f0-9]{64}$/i.test(configured) ? Buffer.from(configured, 'hex') : null;
  if (hex?.length === 32) return hex;

  const base64 = Buffer.from(configured, 'base64');
  if (base64.length === 32 && base64.toString('base64').replace(/=+$/, '') === configured.replace(/=+$/, '')) {
    return base64;
  }

  const utf8 = Buffer.from(configured, 'utf8');
  return utf8.length === 32 ? utf8 : createHash('sha256').update(utf8).digest();
}

export function encryptSecret(secret: string): EncryptedSecret {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return {
    algorithm: 'aes-256-gcm',
    iv: iv.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
  };
}

export function stripConnectionSecrets(connection: ConnectionDocument): Omit<ConnectionDocument, 'accessTokenEnc' | 'refreshTokenEnc'> {
  const copy = { ...connection };
  for (const field of CONNECTION_SECRET_FIELDS) {
    delete copy[field];
  }
  return copy;
}

export function activeFilter<T extends Record<string, unknown>>(filter: T): T & { removedAt: null } {
  return { ...filter, removedAt: null };
}

export function revokedFilter<T extends Record<string, unknown>>(filter: T): T & { revokedAt: null } {
  return { ...filter, revokedAt: null };
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function csvEscape(value: unknown): string {
  let text = '';
  if (typeof value === 'string') text = value;
  else if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') text = String(value);
  else if (typeof value === 'symbol') text = value.description ?? '';
  else if (typeof value === 'function') text = value.name;
  else if (value !== null && value !== undefined) text = JSON.stringify(value) ?? '';
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
