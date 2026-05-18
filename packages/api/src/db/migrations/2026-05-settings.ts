/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   2026-05-settings.ts                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/18 21:19:17 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/18 21:19:17 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '@notion-db/core';
import {
  COLLECTION_DEFINITIONS,
  SETTINGS_COLLECTION_KEYS,
  type CollectionDefinition,
  type CollectionIndexSpec,
  type CollectionKey,
  type WorkspaceMemberRole,
} from '../collections.js';

interface MigrationLogger {
  info: (message: string) => void;
  warn: (message: string) => void;
  error?: (message: string) => void;
}

interface CollectionListCursor {
  toArray: () => Promise<Array<{ name: string }>>;
}

interface FindCursor<TDocument> {
  toArray: () => Promise<TDocument[]>;
}

interface MongoCollection<TDocument extends object = Record<string, unknown>> {
  createIndex: (keys: CollectionIndexSpec['keys'], options?: CollectionIndexSpec['options']) => Promise<string>;
  find: (filter?: Record<string, unknown>, options?: Record<string, unknown>) => FindCursor<TDocument>;
  updateOne: (
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
    options?: Record<string, unknown>,
  ) => Promise<{ upsertedCount?: number; modifiedCount?: number; matchedCount?: number }>;
}

interface MongoDatabase {
  listCollections: (filter?: Record<string, unknown>, options?: Record<string, unknown>) => CollectionListCursor;
  createCollection: (name: string) => Promise<unknown>;
  collection: <TDocument extends object = Record<string, unknown>>(name: string) => MongoCollection<TDocument>;
}

interface LegacyWorkspace {
  _id?: unknown;
  ownerId?: unknown;
  name?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

interface LegacyMembership {
  _id?: unknown;
  workspaceId?: unknown;
  userId?: unknown;
  role?: unknown;
  invitedBy?: unknown;
  joinedAt?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

const LEGACY_MEMBERSHIP_COLLECTION = 'workspacemembers';

function asDb(value: unknown): MongoDatabase {
  return value as MongoDatabase;
}

function nowIso(): string {
  return new Date().toISOString();
}

function toId(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    const record = value as { _id?: unknown; toHexString?: () => string };
    if (typeof record.toHexString === 'function') return record.toHexString();
    if (record._id !== undefined) return toId(record._id);
  }
  return null;
}

function toIso(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.trim()) return value;
  if (value instanceof Date) return value.toISOString();
  return fallback;
}

function normalizeRole(value: unknown): WorkspaceMemberRole {
  return value === 'owner' || value === 'admin' || value === 'member' || value === 'guest'
    ? value
    : 'member';
}

async function collectionExists(db: MongoDatabase, name: string): Promise<boolean> {
  const matches = await db.listCollections({ name }, { nameOnly: true }).toArray();
  return matches.length > 0;
}

async function ensureCollection(db: MongoDatabase, definition: CollectionDefinition<CollectionKey>, logger: MigrationLogger) {
  if (await collectionExists(db, definition.name)) {
    logger.info(`[settings-migration] collection exists: ${definition.name}`);
    return;
  }

  await db.createCollection(definition.name);
  logger.info(`[settings-migration] created collection: ${definition.name}`);
}

async function ensureIndexes(db: MongoDatabase, definition: CollectionDefinition<CollectionKey>, logger: MigrationLogger) {
  const collection = db.collection(definition.name);
  for (const index of definition.indexes) {
    await collection.createIndex(index.keys, index.options);
    logger.info(`[settings-migration] ensured index ${index.options?.name ?? JSON.stringify(index.keys)} on ${definition.name}`);
  }
}

