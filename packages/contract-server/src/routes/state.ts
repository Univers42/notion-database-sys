/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   state.ts                                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/06 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 19:24:12 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { FastifyInstance } from 'fastify';
import type { NotionState, Page } from '@notion-db/contract-types';
import { filterDatabaseIds, type AuthenticatedUser } from '../auth';
import { DB_TO_TABLE } from '../db/connections';
import { documentToPage, loadMeta } from './pageStorage';

/** Registers state bootstrap contract routes. */
export async function registerStateRoutes(app: FastifyInstance): Promise<void> {
  app.post('/loadState', {
    schema: {
      body: { type: 'object', additionalProperties: false },
    },
  }, async (request): Promise<NotionState> => loadState(app, request.user));
}

/** Loads databases, pages, and views from MongoDB. */
export async function loadState(app: FastifyInstance, user?: AuthenticatedUser): Promise<NotionState> {
  const db = app.mongo;
  const meta = await loadMeta(db);
  const pages: Record<string, Page> = {};
  const databaseIds = filterDatabaseIds(user, Object.keys(DB_TO_TABLE));

  for (const [databaseId, collectionName] of Object.entries(DB_TO_TABLE)) {
    if (!databaseIds.includes(databaseId)) continue;
    if (!meta.databases[databaseId]) continue;
    const fieldMap = meta.fieldMaps[databaseId] ?? {};
    const docs = await db.collection(collectionName).find({}).toArray();
    for (const doc of docs) {
      const page = documentToPage(databaseId, doc, fieldMap);
      pages[page.id] = page;
    }
  }

  return {
    databases: Object.fromEntries(
      Object.entries(meta.databases).filter(([databaseId]) => databaseIds.includes(databaseId)),
    ),
    pages,
    views: Object.fromEntries(
      Object.entries(meta.views).filter(([, view]) => databaseIds.includes(view.databaseId)),
    ),
  };
}
