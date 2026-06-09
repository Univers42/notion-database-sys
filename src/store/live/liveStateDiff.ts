/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   liveStateDiff.ts                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/10 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * Pure diff between two NotionStates, scoped to ONE live database (the host's
 * persistState hook delivers (next, prev) snapshots — this is the entire write
 * path; the adapter's CRUD methods are never called by the host). Values are
 * compared by their property-level encoding (liveValueCodec) so cosmetic
 * representation changes never produce writes; `value`/`values` carry the RAW
 * notion values — the publisher re-encodes column-aware before sending.
 * Defensiveness mirrors workspaceDatabaseWrites: a bulk batch of inserts or
 * deletes is a load/sync artifact, never a user edit — capped, excess
 * reported in `skipped`. A prev state that lacks this database entirely is a
 * first load, not an edit → empty diff.
 */

import type { NotionState, Page, PropertyType, SchemaProperty } from '../../component/types';
import { encodeLiveValue } from './liveValueCodec';
import { LIVE_DATABASE_ID_PREFIX, parseLiveDatabaseId, parseLivePageId } from './liveTypes';

/** A user adds/removes rows one at a time; a bulk batch is a load artifact. */
export const MAX_LIVE_ROW_OPS_PER_PERSIST = 3;

export interface LiveCellChange { table: string; pk: string; column: string; value: unknown }
export interface LiveInsertChange { table: string; values: Record<string, unknown>; tempId: string }
export interface LiveDeleteChange { table: string; pk: string }
export interface LiveSchemaRetype { propertyId: string; newType: PropertyType; property: SchemaProperty }

export interface LiveStateDiff {
  cellChanges: LiveCellChange[];
  inserts: LiveInsertChange[];
  deletes: LiveDeleteChange[];
  schemaAdds: SchemaProperty[];
  schemaRemoves: string[];
  schemaRetypes: LiveSchemaRetype[];
  skipped: string[];
}

/** Property-level encoding (no column metadata), stringified for comparison.
 *  Skipped (read-only / unsupported) properties encode to undefined → equal. */
function encodedKey(value: unknown, property: SchemaProperty): string {
  return JSON.stringify(encodeLiveValue(value, property, undefined)) ?? 'undefined';
}

/** Cell edits on rows present in both states (same live page id). */
function collectCellChanges(
  diff: LiveStateDiff,
  nextPage: Page,
  prevPage: Page,
  properties: Record<string, SchemaProperty>,
  table: string,
  pk: string,
): void {
  for (const property of Object.values(properties)) {
    const nextValue = nextPage.properties[property.id];
    const prevValue = prevPage.properties[property.id];
    if (encodedKey(nextValue, property) === encodedKey(prevValue, property)) continue;
    if (encodeLiveValue(nextValue, property, undefined) === undefined) continue; // read-only
    diff.cellChanges.push({ table, pk, column: property.id, value: nextValue });
  }
}

/** New UI rows (non-`baas:` ids) → inserts; vanished server rows → deletes.
 *  Both capped: a bulk batch is a load artifact (see module doc). */
function collectRowChanges(
  diff: LiveStateDiff,
  next: NotionState,
  prev: NotionState,
  databaseId: string,
  properties: Record<string, SchemaProperty>,
): void {
  const inserts: Page[] = [];
  for (const page of Object.values(next.pages)) {
    if (page.databaseId !== databaseId || prev.pages[page.id]) continue;
    if (!page.id.startsWith(LIVE_DATABASE_ID_PREFIX)) inserts.push(page); // baas: ids = server rows
  }
  const table = parseLiveDatabaseId(databaseId)?.table ?? '';
  if (inserts.length > MAX_LIVE_ROW_OPS_PER_PERSIST) {
    diff.skipped.push(`dropped ${inserts.length} bulk "new" rows (load artifact, not a user edit)`);
  } else {
    for (const page of inserts) {
      const values: Record<string, unknown> = {};
      for (const property of Object.values(properties)) {
        const raw = page.properties[property.id];
        const encoded = encodeLiveValue(raw, property, undefined);
        if (encoded === undefined || encoded === null || encoded === '') continue;
        if (Array.isArray(encoded) && encoded.length === 0) continue;
        values[property.id] = raw;
      }
      diff.inserts.push({ table, values, tempId: page.id });
    }
  }
  const deletes: { table: string; pk: string }[] = [];
  for (const [id, page] of Object.entries(prev.pages)) {
    if (page.databaseId !== databaseId || next.pages[id]) continue;
    const ref = parseLivePageId(id);
    if (ref && id.startsWith(`${databaseId}:`)) deletes.push({ table: ref.table, pk: ref.pk });
  }
  if (deletes.length > MAX_LIVE_ROW_OPS_PER_PERSIST) {
    diff.skipped.push(`dropped ${deletes.length} bulk row removals (load artifact, not a user edit)`);
  } else {
    diff.deletes.push(...deletes);
  }
}

/** Property map changes on THIS database only → DDL intents. */
function collectSchemaChanges(
  diff: LiveStateDiff,
  nextProps: Record<string, SchemaProperty>,
  prevProps: Record<string, SchemaProperty>,
): void {
  for (const [id, property] of Object.entries(nextProps)) {
    const before = prevProps[id];
    if (!before) {
      diff.schemaAdds.push(property);
    } else if (before.type !== property.type) {
      diff.schemaRetypes.push({ propertyId: id, newType: property.type, property });
    }
  }
  for (const id of Object.keys(prevProps)) {
    if (!nextProps[id]) diff.schemaRemoves.push(id);
  }
}

/** (next, prev, live database id) → the write intents this persist implies. */
export function diffLiveState(next: NotionState, prev: NotionState, databaseId: string): LiveStateDiff {
  const diff: LiveStateDiff = {
    cellChanges: [], inserts: [], deletes: [],
    schemaAdds: [], schemaRemoves: [], schemaRetypes: [], skipped: [],
  };
  const nextDb = next.databases[databaseId];
  const prevDb = prev.databases[databaseId];
  if (!nextDb || !prevDb) return diff; // first load / teardown — never an edit
  const properties = nextDb.properties;
  for (const [id, page] of Object.entries(next.pages)) {
    if (page.databaseId !== databaseId || !id.startsWith(`${databaseId}:`)) continue;
    const prevPage = prev.pages[id];
    const ref = parseLivePageId(id);
    if (!prevPage || !ref) continue; // inserts handled below
    collectCellChanges(diff, page, prevPage, properties, ref.table, ref.pk);
  }
  collectRowChanges(diff, next, prev, databaseId, properties);
  collectSchemaChanges(diff, properties, prevDb.properties);
  return diff;
}
