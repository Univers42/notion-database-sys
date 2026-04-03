/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   pgLoader.ts                                        :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/03 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 13:58:30 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { pgQueryRows } from './pgPool';
import { DB_TO_TABLE } from '../ops/types';

/** Invert a field map: { propId → colName } → { colName → propId } */
function invertMap(fm: Record<string, string>): Record<string, string> {
  const inv: Record<string, string> = {};
  for (const [propId, col] of Object.entries(fm)) {
    if (!(col in inv)) inv[col] = propId;
  }
  return inv;
}

/** Columns that live outside `properties` (metadata + primary key). */
const META_COLS = new Set([
  'id', 'icon', 'created_at', 'updated_at', 'created_by', 'last_edited_by',
]);

/** Convert a PG row to a Notion-style page object. */
function rowToPage(
  row: Record<string, unknown>,
  dbId: string,
  invMap: Record<string, string>,
): Record<string, unknown> {
  const pageId = String(row.id);
  const properties: Record<string, unknown> = {};

  for (const [col, val] of Object.entries(row)) {
    if (META_COLS.has(col)) continue;
    const propId = invMap[col];
    if (!propId) continue;
    // PG arrays come as JS arrays already via pg driver
    properties[propId] = val;
  }

  return {
    id: pageId,
    databaseId: dbId,
    icon: row.icon ?? null,
    content: [],
    properties,
    createdAt: row.created_at ? new Date(row.created_at as string).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at as string).toISOString() : new Date().toISOString(),
    createdBy: (row.created_by as string) ?? 'System',
    lastEditedBy: (row.last_edited_by as string) ?? 'System',
  };
}

/** Load all pages from PostgreSQL.
 *  Returns a pages map { pageId → page } or null if PG is unreachable. */
export async function pgLoadPages(
  fieldMaps: Record<string, Record<string, string>>,
): Promise<Record<string, Record<string, unknown>> | null> {
  const pages: Record<string, Record<string, unknown>> = {};

  for (const [dbId, table] of Object.entries(DB_TO_TABLE)) {
    const fm = fieldMaps[dbId] ?? {};
    const inv = invertMap(fm);

    const rows = await pgQueryRows(`SELECT * FROM "${table}"`);
    if (rows === null) return null; // PG unreachable

    for (const row of rows) {
      const page = rowToPage(row, dbId, inv);
      pages[page.id as string] = page;
    }
  }

  return pages;
}
