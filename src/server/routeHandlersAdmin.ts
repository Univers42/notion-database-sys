/** @file routeHandlersAdmin.ts — Admin, column, ops & query-log route handlers. */

import type { Req, Res, SchemaProp, PageLike, DbSourceType } from './dbmsTypes';
import { SOURCE_DIR } from './dbmsTypes';
import { parseBody, buildFlatRecord, resolveOpsDeleteId, applyStatePatch } from './requestHelpers';
import {
  getActiveSource, setActiveSource, isStaleSource, getEffectiveState,
  isLiveDbSource, readFieldMap, readState, writeState,
  invalidateLiveCache, syncLiveCacheSchemas,
} from './stateManager';
import { logLifecycle } from './logger';
import {
  dispatchInsert, dispatchDelete,
  dispatchAddColumn, dispatchDropColumn, dispatchChangeType,
  getQueryLog, clearQueryLog,
} from './ops/index';

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
  const propType = (body.propType as string) ?? 'text';

  const result = dispatchAddColumn(activeSource, databaseId, columnName, propType);

  if (!isLiveDbSource(activeSource)) {
    const state = readState(activeSource);
    for (const page of Object.values(state.pages) as PageLike[]) {
      if (page.databaseId === databaseId) {
        if (!(body.propId as string in page.properties)) {
          page.properties[body.propId as string] = null;
        }
      }
    }
    writeState(activeSource, state);
  }

  res.writeHead(201);
  res.end(JSON.stringify({ ok: true, query: result?.query ?? null }));
}

export async function handleDeleteColumn(_req: Req, res: Res, params?: string[]): Promise<void> {
  const databaseId = params?.[0] ?? '';
  const propId = params?.[1] ?? '';
  const activeSource = getActiveSource();

  const allFieldMaps = readFieldMap(activeSource);
  const fieldMap = allFieldMaps[databaseId] ?? {};
  const fieldName = fieldMap[propId];

  let result = null;
  if (fieldName) {
    result = dispatchDropColumn(activeSource, databaseId, fieldName);
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

export async function handleChangeColumnType(req: Req, res: Res, params?: string[]): Promise<void> {
  const databaseId = params?.[0] ?? '';
  const propId = params?.[1] ?? '';
  const body = await parseBody(req);
  const oldType = body.oldType as string;
  const newType = body.newType as string;
  const activeSource = getActiveSource();

  const allFieldMaps = readFieldMap(activeSource);
  const fieldMap = allFieldMaps[databaseId] ?? {};
  const fieldName = fieldMap[propId];

  let result = null;
  if (fieldName) {
    result = dispatchChangeType(activeSource, databaseId, fieldName, oldType, newType);
  }

  res.writeHead(200);
  res.end(JSON.stringify({ ok: true, query: result?.query ?? null }));
}

export function handleGetQueryLog(req: Req, res: Res): void {
  const params = new URL(req.url ?? '', 'http://localhost').searchParams;
  const limit = Number(params.get('limit')) || 50;
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

  let result: ReturnType<typeof dispatchInsert> = null;

  switch (action) {
    case 'insert': {
      const opsState = await getEffectiveState(activeSource);
      const opsDb = opsState.databases[databaseId] as { properties: Record<string, SchemaProp> } | undefined;
      const properties = (body.properties ?? {}) as Record<string, unknown>;
      const pageId = body.pageId as string;
      result = dispatchInsert(activeSource, databaseId,
        buildFlatRecord(fieldMap, properties, pageId, activeSource, opsDb?.properties), fieldMap);
      break;
    }
    case 'delete': {
      const deleteId = resolveOpsDeleteId(activeSource, body.pageId as string, fieldMap);
      result = dispatchDelete(activeSource, databaseId, deleteId, fieldMap);
      break;
    }
    case 'addColumn': {
      const columnName = body.columnName as string;
      const propType = (body.propType as string) ?? 'text';
      result = dispatchAddColumn(activeSource, databaseId, columnName, propType);
      break;
    }
    case 'dropColumn':
      result = dispatchDropColumn(activeSource, databaseId, body.columnName as string);
      break;
    case 'changeType': {
      const { columnName, oldType, newType } = body as Record<string, string>;
      result = dispatchChangeType(activeSource, databaseId, columnName, oldType, newType);
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
