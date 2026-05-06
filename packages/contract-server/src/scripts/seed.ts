/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   seed.ts                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/06 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 18:13:14 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { closeMongo, getMongoDb } from '../db/connections';
import type { MetaState, NotionState } from '../types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../../../..');
const MONGO_SEED_DIR = path.join(ROOT_DIR, 'src/store/dbms/mongodb');
const JSON_SEED_DIR = path.join(ROOT_DIR, 'src/store/dbms/json');

/** Seeds the contract server _meta collection from the current Notion state files. */
export async function seedContractMeta(): Promise<void> {
  const notionState = await readJson<NotionState>(path.join(MONGO_SEED_DIR, '_notion_state.json'))
    .catch(() => readJson<NotionState>(path.join(JSON_SEED_DIR, '_notion_state.json')));
  const fieldMaps = await readJson<Record<string, Record<string, string>>>(path.join(MONGO_SEED_DIR, '_field_map.json'))
    .catch(() => readJson<Record<string, Record<string, string>>>(path.join(JSON_SEED_DIR, '_field_map.json')));

  const db = await getMongoDb();
  const meta: MetaState = {
    _id: 'notion-state',
    databases: notionState.databases,
    views: notionState.views,
    fieldMaps,
    updatedAt: new Date().toISOString(),
  };

  await db.collection<MetaState>('_meta').updateOne(
    { _id: 'notion-state' },
    { $set: meta },
    { upsert: true },
  );
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T;
}

await seedContractMeta();
await closeMongo();
console.log('[contract-server] seeded _meta.notion-state');
