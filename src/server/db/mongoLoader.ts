/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   mongoLoader.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 22:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/05 23:05:01 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/** @file mongoLoader.ts — Load pages from a live MongoDB database. */

import { getMongoDb, resolveTableName } from './connections';

type FieldMaps = Record<string, Record<string, string>>;

/** Metadata fields stored at page level, not in properties. */
const META_FIELDS = new Set(['_id', 'icon', 'created_at', 'updated_at', 'created_by', 'last_edited_by']);

/** Coerce MongoDB values to JSON-friendly types (Date → ISO string). */
function coerce(val: unknown): unknown {
  if (val instanceof Date) return val.toISOString();
  return val;
}

/** Fetch all pages from MongoDB collections, keyed by page ID.
 *  Returns null if the database is unreachable. */
export async function mongoLoadPages(
  fieldMaps: FieldMaps,
): Promise<Record<string, Record<string, unknown>> | null> {
  try {
    const db = await getMongoDb();
    const pages: Record<string, Record<string, unknown>> = {};

    for (const [dbId, fieldMap] of Object.entries(fieldMaps)) {
      const collName = resolveTableName(dbId);
      if (!collName) continue;

      // Reverse map: fieldName → propId  (skip 'id' — mapped via _id)
      const reverseMap: Record<string, string> = {};
      for (const [propId, colName] of Object.entries(fieldMap)) {
        if (colName !== 'id') reverseMap[colName] = propId;
      }

      const docs = await db.collection(collName).find({}).toArray();

      for (const doc of docs) {
        const pageId = String(doc._id);
        const properties: Record<string, unknown> = {};

        for (const [field, rawVal] of Object.entries(doc)) {
          if (META_FIELDS.has(field)) continue;
          const propId = reverseMap[field];
          if (propId) properties[propId] = coerce(rawVal);
        }

        pages[pageId] = {
          id: pageId,
          databaseId: dbId,
          icon: doc.icon ?? undefined,
          properties,
          content: [],
          createdAt: coerce(doc.created_at) ?? new Date().toISOString(),
          updatedAt: coerce(doc.updated_at) ?? new Date().toISOString(),
          createdBy: doc.created_by ?? 'System',
          lastEditedBy: doc.last_edited_by ?? 'System',
        };
      }
    }

    return pages;
  } catch (err) {
    console.error('[mongoLoader] Failed to load from MongoDB:', err);
    return null;
  }
}