async function upsertWorkspaceMember(
  db: MongoDatabase,
  member: Pick<LegacyMembership, 'workspaceId' | 'userId' | 'role' | 'invitedBy' | 'joinedAt' | 'createdAt' | 'updatedAt'>,
  logger: MigrationLogger,
) {
  const workspaceId = toId(member.workspaceId);
  const userId = toId(member.userId);
  if (!workspaceId || !userId) return;

  const timestamp = nowIso();
  const joinedAt = toIso(member.joinedAt, timestamp);
  const createdAt = toIso(member.createdAt, joinedAt);
  const updatedAt = toIso(member.updatedAt, timestamp);
  const invitedBy = toId(member.invitedBy);
  const update: Record<string, unknown> = {
    $setOnInsert: {
      _id: `wm_${workspaceId}_${userId}`,
      workspaceId,
      userId,
      joinedAt,
      createdAt,
    },
    $set: {
      role: normalizeRole(member.role),
      updatedAt,
      removedAt: null,
    },
  };
  if (invitedBy) {
    update.$set = { ...(update.$set as Record<string, unknown>), invitedBy };
  }

  await db.collection('workspace_members').updateOne(
    { workspaceId, userId },
    update,
    { upsert: true },
  );
  logger.info(`[settings-migration] ensured owner/member ${userId} in workspace ${workspaceId}`);
}

async function backfillLegacyMemberships(db: MongoDatabase, logger: MigrationLogger) {
  if (!(await collectionExists(db, LEGACY_MEMBERSHIP_COLLECTION))) {
    logger.info('[settings-migration] no legacy workspacemembers collection to backfill');
    return;
  }

  const legacyMembers = await db.collection<LegacyMembership>(LEGACY_MEMBERSHIP_COLLECTION).find({}).toArray();
  logger.info(`[settings-migration] backfilling ${legacyMembers.length} legacy membership rows`);
  for (const member of legacyMembers) {
    await upsertWorkspaceMember(db, member, logger);
  }
}

async function backfillWorkspaceOwners(db: MongoDatabase, logger: MigrationLogger) {
  if (!(await collectionExists(db, 'workspaces'))) {
    logger.info('[settings-migration] no workspaces collection to backfill owners from');
    return;
  }

  const workspaces = await db.collection<LegacyWorkspace>('workspaces')
    .find({ ownerId: { $exists: true, $ne: null } }, { projection: { _id: 1, ownerId: 1, createdAt: 1, updatedAt: 1 } })
    .toArray();
  logger.info(`[settings-migration] backfilling owners for ${workspaces.length} workspaces`);

  for (const workspace of workspaces) {
    await upsertWorkspaceMember(db, {
      workspaceId: workspace._id,
      userId: workspace.ownerId,
      role: 'owner',
      joinedAt: workspace.createdAt,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
    }, logger);
  }
}

export async function migrateSettingsCollections(
  db: MongoDatabase = asDb(mongoose.connection.db),
  logger: MigrationLogger = console,
) {
  logger.info('[settings-migration] starting settings collection migration');

  for (const key of SETTINGS_COLLECTION_KEYS) {
    const definition = COLLECTION_DEFINITIONS[key];
    await ensureCollection(db, definition, logger);
    await ensureIndexes(db, definition, logger);
  }

  await backfillLegacyMemberships(db, logger);
  await backfillWorkspaceOwners(db, logger);

  logger.info('[settings-migration] completed settings collection migration');
}

export async function runSettingsCollectionsMigration(logger: MigrationLogger = console) {
  const mongoUri = process.env.MONGO_URI ?? 'mongodb://localhost:27017/notion_db';
  await connectDatabase({ uri: mongoUri, dbName: process.env.MONGO_DB });
  const db = mongoose.connection.db;
  if (!db) throw new Error('MongoDB connection is not ready.');
  await migrateSettingsCollections(asDb(db), logger);
}

if (process.argv[1]?.endsWith('2026-05-settings.ts') || process.argv[1]?.endsWith('2026-05-settings.js')) {
  try {
    await runSettingsCollectionsMigration();
    await disconnectDatabase();
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : error);
    await disconnectDatabase();
    process.exitCode = 1;
  }
}
