/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   pages.ts                                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/06 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 18:13:14 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { Document, Filter } from 'mongodb';
import { DB_TO_TABLE } from '../db/connections';
import { compileDocFilter, compileSort } from '../filters/docFilter';
import type { OkResponse, Page, PageQuery } from '../types';
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
  }, async (request): Promise<Page[]> => findPages(app, request.body));

  app.post<{ Body: { id: string } }>('/getPage', {
    schema: {
      body: {
        type: 'object',
        required: ['id'],
        additionalProperties: false,
        properties: { id: { type: 'string' } },
      },
    },
  }, async (request): Promise<Page | null> => getPage(app, request.body.id));

  app.post<{ Body: { databaseId: string; page: Omit<Page, 'id'> } }>('/insertPage', {
    schema: {
      body: {
        type: 'object',
        required: ['databaseId', 'page'],
        additionalProperties: false,
        properties: { databaseId: { type: 'string' }, page: ANY_OBJECT },
      },
    },
  }, async (request): Promise<Page> => insertPage(app, request.body.databaseId, request.body.page));

  app.post<{ Body: { id: string; changes: Partial<Page['properties']> } }>('/patchPage', {
    schema: {
      body: {
        type: 'object',
        required: ['id', 'changes'],
        additionalProperties: false,
        properties: { id: { type: 'string' }, changes: ANY_OBJECT },
      },
    },
  }, async (request): Promise<Page> => patchPage(app, request.body.id, request.body.changes));

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
    await deletePage(app, request.body.id);
    return { ok: true };
  });
}

/** Finds pages using MongoDB query, sort, and limit translation. */
export async function findPages(app: FastifyInstance, query: PageQuery): Promise<Page[]> {
  const db = app.mongo;
  const meta = await loadMeta(db);
  const databaseIds = query.databaseId ? [query.databaseId] : Object.keys(DB_TO_TABLE);
  const pages: Page[] = [];

  for (const databaseId of databaseIds) {
    if (!meta.databases[databaseId]) continue;
    const collection = collectionForDatabase(db, databaseId);
    const fieldMap = meta.fieldMaps[databaseId] ?? {};
    const mongoFilter = compileDocFilter(query.filter, fieldMap) as Filter<Document>;
    const cursor = collection.find(mongoFilter).sort(compileSort(query.sort, fieldMap));
    if (query.limit !== undefined && query.databaseId) cursor.limit(query.limit);
    const docs = await cursor.toArray();
    for (const doc of docs) pages.push(documentToPage(databaseId, doc, fieldMap));
  }

  return query.limit === undefined ? pages : pages.slice(0, query.limit);
}

/** Returns one page by id, or null when absent. */
export async function getPage(app: FastifyInstance, id: string): Promise<Page | null> {
  const db = app.mongo;
  const meta = await loadMeta(db);
  const location = await findPageLocation(db, id);
  if (!location) return null;
  const doc = await location.collection.findOne({ _id: id } as unknown as Filter<Document>);
  return doc ? documentToPage(location.databaseId, doc, meta.fieldMaps[location.databaseId] ?? {}) : null;
}

/** Inserts one page into the collection mapped by databaseId. */
export async function insertPage(app: FastifyInstance, databaseId: string, page: Omit<Page, 'id'>): Promise<Page> {
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
  return inserted;
}

/** Patches page properties and returns the updated page. */
export async function patchPage(app: FastifyInstance, id: string, changes: Partial<Page['properties']>): Promise<Page> {
  const db = app.mongo;
  const meta = await loadMeta(db);
  const location = await findPageLocation(db, id);
  if (!location) throw new Error(`Page ${id} not found`);
  const fieldMap = meta.fieldMaps[location.databaseId] ?? {};
  await location.collection.updateOne({ _id: id } as unknown as Filter<Document>, { $set: changesToSet(changes, fieldMap) });
  const updated = await location.collection.findOne({ _id: id } as unknown as Filter<Document>);
  if (!updated) throw new Error(`Page ${id} not found after patch`);
  return documentToPage(location.databaseId, updated, fieldMap);
}

/** Deletes one page by id. */
export async function deletePage(app: FastifyInstance, id: string): Promise<void> {
  const db = app.mongo;
  const location = await findPageLocation(db, id);
  if (location) await location.collection.deleteOne({ _id: id } as unknown as Filter<Document>);
}
