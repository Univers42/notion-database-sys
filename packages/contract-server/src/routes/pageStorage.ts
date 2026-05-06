/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   pageStorage.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/06 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 18:48:28 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { Collection, Db, Document, Filter, WithId } from 'mongodb';
import type { Block, Page } from '@notion-db/contract-types';
import { DB_TO_TABLE, resolveTableName } from '../db/connections';
import type { MetaState } from '../serverTypes';

const META_FIELDS = new Set([
  '_id', 'id', 'databaseId', 'properties', 'content', 'icon', 'cover', 'archived', 'parentPageId',
  'created_at', 'updated_at', 'created_by', 'last_edited_by',
  'createdAt', 'updatedAt', 'createdBy', 'lastEditedBy',
]);

/** Loads the meta state document from MongoDB. */
export async function loadMeta(db: Db): Promise<MetaState> {
  const meta = await db.collection<MetaState>('_meta').findOne({ _id: 'notion-state' });
  if (!meta) {
    throw new Error('Missing _meta.notion-state. Run `pnpm --filter @notion-db/contract-server seed`.');
  }
  return meta;
}

/** Returns the Mongo collection for a Notion database id. */
export function collectionForDatabase(db: Db, databaseId: string): Collection<Document> {
  const collectionName = resolveTableName(databaseId);
  if (!collectionName) throw new Error(`Unknown databaseId: ${databaseId}`);
  return db.collection(collectionName);
}

/** Maps a MongoDB document to the contract Page shape. */
export function documentToPage(
  databaseId: string,
  doc: WithId<Document> | Document,
  fieldMap: Record<string, string> = {},
): Page {
  if (doc.properties && typeof doc.properties === 'object') {
    return normalizePageDocument(databaseId, doc);
  }

  const reverseMap: Record<string, string> = {};
  for (const [propertyId, fieldName] of Object.entries(fieldMap)) {
    if (fieldName !== 'id') reverseMap[fieldName] = propertyId;
  }

  const properties: Record<string, unknown> = {};
  for (const [field, rawValue] of Object.entries(doc)) {
    if (META_FIELDS.has(field)) continue;
    const propertyId = reverseMap[field];
    if (propertyId) properties[propertyId] = coerceValue(rawValue);
  }

  const now = new Date().toISOString();
  return {
    id: String(doc._id ?? doc.id),
    databaseId,
    icon: typeof doc.icon === 'string' ? doc.icon : undefined,
    cover: typeof doc.cover === 'string' ? doc.cover : undefined,
    properties,
    content: Array.isArray(doc.content) ? doc.content as Block[] : [],
    createdAt: String(coerceValue(doc.created_at ?? doc.createdAt ?? now)),
    updatedAt: String(coerceValue(doc.updated_at ?? doc.updatedAt ?? now)),
    createdBy: String(doc.created_by ?? doc.createdBy ?? 'System'),
    lastEditedBy: String(doc.last_edited_by ?? doc.lastEditedBy ?? 'System'),
    archived: typeof doc.archived === 'boolean' ? doc.archived : undefined,
    parentPageId: typeof doc.parentPageId === 'string' ? doc.parentPageId : undefined,
  };
}

/** Maps a contract Page to a MongoDB document. */
export function pageToDocument(page: Page, fieldMap: Record<string, string> = {}): Document {
  const doc: Document = {
    _id: page.id,
    icon: page.icon,
    cover: page.cover,
    created_at: page.createdAt,
    updated_at: page.updatedAt,
    created_by: page.createdBy,
    last_edited_by: page.lastEditedBy,
  };

  for (const [propertyId, value] of Object.entries(page.properties)) {
    doc[fieldMap[propertyId] ?? `properties.${propertyId}`] = value;
  }

  return doc;
}

/** Converts property changes into a MongoDB $set document. */
export function changesToSet(changes: Partial<Page['properties']>, fieldMap: Record<string, string> = {}): Document {
  const set: Document = { updated_at: new Date().toISOString(), last_edited_by: 'Contract Server' };
  for (const [propertyId, value] of Object.entries(changes)) {
    set[fieldMap[propertyId] ?? `properties.${propertyId}`] = value;
  }
  return set;
}

/** Finds the collection and database id that contains a page id. */
export async function findPageLocation(
  db: Db,
  pageId: string,
  databaseId?: string,
): Promise<{ databaseId: string; collection: Collection<Document> } | null> {
  const candidates = databaseId ? [databaseId] : Object.keys(DB_TO_TABLE);
  for (const candidate of candidates) {
    const collection = collectionForDatabase(db, candidate);
    const match = await collection.findOne({ _id: pageId } as unknown as Filter<Document>, { projection: { _id: 1 } });
    if (match) return { databaseId: candidate, collection };
  }
  return null;
}

function normalizePageDocument(databaseId: string, doc: Document): Page {
  const now = new Date().toISOString();
  return {
    id: String(doc._id ?? doc.id),
    databaseId: String(doc.databaseId ?? databaseId),
    icon: typeof doc.icon === 'string' ? doc.icon : undefined,
    cover: typeof doc.cover === 'string' ? doc.cover : undefined,
    properties: { ...(doc.properties as Record<string, unknown>) },
    content: Array.isArray(doc.content) ? doc.content as Block[] : [],
    createdAt: String(coerceValue(doc.createdAt ?? doc.created_at ?? now)),
    updatedAt: String(coerceValue(doc.updatedAt ?? doc.updated_at ?? now)),
    createdBy: String(doc.createdBy ?? doc.created_by ?? 'System'),
    lastEditedBy: String(doc.lastEditedBy ?? doc.last_edited_by ?? 'System'),
    archived: typeof doc.archived === 'boolean' ? doc.archived : undefined,
    parentPageId: typeof doc.parentPageId === 'string' ? doc.parentPageId : undefined,
  };
}

function coerceValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  return value;
}
