/** @file requestHelpers.ts — Request body parsing & shared extraction helpers. */

import type { Connect } from 'vite';
import type { DbSourceType, SchemaProp, PageLike, NotionState } from './dbmsTypes';
import { isLiveDbSource, readState } from './stateManager';
import { convertValueToDisplay } from './optionConversion';
import { resolveFlatId } from './flatFileSync';

export function parseBody(req: Connect.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk: Buffer) => { data += chunk.toString(); });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

/** Build a flat record from page properties using the field map. */
export function buildFlatRecord(
  fieldMap: Record<string, string>,
  properties: Record<string, unknown>,
  pageId: string,
  source: DbSourceType,
  dbSchema: Record<string, SchemaProp> | undefined,
): Record<string, unknown> {
  const flatRecord: Record<string, unknown> = {};
  for (const [propId, fieldName] of Object.entries(fieldMap)) {
    if (fieldName === 'id') {
      flatRecord.id = isLiveDbSource(source) ? pageId : (properties[propId] ?? pageId);
    } else {
      let val = properties[propId] ?? null;
      if (isLiveDbSource(source) && val != null) {
        const sp = dbSchema?.[propId];
        val = convertValueToDisplay(val, sp);
      }
      flatRecord[fieldName] = val;
    }
  }
  if (!flatRecord.id) flatRecord.id = pageId;
  return flatRecord;
}

/** Resolve the flat-file ID for a delete operation. */
export function resolveOpsDeleteId(
  source: DbSourceType, pageId: string, fieldMap: Record<string, string>,
): string {
  if (isLiveDbSource(source)) return pageId;
  try {
    const state = readState(source);
    const page = state.pages[pageId] as PageLike | undefined;
    return page ? resolveFlatId(page, fieldMap) : pageId;
  } catch {
    return pageId;
  }
}

/** Apply database/page/view patches to a state object. */
export function applyStatePatch(
  body: Record<string, unknown>, state: NotionState, includePages: boolean,
): void {
  if (body.databases) state.databases = body.databases as Record<string, unknown>;
  if (includePages && body.pages) state.pages = body.pages as Record<string, unknown>;
  if (body.views) state.views = body.views as Record<string, unknown>;
}
