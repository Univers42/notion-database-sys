/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   connections.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/06 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 18:13:14 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * Copied from src/server/db/connections.ts per Phase 3a D22.
 * Future maintenance: keep these in sync until extraction to packages/db-connections.
 */

import { MongoClient, type Db } from 'mongodb';

let mongoClient: MongoClient | null = null;
let mongoDb: Db | null = null;

/** Returns the singleton MongoDB database connection. */
export async function getMongoDb(): Promise<Db> {
  if (mongoDb) return mongoDb;

  const explicitUri = process.env.MONGO_URI;
  const host = process.env.MONGO_HOST || 'localhost';
  const port = process.env.MONGO_PORT || '27017';
  const user = encodeURIComponent(process.env.MONGO_USER || 'notion_user');
  const pass = encodeURIComponent(process.env.MONGO_PASSWORD || 'notion_pass');
  const dbName = process.env.MONGO_DB || 'notion_db';
  const uri = explicitUri || `mongodb://${user}:${pass}@${host}:${port}/${dbName}?authSource=admin`;

  mongoClient = new MongoClient(uri);
  await mongoClient.connect();
  mongoDb = mongoClient.db(dbName);
  return mongoDb;
}

/** Closes the singleton MongoDB connection if it exists. */
export async function closeMongo(): Promise<void> {
  await mongoClient?.close();
  mongoClient = null;
  mongoDb = null;
}

/** Notion database id to Mongo collection name map. */
export const DB_TO_TABLE: Record<string, string> = {
  'db-tasks': 'tasks',
  'db-crm': 'contacts',
  'db-content': 'content',
  'db-inventory': 'inventory',
  'db-products': 'products',
  'db-projects': 'projects',
};

/** Resolves a Notion database id to a Mongo collection name. */
export function resolveTableName(databaseId: string): string | null {
  return DB_TO_TABLE[databaseId] ?? null;
}

/** Resolves a Mongo collection name back to a Notion database id. */
export function resolveDatabaseId(collectionName: string): string | null {
  for (const [databaseId, tableName] of Object.entries(DB_TO_TABLE)) {
    if (tableName === collectionName) return databaseId;
  }
  return null;
}
