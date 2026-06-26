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
  DatabaseSchema,
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
import { isPermanentDenial } from './livePoll';
import { LIVE_MAX_LIMIT, translateLivePageQuery } from './liveQueryTranslator';
import { getCrossMountCatalog } from './liveCrossMount';
import { inferLiveReferences } from './liveReferenceInfer';
import { loadLiveViews, saveLiveViews } from './liveViewStore';
import { buildLiveDatabase, buildLivePage, buildLiveState } from './liveStateBuilder';
import { formatLivePageId, parseLiveDatabaseId, parseLivePageId } from './liveTypes';
import type { LiveMountRef, LiveSchemaResponse, LiveTableSchema } from './liveTypes';

/** Preload cap: enough for virtualization to show "thousands" without an
 *  unbounded scan. Each call is clamped to LIVE_MAX_LIMIT by the router, so we
 *  page up to this ceiling. Going past it is the incremental-fetch follow-up. */
const MAX_PRELOAD_ROWS = 2000;
/** Per referenced (dimension) table, one page is enough to resolve relation
 *  titles; rows past it just render the key. Bounded so a big lookup table
 *  can't blow up the open. */
const RELATION_PRELOAD_ROWS = LIVE_MAX_LIMIT;
const NOT_ON_HOST_PATH =
  'Live databases persist through persistState (the host state diff) — direct CRUD calls are not wired.';

export class LiveMountAdapter implements ObjectDatabaseAdapter {
  readonly databaseId: string;

  private readonly ref: LiveMountRef;

  private readonly subscribers = new Set<(event: ChangeEvent) => void>();

  private readonly writes: LiveAdapterWrites;

  private realtime: LiveRealtime | null = null;
  private baseline: { rows: Record<string, unknown>[]; pkColumns: string[] } | null = null;
  /** The views object returned by the last loadState (reload-echo guard so the
   *  freshly-loaded view set isn't re-saved as if the user changed it). */
  private lastLoadedViews: NotionState['views'] | null = null;
  /** Set once a 403/401 proves this user can't access the database — every
   *  later load fails fast and realtime never starts (no retry storm). */
  private forbidden: AdapterError | null = null;

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
   *  included schema-only. A 403/401 (no workspace access) is remembered so the
   *  tab fails fast and never starts realtime, instead of hammering the bridge. */
  async loadState(): Promise<NotionState> {
    if (this.forbidden) throw this.forbidden;
    try {
      return await this.loadStateInner();
    } catch (error) {
      if (isPermanentDenial(error)) {
        this.forbidden = error instanceof AdapterError
          ? error
          : new AdapterError('You do not have access to this database.', 403, this.databaseId, 'FORBIDDEN');
        this.realtime?.stop();
      }
      throw error;
    }
  }

  private async loadStateInner(): Promise<NotionState> {
    const [rawSchema, catalog] = await Promise.all([
      getLiveSchema(this.ref.dbId),
      getCrossMountCatalog(),
    ]);
    const schema = inferLiveReferences(rawSchema, this.ref.dbId, catalog);
    const table = schema.tables.find((candidate) => candidate.name === this.ref.table);
    if (!table) {
      throw new AdapterError(
        `Table "${this.ref.table}" was not found in mount ${this.ref.dbId}.`,
        404,
        this.databaseId,
        'TABLE_NOT_FOUND',
      );
    }
    const rows = await this.loadAllRows();
    const rowsByTable = await this.loadReferencedRows(schema, table, { [this.ref.table]: rows });
    const state = buildLiveState(schema, this.ref, rowsByTable);
    // Cross-mount relation targets (referenced tables in OTHER mounts) load as
    // their own databases + pages so those relation cells resolve a title too.
    const crossMount = await this.loadCrossMountTargets(table);
    Object.assign(state.databases, crossMount.databases);
    Object.assign(state.pages, crossMount.pages);
    // Restore the user's saved views over the rebuilt defaults (added/edited
    // views persist across a hard refresh; engine data is untouched).
    state.views = { ...state.views, ...loadLiveViews(this.databaseId) };
    this.lastLoadedViews = state.views;
    // diffLiveState already scopes writes to this.databaseId, so referenced/
    // cross-mount pages are inert — pass the EXACT pages object so the reload-
    // echo guard (next.pages === lastLoadedPages, reference equality) still fires.
    this.writes.noteLoadedPages(state.pages);
    const pkColumns = table.primary_key.length > 0 ? table.primary_key : ['id'];
    this.baseline = { rows, pkColumns };
    this.realtime?.noteBaseline(rows, pkColumns); // poll diff vs what the host shows
    return state;
  }

