/** @file dbmsTypes.ts — Shared types & constants for DBMS middleware. */

import type { Connect } from 'vite';
import { join, resolve } from 'node:path';

export type DbSourceType = 'json' | 'csv' | 'mongodb' | 'postgresql';

export interface NotionState {
  databases: Record<string, unknown>;
  pages: Record<string, unknown>;
  views: Record<string, unknown>;
}

export interface SchemaProp {
  id: string;
  name: string;
  type: string;
  options?: { id: string; value: string; color: string }[];
}

export interface PageLike {
  id: string;
  databaseId: string;
  properties: Record<string, unknown>;
  [key: string]: unknown;
}

export type Req = Connect.IncomingMessage;
export type Res = import('node:http').ServerResponse;
export type ApiHandler = (req: Req, res: Res, params?: string[]) => Promise<void> | void;

export const OPTION_TYPES = new Set(['select', 'status', 'multi_select']);

export const ROOT = resolve(process.cwd());

/** Map source type → directory holding seed files. */
export const SOURCE_DIR: Record<DbSourceType, string> = {
  json: join(ROOT, 'src', 'store', 'dbms', 'json'),
  csv: join(ROOT, 'src', 'store', 'dbms', 'csv'),
  mongodb: join(ROOT, 'src', 'store', 'dbms', 'mongodb'),
  postgresql: join(ROOT, 'src', 'store', 'dbms', 'relational'),
};

export const STATE_FILE = '_notion_state.json';
export const FIELD_MAP_FILE = '_field_map.json';
