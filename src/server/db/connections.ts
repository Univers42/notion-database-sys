/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   connections.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/05 22:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/05 23:05:02 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/** @file connections.ts — Shared PostgreSQL & MongoDB connection singletons. */

import pg from 'pg';
import { MongoClient, type Db } from 'mongodb';

// ── PostgreSQL ───────────────────────────────────────────────────────────────

let pool: pg.Pool | null = null;

export function getPgPool(): pg.Pool {
  if (!pool) {
    pool = new pg.Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: Number(process.env.POSTGRES_PORT || '5432'),
      user: process.env.POSTGRES_USER || 'notion_user',
      password: process.env.POSTGRES_PASSWORD || 'notion_pass',
      database: process.env.SRC_POSTGRES_DB || 'notion_src_db',
      max: 5,
      idleTimeoutMillis: 30_000,
    });
  }
  return pool;
}

// ── MongoDB ──────────────────────────────────────────────────────────────────

let mongoClient: MongoClient | null = null;
let mongoDb: Db | null = null;

export async function getMongoDb(): Promise<Db> {
  if (mongoDb) return mongoDb;
  const host = process.env.MONGO_HOST || 'localhost';
  const port = process.env.MONGO_PORT || '27017';
  const user = encodeURIComponent(process.env.MONGO_USER || 'notion_user');
  const pass = encodeURIComponent(process.env.MONGO_PASSWORD || 'notion_pass');
  const dbName = process.env.SRC_MONGO_DB || 'notion_src_db';
  const uri = `mongodb://${user}:${pass}@${host}:${port}/${dbName}?authSource=admin`;
  mongoClient = new MongoClient(uri);
  await mongoClient.connect();
  mongoDb = mongoClient.db(dbName);
  return mongoDb;
}

// ── Table / collection name resolution ───────────────────────────────────────

const DB_TO_TABLE: Record<string, string> = {
  'db-tasks': 'tasks',
  'db-crm': 'contacts',
  'db-content': 'content',
  'db-inventory': 'inventory',
  'db-products': 'products',
  'db-projects': 'projects',
};

/** Resolve databaseId → SQL table / MongoDB collection name. */
export function resolveTableName(databaseId: string): string | null {
  return DB_TO_TABLE[databaseId] ?? null;
}

// ── Notion prop type → SQL column type ───────────────────────────────────────

const PROP_TO_SQL: Record<string, string> = {
  text: 'TEXT',
  title: 'TEXT',
  rich_text: 'TEXT',
  url: 'TEXT',
  email: 'TEXT',
  phone_number: 'TEXT',
  number: 'NUMERIC',
  checkbox: 'BOOLEAN',
  date: 'TIMESTAMPTZ',
  select: 'VARCHAR(100)',
  status: 'VARCHAR(100)',
  multi_select: 'TEXT[]',
  relation: 'TEXT[]',
  created_time: 'TIMESTAMPTZ',
  last_edited_time: 'TIMESTAMPTZ',
  created_by: 'VARCHAR(100)',
  last_edited_by: 'VARCHAR(100)',
  formula: 'TEXT',
  rollup: 'TEXT',
  files: 'TEXT',
  auto_increment: 'INTEGER',
};

/** Map Notion property type → PostgreSQL column type. */
export function propTypeToSql(propType: string): string {
  return PROP_TO_SQL[propType] ?? 'TEXT';
}
