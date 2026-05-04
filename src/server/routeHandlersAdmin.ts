/** @file routeHandlersAdmin.ts — Admin, column, ops & query-log route handlers. */

import type { Req, Res, SchemaProp, PageLike, DbSourceType } from "./dbmsTypes";
import { SOURCE_DIR } from "./dbmsTypes";
import {
  parseBody,
  buildFlatRecord,
  resolveOpsDeleteId,
  applyStatePatch,
} from "./requestHelpers";
import {
  getActiveSource,
  setActiveSource,
  isStaleSource,
  getEffectiveState,
  isLiveDbSource,
  readFieldMap,
  readState,
  writeState,
  setFieldMapEntry,
  removeFieldMapEntry,
  invalidateLiveCache,
  syncLiveCacheSchemas,
} from "./stateManager";
import { logLifecycle } from "./logger";
import {
  dispatchInsert,
  dispatchDelete,
  dispatchAddColumn,
  dispatchDropColumn,
  dispatchChangeType,
  getQueryLog,
  clearQueryLog,
} from "./ops/index";

export async function handleGetState(_req: Req, res: Res): Promise<void> {
  const activeSource = getActiveSource();
  if (isLiveDbSource(activeSource)) invalidateLiveCache();
  const state = await getEffectiveState(activeSource);
  res.writeHead(200);
  res.end(JSON.stringify({ ...state, _source: activeSource }));
}

export function handleGetSource(_req: Req, res: Res): void {
  res.writeHead(200);
  res.end(JSON.stringify({ source: getActiveSource() }));
}

export async function handlePutSource(req: Req, res: Res): Promise<void> {
  const body = await parseBody(req);
  const newSource = body.source as DbSourceType;
  if (!SOURCE_DIR[newSource]) {
    res.writeHead(400);
    res.end(JSON.stringify({ error: `Unknown source: ${newSource}` }));
    return;
  }
  setActiveSource(newSource);
  logLifecycle(`Source switched → ${newSource}`);
  invalidateLiveCache();
  const state = await getEffectiveState(newSource);
  res.writeHead(200);
  res.end(JSON.stringify(state));
}

export async function handlePostColumn(req: Req, res: Res): Promise<void> {
  const body = await parseBody(req);
  if (isStaleSource(body, res)) return;
  const activeSource = getActiveSource();
  const databaseId = body.databaseId as string;
  const columnName = body.columnName as string;
  const propType = (body.propType as string) ?? "text";

  const result = await dispatchAddColumn(
    activeSource,
    databaseId,
    columnName,
    propType,
  );

  // Persist mapping: propId -> columnName so loaders can map fields correctly
  try {
    if (body.propId) {
      setFieldMapEntry(
        activeSource,
        databaseId,
        body.propId as string,
        columnName,
      );
    }
  } catch (err) {
    console.warn("[dbms] Failed to update field map:", err);
  }

  if (!isLiveDbSource(activeSource)) {
    const state = readState(activeSource);
    for (const page of Object.values(state.pages) as PageLike[]) {
      if (page.databaseId === databaseId) {
        if (!((body.propId as string) in page.properties)) {
          page.properties[body.propId as string] = null;
        }
      }
    }
    writeState(activeSource, state);
  }

  res.writeHead(201);
  res.end(JSON.stringify({ ok: true, query: result?.query ?? null }));
}

export async function handleDeleteColumn(
  _req: Req,
  res: Res,
  params?: string[],
): Promise<void> {
  const databaseId = params?.[0] ?? "";
  const propId = params?.[1] ?? "";
  const activeSource = getActiveSource();

  const allFieldMaps = readFieldMap(activeSource);
  const fieldMap = allFieldMaps[databaseId] ?? {};
  const fieldName = fieldMap[propId];

  let result = null;
  if (fieldName) {
    result = await dispatchDropColumn(activeSource, databaseId, fieldName);
  }

  // Remove mapping entry for deleted property
  try {
    removeFieldMapEntry(activeSource, databaseId, propId);
  } catch (err) {
    console.warn("[dbms] Failed to remove field map entry:", err);
  }

  if (!isLiveDbSource(activeSource)) {
    const state = readState(activeSource);
    for (const page of Object.values(state.pages) as PageLike[]) {
      if (page.databaseId === databaseId) {
        delete page.properties[propId];
      }
    }
    writeState(activeSource, state);
  }

  res.writeHead(200);
  res.end(JSON.stringify({ ok: true, query: result?.query ?? null }));
}

