/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   state.ts                                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/06 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 18:13:14 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { FastifyInstance } from 'fastify';
import { DB_TO_TABLE } from '../db/connections';
import type { NotionState, Page } from '../types';
import { documentToPage, loadMeta } from './pageStorage';

/** Registers state bootstrap contract routes. */
export async function registerStateRoutes(app: FastifyInstance): Promise<void> {
  app.post('/loadState', {
    schema: {
      body: { type: 'object', additionalProperties: false },
    },
  }, async (): Promise<NotionState> => loadState(app));
}

/** Loads databases, pages, and views from MongoDB. */
export async function loadState(app: FastifyInstance): Promise<NotionState> {
  const db = app.mongo;
  const meta = await loadMeta(db);
  const pages: Record<string, Page> = {};

  for (const [databaseId, collectionName] of Object.entries(DB_TO_TABLE)) {
    if (!meta.databases[databaseId]) continue;
    const fieldMap = meta.fieldMaps[databaseId] ?? {};
    const docs = await db.collection(collectionName).find({}).toArray();
    for (const doc of docs) {
      const page = documentToPage(databaseId, doc, fieldMap);
      pages[page.id] = page;
    }
  }

  return {
    databases: meta.databases,
    pages,
    views: meta.views,
  };
}
