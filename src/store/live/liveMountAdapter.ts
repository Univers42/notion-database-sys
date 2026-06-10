/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   liveMountAdapter.ts                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/09 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/10 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * ObjectDatabaseAdapter for ONE live mount table (`baas:<dbId>:<table>`).
 * Reads: `loadState()` = one schema call + the first page of rows (limit
 * 200); referenced tables arrive schema-only so relation cells resolve
 * lazily via `getPage` (op=get). Writes: the host persists EXCLUSIVELY
 * through the duck-typed `persistState(next, prev)` hook (state diff →
 * outbox → publisher; see liveAdapterWrites) — an ARROW property because
 * the host extracts it detached (`this` must stay lexically bound).
 * `subscribe()` fans out the write pipeline's corrective events AND —
 * refcounted on the first/last subscriber — realtime deliveries (WS with
 * poll fallback; see liveRealtime). Direct CRUD methods are NOT on the
 * host's path and stay 501 so misuse fails visibly.
 */

import { AdapterError } from '../../component/types';
import type {
  ChangeEvent,
  NotionState,
  ObjectDatabaseAdapter,
  Page,
  PageQuery,
  PropertyType,
  SchemaProperty,
} from '../../component/types';
import { bustLiveSchemaCache, getLiveSchema, listLiveRows } from './liveMountClient';
import { livePkFilter } from './liveWriteClient';
import { LiveAdapterWrites } from './liveAdapterWrites';
import { LiveRealtime } from './liveRealtime';
import { translateLivePageQuery } from './liveQueryTranslator';
import { buildLiveDatabase, buildLivePage, buildLiveState } from './liveStateBuilder';
import { formatLivePageId, parseLiveDatabaseId, parseLivePageId } from './liveTypes';
import type { LiveMountRef } from './liveTypes';

const DEFAULT_ROW_LIMIT = 200;
const NOT_ON_HOST_PATH =
  'Live databases persist through persistState (the host state diff) — direct CRUD calls are not wired.';

export class LiveMountAdapter implements ObjectDatabaseAdapter {
  readonly databaseId: string;

  private readonly ref: LiveMountRef;

  private readonly subscribers = new Set<(event: ChangeEvent) => void>();

  private readonly writes: LiveAdapterWrites;

  private realtime: LiveRealtime | null = null;
  private baseline: { rows: Record<string, unknown>[]; pkColumns: string[] } | null = null;

  constructor(databaseId: string) {
    const ref = parseLiveDatabaseId(databaseId);
    if (!ref) {
      throw new AdapterError(`Not a live database id: ${databaseId}`, 400, databaseId, 'BAD_LIVE_ID');
    }
    this.databaseId = databaseId;
    this.ref = ref;
    this.writes = new LiveAdapterWrites(databaseId, {
      getSchema: () => getLiveSchema(ref.dbId),
      onSchemaChanged: () => bustLiveSchemaCache(ref.dbId),
      emit: (event) => this.emit(event),
    });
  }

  /** Schema (cached) + first page of rows for this table; relation targets
   *  included schema-only. The result is remembered (by reference) so the
   *  persist hook can tell a reload echo from a user edit. */
  async loadState(): Promise<NotionState> {
    const schema = await getLiveSchema(this.ref.dbId);
    const table = schema.tables.find((candidate) => candidate.name === this.ref.table);
    if (!table) {
      throw new AdapterError(
        `Table "${this.ref.table}" was not found in mount ${this.ref.dbId}.`,
        404,
        this.databaseId,
        'TABLE_NOT_FOUND',
      );
    }
    const result = await listLiveRows(this.ref.dbId, this.ref.table, { limit: DEFAULT_ROW_LIMIT });
    const state = buildLiveState(schema, this.ref, { [this.ref.table]: result.rows });
    this.writes.noteLoadedPages(state.pages);
    const pkColumns = table.primary_key.length > 0 ? table.primary_key : ['id'];
    this.baseline = { rows: result.rows, pkColumns };
    this.realtime?.noteBaseline(result.rows, pkColumns); // poll diff vs what the host shows
    return state;
  }