export async function handleChangeColumnType(
  req: Req,
  res: Res,
  params?: string[],
): Promise<void> {
  const databaseId = params?.[0] ?? "";
  const propId = params?.[1] ?? "";
  const body = await parseBody(req);
  const oldType = body.oldType as string;
  const newType = body.newType as string;
  const activeSource = getActiveSource();

  const allFieldMaps = readFieldMap(activeSource);
  const fieldMap = allFieldMaps[databaseId] ?? {};
  const fieldName = fieldMap[propId];

  let result = null;
  if (fieldName) {
    result = await dispatchChangeType(
      activeSource,
      databaseId,
      fieldName,
      oldType,
      newType,
    );
  }

  res.writeHead(200);
  res.end(JSON.stringify({ ok: true, query: result?.query ?? null }));
}

export function handleGetQueryLog(req: Req, res: Res): void {
  const params = new URL(req.url ?? "", "http://localhost").searchParams;
  const limit = Number(params.get("limit")) || 50;
  res.writeHead(200);
  res.end(JSON.stringify(getQueryLog(limit)));
}

export function handleDeleteQueryLog(_req: Req, res: Res): void {
  clearQueryLog();
  res.writeHead(200);
  res.end(JSON.stringify({ ok: true }));
}

export async function handlePostOps(req: Req, res: Res): Promise<void> {
  const body = await parseBody(req);
  if (isStaleSource(body, res)) return;
  const activeSource = getActiveSource();
  const action = body.action as string;
  const databaseId = body.databaseId as string;

  const allFieldMaps = readFieldMap(activeSource);
  const fieldMap = allFieldMaps[databaseId] ?? {};

  let result: { query: string } | null = null;

  switch (action) {
    case "insert": {
      const opsState = await getEffectiveState(activeSource);
      const opsDb = opsState.databases[databaseId] as
        | { properties: Record<string, SchemaProp> }
        | undefined;
      const properties = (body.properties ?? {}) as Record<string, unknown>;
      const pageId = body.pageId as string;
      result = await dispatchInsert(
        activeSource,
        databaseId,
        buildFlatRecord(
          fieldMap,
          properties,
          pageId,
          activeSource,
          opsDb?.properties,
        ),
        fieldMap,
      );
      break;
    }
    case "delete": {
      const deleteId = resolveOpsDeleteId(
        activeSource,
        body.pageId as string,
        fieldMap,
      );
      result = await dispatchDelete(
        activeSource,
        databaseId,
        deleteId,
        fieldMap,
      );
      break;
    }
    case "addColumn": {
      const columnName = body.columnName as string;
      const propType = (body.propType as string) ?? "text";
      result = await dispatchAddColumn(
        activeSource,
        databaseId,
        columnName,
        propType,
      );
      break;
    }
    case "dropColumn":
      result = await dispatchDropColumn(
        activeSource,
        databaseId,
        body.columnName as string,
      );
      break;
    case "changeType": {
      const { columnName, oldType, newType } = body as Record<string, string>;
      result = await dispatchChangeType(
        activeSource,
        databaseId,
        columnName,
        oldType,
        newType,
      );
      break;
    }
    default:
      res.writeHead(400);
      res.end(JSON.stringify({ error: `Unknown ops action: ${action}` }));
      return;
  }

  res.writeHead(200);
  res.end(JSON.stringify({ ok: true, query: result?.query ?? null }));
}

export async function handlePatchState(req: Req, res: Res): Promise<void> {
  const body = await parseBody(req);
  if (isStaleSource(body, res)) return;
  const activeSource = getActiveSource();
  const state = readState(activeSource);
  const isLive = isLiveDbSource(activeSource);
  applyStatePatch(body, state, !isLive);
  writeState(activeSource, state);
  if (isLive) syncLiveCacheSchemas(body, activeSource);
  res.writeHead(200);
  res.end(JSON.stringify({ ok: true }));
}

