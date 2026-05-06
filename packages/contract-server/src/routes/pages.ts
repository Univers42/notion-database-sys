/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   pages.ts                                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/06 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 19:24:13 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { Document, Filter } from 'mongodb';
import type { Page, PageQuery } from '@notion-db/contract-types';
import { assertDatabaseAccess, filterDatabaseIds, canAccessDatabase, type AuthenticatedUser } from '../auth';
import { DB_TO_TABLE } from '../db/connections';
import { emitChange } from '../events/emitter';
import { compileDocFilter, compileSort } from '../filters/docFilter';
import type { OkResponse } from '../serverTypes';
import {
  changesToSet,
  collectionForDatabase,
  documentToPage,
  findPageLocation,
  loadMeta,
  pageToDocument,
} from './pageStorage';

const ANY_OBJECT = { type: 'object', additionalProperties: true } as const;
const PAGE_QUERY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    databaseId: { type: 'string' },
    filter: ANY_OBJECT,
    sort: {
      type: 'array',
      items: {
        type: 'object',
        required: ['propertyId', 'direction'],
        additionalProperties: false,
        properties: {
          propertyId: { type: 'string' },
          direction: { type: 'string', enum: ['asc', 'desc'] },
        },
      },
    },
    limit: { type: 'integer', minimum: 0 },
  },
} as const;

/** Registers page CRUD contract routes. */
export async function registerPageRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: PageQuery }>('/findPages', {
    schema: { body: PAGE_QUERY_SCHEMA },
  }, async (request): Promise<Page[]> => findPages(app, request.body, request.user));

  app.post<{ Body: { id: string } }>('/getPage', {
    schema: {
      body: {
        type: 'object',
        required: ['id'],
        additionalProperties: false,
        properties: { id: { type: 'string' } },
      },
    },
  }, async (request): Promise<Page | null> => getPage(app, request.body.id, request.user));

  app.post<{ Body: { databaseId: string; page: Omit<Page, 'id'> } }>('/insertPage', {
    schema: {
      body: {
        type: 'object',
        required: ['databaseId', 'page'],
        additionalProperties: false,
        properties: { databaseId: { type: 'string' }, page: ANY_OBJECT },
      },
    },
  }, async (request): Promise<Page> => insertPage(app, request.body.databaseId, request.body.page, request.user));

  app.post<{ Body: { id: string; changes: Partial<Page['properties']> } }>('/patchPage', {
    schema: {
      body: {
        type: 'object',
        required: ['id', 'changes'],
        additionalProperties: false,
        properties: { id: { type: 'string' }, changes: ANY_OBJECT },
      },
    },
  }, async (request): Promise<Page> => patchPage(app, request.body.id, request.body.changes, request.user));

  app.post<{ Body: { id: string } }>('/deletePage', {
    schema: {
      body: {
        type: 'object',
        required: ['id'],
        additionalProperties: false,
        properties: { id: { type: 'string' } },
      },
    },
  }, async (request): Promise<OkResponse> => {
    await deletePage(app, request.body.id, request.user);
    return { ok: true };
  });
}

/** Finds pages using MongoDB query, sort, and limit translation. */
export async function findPages(app: FastifyInstance, query: PageQuery, user?: AuthenticatedUser): Promise<Page[]> {
  const db = app.mongo;
  const meta = await loadMeta(db);
  const databaseIds = filterDatabaseIds(user, query.databaseId ? [query.databaseId] : Object.keys(DB_TO_TABLE));
  const pages: Page[] = [];

  for (const databaseId of databaseIds) {
    if (!meta.databases[databaseId]) continue;
    const collection = collectionForDatabase(db, databaseId);
    const fieldMap = meta.fieldMaps[databaseId] ?? {};
    const mongoFilter = compileDocFilter(query.filter, fieldMap);
    const cursor = collection.find(mongoFilter).sort(compileSort(query.sort, fieldMap));
    if (query.limit !== undefined && query.databaseId) cursor.limit(query.limit);
    const docs = await cursor.toArray();
    for (const doc of docs) pages.push(documentToPage(databaseId, doc, fieldMap, meta.databases[databaseId]));
  }

  return query.limit === undefined ? pages : pages.slice(0, query.limit);
}

/** Returns one page by id, or null when absent. */
export async function getPage(app: FastifyInstance, id: string, user?: AuthenticatedUser): Promise<Page | null> {
  const db = app.mongo;
  const meta = await loadMeta(db);
  const location = await findPageLocation(db, id);
  if (!location) return null;
  if (!canAccessDatabase(user, location.databaseId)) return null;
  const doc = await location.collection.findOne({ _id: id } as unknown as Filter<Document>);
  return doc ? documentToPage(
    location.databaseId,
    doc,
    meta.fieldMaps[location.databaseId] ?? {},
    meta.databases[location.databaseId],
  ) : null;
}

/** Inserts one page into the collection mapped by databaseId. */
export async function insertPage(
  app: FastifyInstance,
  databaseId: string,
  page: Omit<Page, 'id'>,
  user?: AuthenticatedUser,
): Promise<Page> {
  assertDatabaseAccess(user, databaseId);
  const db = app.mongo;
  const meta = await loadMeta(db);
  const now = new Date().toISOString();
  const inserted: Page = {
    ...page,
    id: crypto.randomUUID(),
    databaseId,
    content: page.content ?? [],
    createdAt: page.createdAt ?? now,
    updatedAt: page.updatedAt ?? now,
    createdBy: page.createdBy ?? 'Contract Server',
    lastEditedBy: page.lastEditedBy ?? 'Contract Server',
  };
  const fieldMap = meta.fieldMaps[databaseId] ?? {};
  await collectionForDatabase(db, databaseId).insertOne(pageToDocument(inserted, fieldMap));
  emitChange({ type: 'page-inserted', page: inserted });
  return inserted;
}

/** Patches page properties and returns the updated page. */
export async function patchPage(
  app: FastifyInstance,
  id: string,
  changes: Partial<Page['properties']>,
  user?: AuthenticatedUser,
): Promise<Page> {
  const db = app.mongo;
  const meta = await loadMeta(db);
  const location = await findPageLocation(db, id);
  if (!location) throw new Error(`Page ${id} not found`);
  assertDatabaseAccess(user, location.databaseId);
  const fieldMap = meta.fieldMaps[location.databaseId] ?? {};
  await location.collection.updateOne({ _id: id } as unknown as Filter<Document>, { $set: changesToSet(changes, fieldMap) });
  const updated = await location.collection.findOne({ _id: id } as unknown as Filter<Document>);
  if (!updated) throw new Error(`Page ${id} not found after patch`);
  emitChange({ type: 'page-changed', pageId: id, databaseId: location.databaseId, changes });
  return documentToPage(location.databaseId, updated, fieldMap, meta.databases[location.databaseId]);
}

/** Deletes one page by id. */
export async function deletePage(app: FastifyInstance, id: string, user?: AuthenticatedUser): Promise<void> {
  const db = app.mongo;
  const location = await findPageLocation(db, id);
  if (location) {
    assertDatabaseAccess(user, location.databaseId);
    await location.collection.deleteOne({ _id: id } as unknown as Filter<Document>);
    emitChange({ type: 'page-deleted', pageId: id, databaseId: location.databaseId });
  }
}