  /** op=list with the translated server-side filter/sort/limit. */
  async findPages(query: PageQuery): Promise<Page[]> {
    const target = (query.databaseId ? parseLiveDatabaseId(query.databaseId) : null) ?? this.ref;
    const schema = await getLiveSchema(target.dbId);
    const table = schema.tables.find((candidate) => candidate.name === target.table);
    if (!table) return [];
    const { params } = translateLivePageQuery(query, schema.engine);
    const result = await listLiveRows(target.dbId, target.table, params);
    const database = buildLiveDatabase(table, target, result.rows);
    return result.rows.map((row, index) => buildLivePage(row, table, database, target, String(index)));
  }

  /** op=get by primary key (lazy relation-name resolution). */
  async getPage(id: string): Promise<Page | null> {
    const pageRef = parseLivePageId(id);
    if (!pageRef) return null;
    const schema = await getLiveSchema(pageRef.dbId);
    const table = schema.tables.find((candidate) => candidate.name === pageRef.table);
    if (!table) return null;
    const result = await listLiveRows(
      pageRef.dbId,
      pageRef.table,
      { filter: livePkFilter(table, pageRef.pk), limit: 1 },
      'get',
    );
    const row = result.rows[0];
    if (!row) return null;
    return buildLivePage(row, table, buildLiveDatabase(table, pageRef, [row]), pageRef);
  }

  // The host persists in-view edits via persistState; these direct CRUD
  // methods are off that path and fail visibly instead of double-writing.
  async insertPage(databaseId: string, _page: Omit<Page, 'id'>): Promise<Page> {
    throw this.notWired(`${databaseId}/insertPage`);
  }

  async patchPage(id: string, _changes: Partial<Page['properties']>): Promise<Page> {
    throw this.notWired(`${id}/patchPage`);
  }

  async deletePage(id: string): Promise<void> {
    throw this.notWired(`${id}/deletePage`);
  }

  async addProperty(databaseId: string, _prop: SchemaProperty): Promise<void> {
    throw this.notWired(`${databaseId}/addProperty`);
  }

  async removeProperty(databaseId: string, propertyId: string): Promise<void> {
    throw this.notWired(`${databaseId}/removeProperty/${propertyId}`);
  }

  async changePropertyType(databaseId: string, propertyId: string, _newType: PropertyType): Promise<void> {
    throw this.notWired(`${databaseId}/changePropertyType/${propertyId}`);
  }

  // Arrow property, not a method: the ObjectDatabase host EXTRACTS this
  // function and calls it detached (useAdapterStatePersistence), so `this`
  // must be lexically bound — a method would crash with undefined `this`.
  persistState = (next: NotionState, previous?: NotionState): void => {
    this.writes.persist(next, previous);
  };

  /** Corrective events (write pipeline) + realtime deliveries. The realtime
   *  orchestrator runs while ≥1 subscriber exists: first subscriber starts
   *  it, the host's unmount-time unsubscribe stops it (socket closed). */
  subscribe(callback: (event: ChangeEvent) => void): () => void {
    this.subscribers.add(callback);
    if (this.subscribers.size === 1) this.startRealtime();
    return () => {
      if (this.subscribers.delete(callback) && this.subscribers.size === 0) {
        this.realtime?.stop();
        this.realtime = null;
      }
    };
  }

  private startRealtime(): void {
    this.realtime = new LiveRealtime({
      databaseId: this.databaseId,
      getPage: (pk) => this.getPage(formatLivePageId(this.ref, pk)),
      fetchFirstPage: async () =>
        (await listLiveRows(this.ref.dbId, this.ref.table, { limit: DEFAULT_ROW_LIMIT })).rows,
      pendingWrites: () => this.writes.pendingWrites(),
      emit: (event) => this.writes.emitFromServer(event), // arms the persist echo guards
      onSchemaChanged: () => bustLiveSchemaCache(this.ref.dbId),
    });
    if (this.baseline) this.realtime.noteBaseline(this.baseline.rows, this.baseline.pkColumns);
    this.realtime.start();
  }

  private emit(event: ChangeEvent): void {
    queueMicrotask(() => {
      for (const callback of this.subscribers) callback(event);
    });
  }

  private notWired(path: string): AdapterError {
    return new AdapterError(NOT_ON_HOST_PATH, 501, path, 'NOT_ON_HOST_PATH');
  }
}