  /** Load up to RELATION_PRELOAD_ROWS rows of each SAME-mount table the primary
   *  table references, so relation cells resolve to a title instead of a bare
   *  key. Best-effort + bounded: a missing/large ref table just leaves some
   *  relations showing the key (no throw — display is never load-critical). */
  private async loadReferencedRows(
    schema: LiveSchemaResponse,
    primary: LiveTableSchema,
    base: Record<string, Record<string, unknown>[]>,
  ): Promise<Record<string, Record<string, unknown>[]>> {
    const targets = new Set<string>();
    for (const column of primary.columns) {
      const ref = column.references?.table;
      if (ref && ref !== primary.name && !base[ref] && schema.tables.some((t) => t.name === ref)) {
        targets.add(ref);
      }
    }
    const out = { ...base };
    for (const name of targets) {
      try {
        const page = await listLiveRows(this.ref.dbId, name, { limit: RELATION_PRELOAD_ROWS });
        out[name] = page.rows;
      } catch {
        /* ref table unreadable → its relations show the key, not fatal */
      }
    }
    return out;
  }

  /** Load each CROSS-MOUNT relation target (a referenced table in another
   *  mount) as its own database + pages, so cross-mount relation cells resolve
   *  a title. Bounded + best-effort: an unauthorized/absent target mount is
   *  skipped (the relation then shows the key — the bridge access-scopes this). */
  private async loadCrossMountTargets(
    primary: LiveTableSchema,
  ): Promise<{ databases: Record<string, DatabaseSchema>; pages: Record<string, Page> }> {
    const out: { databases: Record<string, DatabaseSchema>; pages: Record<string, Page> } = {
      databases: {},
      pages: {},
    };
    const seen = new Set<string>();
    for (const column of primary.columns) {
      const ref = column.references;
      if (!ref?.dbId || ref.dbId === this.ref.dbId || seen.has(`${ref.dbId}:${ref.table}`)) continue;
      seen.add(`${ref.dbId}:${ref.table}`);
      try {
        const targetRef: LiveMountRef = { dbId: ref.dbId, table: ref.table };
        const schema = await getLiveSchema(ref.dbId);
        const table = schema.tables.find((candidate) => candidate.name === ref.table);
        if (!table) continue;
        const page = await listLiveRows(ref.dbId, ref.table, { limit: RELATION_PRELOAD_ROWS });
        const database = buildLiveDatabase(table, targetRef, page.rows);
        out.databases[database.id] = database;
        page.rows.forEach((row, index) => {
          const built = buildLivePage(row, table, database, targetRef, String(index));
          out.pages[built.id] = built;
        });
      } catch {
        /* target mount unreadable / unauthorized → relation shows the key */
      }
    }
    return out;
  }

  /** Page through the table up to MAX_PRELOAD_ROWS (each call clamped to
   *  LIVE_MAX_LIMIT). Bounds the in-memory set; the table view virtualizes, so
   *  a few thousand rows render at viewport cost. Used for both the initial
   *  load and the realtime baseline so the poll diff compares the same scope. */
  private async loadAllRows(): Promise<Record<string, unknown>[]> {
    const rows: Record<string, unknown>[] = [];
    while (rows.length < MAX_PRELOAD_ROWS) {
      const page = await listLiveRows(this.ref.dbId, this.ref.table, { limit: LIVE_MAX_LIMIT, offset: rows.length });
      rows.push(...page.rows);
      if (page.rows.length < LIVE_MAX_LIMIT) break; // last page reached
    }
    return rows.length > MAX_PRELOAD_ROWS ? rows.slice(0, MAX_PRELOAD_ROWS) : rows;
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
    this.persistViews(next);
  };

  /** Save THIS database's views (added/edited/deleted) to localStorage when
   *  they changed — skipping the reload echo (same object ref the load set).
   *  Views are UI config; this never touches the engine. */
  private persistViews(next: NotionState): void {
    if (next.views === this.lastLoadedViews) return;
    const mine = Object.fromEntries(
      Object.entries(next.views).filter(([, view]) => view.databaseId === this.databaseId),
    );
    saveLiveViews(this.databaseId, mine);
  }

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
    if (this.forbidden) return; // no access — never poll/subscribe a denied database
    this.realtime = new LiveRealtime({
      databaseId: this.databaseId,
      getPage: (pk) => this.getPage(formatLivePageId(this.ref, pk)),
      fetchFirstPage: async () => this.loadAllRows(),
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
