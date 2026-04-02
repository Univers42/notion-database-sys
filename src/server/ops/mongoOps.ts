// ─── MongoDB ops adapter ─────────────────────────────────────────────────────
// Generates MongoDB shell-style commands, logs them, and executes against
// the live container.  NO seed file writes — seed files are never modified
// at runtime.  The Docker container is the source of truth for mongodb source.

import type { DbmsAdapter, QueryResult } from './types';
import { PROP_TO_BSON } from './types';
import { mongoLit } from './helpers';
import { logQuery } from './queryLog';
import { mongoInsert, mongoDelete, mongoUpdate } from '../db/mongoClient';

export class MongoOps implements DbmsAdapter {
  readonly sourceType = 'mongodb' as const;

  insertRecord(table: string, flatRecord: Record<string, unknown>): QueryResult {
    const doc: Record<string, unknown> = { _id: flatRecord.id, ...flatRecord };
    delete doc.id;
    const docStr = JSON.stringify(doc, null, 2);
    const query = `db.${table}.insertOne(${docStr})`;
    logQuery('mongodb', 'INSERT', table, query, 1);
    mongoInsert(table, doc).catch(() => {});
    return { query, executed: true, affected: 1 };
  }

  deleteRecord(table: string, flatId: string): QueryResult {
    const query = `db.${table}.deleteOne({ _id: ${mongoLit(flatId)} })`;
    logQuery('mongodb', 'DELETE', table, query, 1);
    mongoDelete(table, flatId).catch(() => {});
    return { query, executed: true, affected: 1 };
  }

  updateField(table: string, flatId: string, fieldName: string, value: unknown): QueryResult {
    const query = [
      `db.${table}.updateOne(`,
      `  { _id: ${mongoLit(flatId)} },`,
      `  { $set: { ${fieldName}: ${mongoLit(value)}, updated_at: new Date(), last_edited_by: "app" } }`,
      `)`,
    ].join('\n');
    logQuery('mongodb', 'UPDATE', table, query, 1);
    mongoUpdate(table, flatId, { [fieldName]: value }).catch(() => {});
    return { query, executed: true, affected: 1 };
  }

  addColumn(table: string, columnName: string, propType = 'text'): QueryResult {
    const bsonType = PROP_TO_BSON[propType] ?? 'String';
    const defaultVal = getDefault(propType);
    const query = [
      `// Add field "${columnName}" (${bsonType}) to all documents`,
      `db.${table}.updateMany(`,
      `  {},`,
      `  { $set: { ${columnName}: ${mongoLit(defaultVal)} } }`,
      `)`,
    ].join('\n');
    logQuery('mongodb', 'ADD_COLUMN', table, query, 0);
    return { query, executed: true, affected: 0 };
  }

  removeColumn(table: string, columnName: string): QueryResult {
    const query = [
      `db.${table}.updateMany(`,
      `  {},`,
      `  { $unset: { ${columnName}: "" } }`,
      `)`,
    ].join('\n');
    logQuery('mongodb', 'DROP_COLUMN', table, query, 0);
    return { query, executed: true, affected: 0 };
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
