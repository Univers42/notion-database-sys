// ─── MongoDB query generator ─────────────────────────────────────────────────
// Generates MongoDB shell-style commands, updates seed files, and
// executes against the live Docker container when available.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { markOwnWrite } from '../fileWatcher';
import type { DbmsAdapter, QueryResult } from './types';
import { PROP_TO_BSON } from './types';
import { mongoLit } from './helpers';
import { logQuery } from './queryLog';
import { mongoInsert, mongoDelete, mongoUpdate } from '../db/mongoClient';

const DIR = join(resolve(process.cwd()), 'src', 'store', 'dbms', 'mongodb');

function seedPath(table: string): string {
  return join(DIR, `${table}.seed.json`);
}

function readSeed(table: string): Record<string, unknown>[] {
  const p = seedPath(table);
  if (!existsSync(p)) return [];
  try {
    const raw = JSON.parse(readFileSync(p, 'utf-8'));
    return Array.isArray(raw) ? raw : [];
  } catch { return []; }
}

function writeSeed(table: string, docs: Record<string, unknown>[]): void {
  const p = seedPath(table);
  markOwnWrite(p);
  writeFileSync(p, JSON.stringify(docs, null, 2), 'utf-8');
}

export class MongoOps implements DbmsAdapter {
  readonly sourceType = 'mongodb' as const;

  insertRecord(table: string, flatRecord: Record<string, unknown>): QueryResult {
    // Update seed file
    const docs = readSeed(table);
    const doc: Record<string, unknown> = { _id: flatRecord.id, ...flatRecord };
    delete doc.id; // MongoDB uses _id
    docs.push(doc);
    writeSeed(table, docs);

    const docStr = JSON.stringify(doc, null, 2);
    const query = `db.${table}.insertOne(${docStr})`;
    logQuery('mongodb', 'INSERT', table, query, 1);
    // Execute against live Docker MongoDB (fire-and-forget)
    mongoInsert(table, doc).catch(() => {});
    return { query, executed: true, affected: 1 };
  }

  deleteRecord(table: string, flatId: string): QueryResult {
    const docs = readSeed(table);
    const before = docs.length;
    const filtered = docs.filter(d => String(d._id ?? d.id) !== flatId);
    writeSeed(table, filtered);
    const affected = before - filtered.length;
    const query = `db.${table}.deleteOne({ _id: ${mongoLit(flatId)} })`;
    logQuery('mongodb', 'DELETE', table, query, affected);
    mongoDelete(table, flatId).catch(() => {});
    return { query, executed: true, affected };
  }

  updateField(table: string, flatId: string, fieldName: string, value: unknown): QueryResult {
    const docs = readSeed(table);
    let affected = 0;
    for (const doc of docs) {
      if (String(doc._id ?? doc.id) === flatId) {
        doc[fieldName] = value;
        doc.updated_at = new Date().toISOString();
        doc.last_edited_by = 'app';
        affected++;
        break;
      }
    }
    if (affected) writeSeed(table, docs);

    const query = [
      `db.${table}.updateOne(`,
      `  { _id: ${mongoLit(flatId)} },`,
      `  { $set: { ${fieldName}: ${mongoLit(value)}, updated_at: new Date(), last_edited_by: "app" } }`,
      `)`,
    ].join('\n');
    logQuery('mongodb', 'UPDATE', table, query, affected);
    mongoUpdate(table, flatId, { [fieldName]: value }).catch(() => {});
    return { query, executed: true, affected };
  }

  addColumn(table: string, columnName: string, propType = 'text'): QueryResult {
    // MongoDB is schema-less — adding a column means setting a default on all docs
    const docs = readSeed(table);
    const defaultVal = getDefault(propType);
    for (const doc of docs) {
      if (!(columnName in doc)) doc[columnName] = defaultVal;
    }
    writeSeed(table, docs);

    const bsonType = PROP_TO_BSON[propType] ?? 'String';
    const query = [
      `// Add field "${columnName}" (${bsonType}) to all documents`,
      `db.${table}.updateMany(`,
      `  {},`,
      `  { $set: { ${columnName}: ${mongoLit(defaultVal)} } }`,
      `)`,
    ].join('\n');
    logQuery('mongodb', 'ADD_COLUMN', table, query, docs.length);
    return { query, executed: true, affected: docs.length };
  }

  removeColumn(table: string, columnName: string): QueryResult {
    const docs = readSeed(table);
    for (const doc of docs) delete doc[columnName];
    writeSeed(table, docs);

    const query = [
      `db.${table}.updateMany(`,
      `  {},`,
      `  { $unset: { ${columnName}: "" } }`,
      `)`,
    ].join('\n');
    logQuery('mongodb', 'DROP_COLUMN', table, query, docs.length);
    return { query, executed: true, affected: docs.length };
  }

  changeColumnType(table: string, columnName: string, _old: string, newType: string): QueryResult {
    const bsonType = PROP_TO_BSON[newType] ?? 'String';
    const query = [
      `// Change "${columnName}" type to ${bsonType}`,
      `db.${table}.find().forEach(doc => {`,
      `  db.${table}.updateOne(`,
      `    { _id: doc._id },`,
      `    [{ $set: { ${columnName}: { $convert: { input: "$${columnName}", to: "${bsonType.toLowerCase()}" } } } }]`,
      `  )`,
      `})`,
    ].join('\n');
    logQuery('mongodb', 'ALTER_TYPE', table, query, 0);
    return { query, executed: true, affected: 0 };
  }
}

function getDefault(propType: string): unknown {
  switch (propType) {
    case 'number': return 0;
    case 'checkbox': return false;
    case 'multi_select': case 'relation': return [];
    case 'date': case 'created_time': case 'last_edited_time': return null;
    default: return '';
  }
}
