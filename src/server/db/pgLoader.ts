/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   pgLoader.ts                                        :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 22:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/05 23:05:01 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/** @file pgLoader.ts — Load pages from a live PostgreSQL database. */

import { getPgPool, resolveTableName } from './connections';
import { sqlId } from '../ops/helpers';

type FieldMaps = Record<string, Record<string, string>>;

/** Metadata columns stored at page level, not in properties. */
const META_COLS = new Set(['id', 'icon', 'created_at', 'updated_at', 'created_by', 'last_edited_by']);

/** Coerce PG values to JSON-friendly types (Date → ISO string). */
function coerce(val: unknown): unknown {
  if (val instanceof Date) return val.toISOString();
  return val;
}

/** Fetch all pages from PostgreSQL tables, keyed by page ID.
 *  Returns null if the database is unreachable. */
export async function pgLoadPages(
  fieldMaps: FieldMaps,
): Promise<Record<string, Record<string, unknown>> | null> {
  const pool = getPgPool();
  const pages: Record<string, Record<string, unknown>> = {};

  try {
    for (const [dbId, fieldMap] of Object.entries(fieldMaps)) {
      const table = resolveTableName(dbId);
      if (!table) continue;

      // Reverse map: columnName → propId  (skip 'id' — used as page key only)
      const reverseMap: Record<string, string> = {};
      for (const [propId, colName] of Object.entries(fieldMap)) {
        if (colName !== 'id') reverseMap[colName] = propId;
      }

      const { rows } = await pool.query(`SELECT * FROM ${sqlId(table)}`);

      for (const row of rows) {
        const pageId = String(row.id);
        const properties: Record<string, unknown> = {};

        for (const [col, rawVal] of Object.entries(row)) {
          if (META_COLS.has(col)) continue;
          const propId = reverseMap[col];
          if (propId) properties[propId] = coerce(rawVal);
        }

        pages[pageId] = {
          id: pageId,
          databaseId: dbId,
          icon: row.icon ?? undefined,
          properties,
          content: [],
          createdAt: coerce(row.created_at) ?? new Date().toISOString(),
          updatedAt: coerce(row.updated_at) ?? new Date().toISOString(),
          createdBy: row.created_by ?? 'System',
          lastEditedBy: row.last_edited_by ?? 'System',
        };
      }
    }

    return pages;
  } catch (err) {
    console.error('[pgLoader] Failed to load from PostgreSQL:', err);
    return null;
  }
}