/** Update database metadata (name, icon, description). */
export async function handlePutDatabase(
  req: Req,
  res: Res,
  params?: string[],
): Promise<void> {
  const databaseId = params?.[0] ?? "";
  const body = await parseBody(req);
  if (isStaleSource(body, res)) return;

  const activeSource = getActiveSource();
  const state = readState(activeSource);

  const database = state.databases[databaseId] as
    | Record<string, unknown>
    | undefined;
  if (!database) {
    res.writeHead(404);
    res.end(JSON.stringify({ error: `Database not found: ${databaseId}` }));
    return;
  }

  // Update allowed metadata fields
  if (typeof body.name === "string")
    database.name = body.name;
  if (typeof body.icon === "string")
    database.icon = body.icon;
  if (typeof body.description === "string")
    database.description = body.description;

  writeState(activeSource, state);
  res.writeHead(200);
  res.end(JSON.stringify({ ok: true }));
}

/** Create a new view for a database. */
export async function handlePostView(req: Req, res: Res): Promise<void> {
  const body = await parseBody(req);
  if (isStaleSource(body, res)) return;

  const activeSource = getActiveSource();
  const state = readState(activeSource);

  const databaseId = body.databaseId as string;
  const database = state.databases[databaseId] as
    | Record<string, unknown>
    | undefined;
  if (!database) {
    res.writeHead(404);
    res.end(JSON.stringify({ error: `Database not found: ${databaseId}` }));
    return;
  }

  // Create view with required fields
  const viewId = `v-${crypto.randomUUID().slice(0, 8)}`;
  const defaultVisibleProperties = Object.keys(
    database.properties as Record<string, unknown>,
  );

  const newView = {
    id: viewId,
    databaseId,
    name: (body.name as string) || "Unnamed View",
    type: (body.type as string) || "table",
    filters: (body.filters as Array<unknown>) || [],
    filterConjunction: (body.filterConjunction as "and" | "or") || "and",
    sorts: (body.sorts as Array<unknown>) || [],
    visibleProperties:
      (body.visibleProperties as string[]) || defaultVisibleProperties,
    settings: (body.settings as Record<string, unknown>) || {},
  };

  state.views[viewId] = newView;
  writeState(activeSource, state);

  res.writeHead(201);
  res.end(JSON.stringify(newView));
}

/** Update a view configuration. */
export async function handlePutView(
  req: Req,
  res: Res,
  params?: string[],
): Promise<void> {
  const viewId = params?.[0] ?? "";
  const body = await parseBody(req);
  if (isStaleSource(body, res)) return;

  const activeSource = getActiveSource();
  const state = readState(activeSource);

  const view = state.views[viewId] as Record<string, unknown> | undefined;
  if (!view) {
    res.writeHead(404);
    res.end(JSON.stringify({ error: `View not found: ${viewId}` }));
    return;
  }

  // Update allowed view fields
  if (typeof body.name === "string")
    view.name = body.name;
  if (typeof body.type === "string")
    view.type = body.type;
  if (Array.isArray(body.filters))
    view.filters = body.filters;
  if (body.filterConjunction === "and" || body.filterConjunction === "or")
    view.filterConjunction =
      body.filterConjunction;
  if (Array.isArray(body.sorts))
    view.sorts = body.sorts;
  if (body.grouping) view.grouping = body.grouping;
  if (body.subGrouping)
    view.subGrouping = body.subGrouping;
  if (Array.isArray(body.visibleProperties))
    view.visibleProperties =
      body.visibleProperties;
  if (body.settings && typeof body.settings === "object")
    view.settings = body.settings as Record<
      string,
      unknown
    >;

  writeState(activeSource, state);
  res.writeHead(200);
  res.end(JSON.stringify({ ok: true, view }));
}

/** Delete a view. */
export async function handleDeleteView(
  _req: Req,
  res: Res,
  params?: string[],
): Promise<void> {
  const viewId = params?.[0] ?? "";
  const activeSource = getActiveSource();
  const state = readState(activeSource);

  if (!state.views[viewId]) {
    res.writeHead(404);
    res.end(JSON.stringify({ error: `View not found: ${viewId}` }));
    return;
  }

  delete state.views[viewId];
  writeState(activeSource, state);

  res.writeHead(200);
  res.end(JSON.stringify({ ok: true }));
}
