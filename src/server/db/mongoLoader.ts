/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   mongoLoader.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/03 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 13:58:30 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { mongoFindAll } from './mongoClient';
import { DB_TO_TABLE } from '../ops/types';

/** Invert a field map: { propId → fieldName } → { fieldName → propId } */
function invertMap(fm: Record<string, string>): Record<string, string> {
  const inv: Record<string, string> = {};
  for (const [propId, col] of Object.entries(fm)) {
    if (!(col in inv)) inv[col] = propId;
  }
  return inv;
}

/** Document-level metadata fields that live outside `properties`. */
const META_FIELDS = new Set([
  'icon', 'created_at', 'updated_at', 'created_by', 'last_edited_by',
]);

/** Convert a MongoDB document to a Notion-style page object. */
function docToPage(
  doc: Record<string, unknown>,
  dbId: string,
  invMap: Record<string, string>,
): Record<string, unknown> {
  // MongoDB uses _id instead of id
  const pageId = String(doc._id ?? doc.id);
  const properties: Record<string, unknown> = {};

  for (const [field, val] of Object.entries(doc)) {
    if (field === '_id') continue;
    if (META_FIELDS.has(field)) continue;
    const propId = invMap[field];
    if (!propId) continue;
    properties[propId] = val;
  }

  return {
    id: pageId,
    databaseId: dbId,
    icon: doc.icon ?? null,
    content: [],
    properties,
    createdAt: doc.created_at ? new Date(doc.created_at as string).toISOString() : new Date().toISOString(),
    updatedAt: doc.updated_at ? new Date(doc.updated_at as string).toISOString() : new Date().toISOString(),
    createdBy: (doc.created_by as string) ?? 'System',
    lastEditedBy: (doc.last_edited_by as string) ?? 'System',
  };
}

/** Load all pages from MongoDB.
 *  Returns a pages map { pageId → page } or null if Mongo is unreachable. */
export async function mongoLoadPages(
  fieldMaps: Record<string, Record<string, string>>,
): Promise<Record<string, Record<string, unknown>> | null> {
  const pages: Record<string, Record<string, unknown>> = {};

  for (const [dbId, collection] of Object.entries(DB_TO_TABLE)) {
    const fm = fieldMaps[dbId] ?? {};
    const inv = invertMap(fm);

    const docs = await mongoFindAll(collection);
    if (docs === null) return null; // Mongo unreachable

    for (const doc of docs) {
      const page = docToPage(doc, dbId, inv);
      pages[page.id as string] = page;
    }
  }

  return pages;
}
