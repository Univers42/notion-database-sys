/** @file routeHandlersCrud.ts — Page / record CRUD route handlers. */

import type { Req, Res, SchemaProp, PageLike } from './dbmsTypes';
import { parseBody, buildFlatRecord } from './requestHelpers';
import {
  getActiveSource, isStaleSource, getEffectiveState,
  isLiveDbSource, readFieldMap, writeState,
} from './stateManager';
import { resolveFlatId, syncJsonEntity, syncCsvEntity } from './flatFileSync';
import { convertValueToDisplay } from './optionConversion';
import { validatePropertyValue } from '../store/validation';
import {
  dispatchInsert, dispatchDelete, dispatchUpdate,
} from './ops/index';

export async function handlePatchPage(req: Req, res: Res, params?: string[]): Promise<void> {
  const pageId = params?.[0] ?? '';
  const body = await parseBody(req);
  if (isStaleSource(body, res)) return;
  const propertyId = body.propertyId as string;
  let value = body.value;

  const activeSource = getActiveSource();
  const state = await getEffectiveState(activeSource);
  const page = state.pages[pageId] as PageLike | undefined;
  if (!page) {
    res.writeHead(404);
    res.end(JSON.stringify({ error: `Page ${pageId} not found` }));
    return;
  }

  const dbId = page.databaseId;
  const db = state.databases[dbId] as { properties: Record<string, { id: string; name: string; type: string; options?: { id: string; value: string; color: string }[]; relationConfig?: { databaseId: string } }> } | undefined;
  const prop = db?.properties?.[propertyId];
  if (prop) {
    const vr = validatePropertyValue(value, prop as never, state.pages as never);
    if (!vr.ok) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: vr.reason }));
      return;
    }
    value = vr.value;
  }

  page.properties[propertyId] = value;
  (page as Record<string, unknown>).updatedAt = new Date().toISOString();
  (page as Record<string, unknown>).lastEditedBy = 'You';

  const allFieldMaps = readFieldMap(activeSource);
  const fieldMap = allFieldMaps[dbId] ?? {};

  if (isLiveDbSource(activeSource)) {
    const fieldName = fieldMap[propertyId];
    if (fieldName) {
      const dbValue = convertValueToDisplay(value, prop as SchemaProp | undefined);
      await dispatchUpdate(activeSource, dbId, page.id, fieldName, dbValue, fieldMap);
    }
  } else {
    writeState(activeSource, state);
    syncJsonEntity(activeSource, page, fieldMap);
    syncCsvEntity(activeSource, page, fieldMap);
    const flatId = resolveFlatId(page, fieldMap);
    const fieldName = fieldMap[propertyId];
    if (flatId && fieldName) {
      await dispatchUpdate(activeSource, dbId, flatId, fieldName, value, fieldMap);
    }
  }

  res.writeHead(200);
  res.end(JSON.stringify({ ok: true }));
}

export async function handlePostRecord(req: Req, res: Res): Promise<void> {
  const body = await parseBody(req);
  if (isStaleSource(body, res)) return;
  const databaseId = body.databaseId as string;
  const properties = (body.properties ?? {}) as Record<string, unknown>;
  const pageId = (body.pageId as string) ?? crypto.randomUUID();

  const activeSource = getActiveSource();
  const state = await getEffectiveState(activeSource);
  const allFieldMaps = readFieldMap(activeSource);
  const fieldMap = allFieldMaps[databaseId] ?? {};
  const db = state.databases[databaseId] as { properties: Record<string, SchemaProp> } | undefined;
  const flatRecord = buildFlatRecord(fieldMap, properties, pageId, activeSource, db?.properties);

  state.pages[pageId] = {
    id: pageId,
    databaseId,
    properties,
    content: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'You',
    lastEditedBy: 'You',
  };

  const result = await dispatchInsert(activeSource, databaseId, flatRecord, fieldMap);
  if (!isLiveDbSource(activeSource)) writeState(activeSource, state);

  res.writeHead(201);
  res.end(JSON.stringify({ ok: true, pageId, query: result?.query ?? null }));
}

export async function handleDeleteRecord(_req: Req, res: Res, params?: string[]): Promise<void> {
  const pageId = params?.[0] ?? '';
  const activeSource = getActiveSource();
  const state = await getEffectiveState(activeSource);
  const page = state.pages[pageId] as PageLike | undefined;
  if (!page) {
    res.writeHead(404);
    res.end(JSON.stringify({ error: `Page ${pageId} not found` }));
    return;
  }

  const dbId = page.databaseId;
  const allFieldMaps = readFieldMap(activeSource);
  const fieldMap = allFieldMaps[dbId] ?? {};
  const flatId = isLiveDbSource(activeSource) ? pageId : resolveFlatId(page, fieldMap);

  delete state.pages[pageId];

  const result = flatId
    ? await dispatchDelete(activeSource, dbId, flatId, fieldMap)
    : null;

  if (!isLiveDbSource(activeSource)) writeState(activeSource, state);

  res.writeHead(200);
  res.end(JSON.stringify({ ok: true, query: result?.query ?? null }));
}
