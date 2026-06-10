/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   liveStateBuilder.ts                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/09 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/09 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * (schema, rowsByTable) → NotionState for live mounts, mirroring the structure
 * workspaceDatabaseLoad synthesizes: one Database per table (id =
 * `baas:<dbId>:<table>`, humanized name), pages keyed
 * `baas:<dbId>:<table>:<pk>` (pk from primary_key columns; mongo `_id`),
 * one default table view per database + a board view when an enum column
 * exists (grouped by the first select property). App-registered table
 * presets (liveViewPresets) can upgrade text columns to select, derive a
 * place property, and contribute curated views. Tables that the primary
 * table references arrive as schema-only databases (no rows) so relation
 * properties can resolve names lazily (`getPage` on demand).
 */

import type { DatabaseSchema, NotionState, Page, ViewConfig } from '../../component/types';
import { humanizeName, mapLiveTable } from './liveSchemaMapper';
import { decodeLiveValue, toDisplayString } from './liveValueCodec';
import {
  applyLivePresetProperties,
  buildLivePresetViews,
  decodeLivePlaceValue,
  LIVE_PLACE_PROPERTY_ID,
} from './liveViewPresets';
import {
  formatLiveDatabaseId,
  formatLivePageId,
  parseLiveDatabaseId,
  type LiveMountRef,
  type LiveSchemaResponse,
  type LiveTableSchema,
} from './liveTypes';

/** Deterministic fallback when a row has no parseable timestamp column. */
export const LIVE_EPOCH_ISO = '1970-01-01T00:00:00.000Z';
const LIVE_EDITOR = 'live';

function rowTimestamp(row: Record<string, unknown>, names: string[]): string {
  for (const name of names) {
    const raw = row[name];
    if (typeof raw === 'string' && !Number.isNaN(Date.parse(raw))) return raw;
  }
  return LIVE_EPOCH_ISO;
}

/** One mounted table → one notion DatabaseSchema (`rows`, when available,
 *  feed the preset select-option synthesis — see liveViewPresets). */
export function buildLiveDatabase(
  table: LiveTableSchema,
  ref: LiveMountRef,
  rows: Record<string, unknown>[] = [],
): DatabaseSchema {
  const { properties, titlePropertyId } = mapLiveTable(table, ref.dbId);
  applyLivePresetProperties(properties, ref, rows);
  return {
    id: formatLiveDatabaseId(ref),
    name: humanizeName(table.name),
    icon: '🛢️',
    description: `Live ${table.name} table (edits sync through the BaaS outbox).`,
    properties,
    titlePropertyId,
  };
}

/** Default table view, then either the preset's curated views or the
 *  synthesized board view (grouped by the first select property). */
export function buildLiveViews(database: DatabaseSchema): Record<string, ViewConfig> {
  const visibleProperties = Object.keys(database.properties)
    .filter((propertyId) => propertyId !== database.titlePropertyId);
  const views: ViewConfig[] = [{
    id: `${database.id}#table`,
    databaseId: database.id,
    name: 'Table',
    type: 'table',
    filters: [],
    filterConjunction: 'and',
    sorts: [],
    visibleProperties,
    settings: { showRowNumbers: true, openPagesIn: 'side_peek' },
  }];
  const ref = parseLiveDatabaseId(database.id);
  const presetViews = ref ? buildLivePresetViews(database, ref) : [];
  const groupProperty = Object.values(database.properties)
    .find((property) => property.type === 'select');
  if (presetViews.length > 0) {
    views.push(...presetViews); // curated set replaces the synthesized board
  } else if (groupProperty) {
    views.push({
      id: `${database.id}#board`,
      databaseId: database.id,
      name: 'Board',
      type: 'board',
      filters: [],
      filterConjunction: 'and',
      sorts: [],
      grouping: { propertyId: groupProperty.id },
      visibleProperties,
      settings: { openPagesIn: 'side_peek' },
    });
  }
  return Object.fromEntries(views.map((view) => [view.id, view]));
}

/** One engine row → one notion Page (id = live page id from the pk columns). */
export function buildLivePage(
  row: Record<string, unknown>,
  table: LiveTableSchema,
  database: DatabaseSchema,
  ref: LiveMountRef,
  fallbackKey = '0',
): Page {
  const pkColumns = table.primary_key.length > 0 ? table.primary_key : [];
  // Mongo wire alias: the data plane surfaces `_id` as `id` (normalize_doc),
  // while the schema's primary_key still says `_id` — fall back per column.
  const pk = pkColumns.length > 0
    ? pkColumns.map((column) => toDisplayString(
        row[column] ?? (column === '_id' ? row.id : undefined) ?? '',
      )).join(':')
    : toDisplayString(row.id ?? row._id ?? fallbackKey);
  const columnsByName = new Map(table.columns.map((column) => [column.name, column]));
  const properties: Record<string, unknown> = {};
  for (const property of Object.values(database.properties)) {
    properties[property.id] = property.id === LIVE_PLACE_PROPERTY_ID
      ? decodeLivePlaceValue(row, ref) // derived from the preset's lat/lng columns
      : decodeLiveValue(
          row[property.id] ?? (property.id === '_id' ? row.id : undefined),
          property,
          columnsByName.get(property.id),
          ref,
        );
  }
  const createdAt = rowTimestamp(row, ['created_at', 'createdAt', 'inserted_at']);
  const updatedAt = rowTimestamp(row, ['updated_at', 'updatedAt', 'created_at', 'createdAt']);
  return {
    id: formatLivePageId(ref, pk),
    databaseId: database.id,
    properties,
    content: [],
    createdAt,
    updatedAt,
    createdBy: LIVE_EDITOR,
    lastEditedBy: LIVE_EDITOR,
  };
}

/** Whole NotionState: the requested table (with rows) + referenced tables
 *  (schema-only) so relations resolve; views built per included database. */
export function buildLiveState(
  schema: LiveSchemaResponse,
  ref: LiveMountRef,
  rowsByTable: Record<string, Record<string, unknown>[]>,
): NotionState {
  const databases: Record<string, DatabaseSchema> = {};
  const pages: Record<string, Page> = {};
  const views: Record<string, ViewConfig> = {};
  const included = new Set<string>([ref.table, ...Object.keys(rowsByTable)]);
  const primary = schema.tables.find((table) => table.name === ref.table);
  for (const column of primary?.columns ?? []) {
    if (column.references) included.add(column.references.table);
  }
  for (const table of schema.tables) {
    if (!included.has(table.name)) continue;
    const tableRef: LiveMountRef = { dbId: ref.dbId, table: table.name };
    const database = buildLiveDatabase(table, tableRef, rowsByTable[table.name] ?? []);
    databases[database.id] = database;
    Object.assign(views, buildLiveViews(database));
    (rowsByTable[table.name] ?? []).forEach((row, index) => {
      const page = buildLivePage(row, table, database, tableRef, String(index));
      pages[page.id] = page;
    });
  }
  return { databases, pages, views };
}
