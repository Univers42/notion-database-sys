/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   types.ts                                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/03 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 13:58:30 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

export type DbSourceType = 'json' | 'csv' | 'mongodb' | 'postgresql';

/** Result returned by every adapter method. */
export interface QueryResult {
  /** Human-readable query/command that was generated. */
  query: string;
  /** Whether the query was actually executed (always true for file-based). */
  executed: boolean;
  /** Number of rows/documents affected. */
  affected: number;
}

/** Map database-id → flat table/collection name. */
export const DB_TO_TABLE: Record<string, string> = {
  'db-tasks': 'tasks',
  'db-crm': 'contacts',
  'db-content': 'content',
  'db-inventory': 'inventory',
  'db-products': 'products',
  'db-projects': 'projects',
};

/** Notion property type → PostgreSQL column type. */
export const PROP_TO_SQL: Record<string, string> = {
  title: 'TEXT', text: 'TEXT', number: 'NUMERIC(12,2)',
  select: 'VARCHAR(100)', multi_select: 'TEXT[]', status: 'VARCHAR(50)',
  date: 'TIMESTAMPTZ', checkbox: 'BOOLEAN DEFAULT FALSE',
  person: 'VARCHAR(100)', user: 'VARCHAR(100)',
  url: 'TEXT', email: 'VARCHAR(200)', phone: 'VARCHAR(50)',
  files_media: 'TEXT', id: 'VARCHAR(50)',
  created_time: 'TIMESTAMPTZ DEFAULT NOW()',
  last_edited_time: 'TIMESTAMPTZ DEFAULT NOW()',
  created_by: 'VARCHAR(100)', last_edited_by: 'VARCHAR(100)',
  assigned_to: 'VARCHAR(100)', due_date: 'TIMESTAMPTZ',
  relation: 'TEXT[]', formula: 'TEXT', rollup: 'TEXT', custom: 'TEXT',
};

/** Notion property type → MongoDB BSON type string. */
export const PROP_TO_BSON: Record<string, string> = {
  title: 'String', text: 'String', number: 'Double',
  select: 'String', multi_select: 'Array', status: 'String',
  date: 'Date', checkbox: 'Boolean',
  person: 'String', user: 'String',
  url: 'String', email: 'String', phone: 'String',
  files_media: 'String', id: 'String',
  created_time: 'Date', last_edited_time: 'Date',
  created_by: 'String', last_edited_by: 'String',
  relation: 'Array', formula: 'String', rollup: 'String',
};

/** Interface every DBMS adapter must implement. */
export interface DbmsAdapter {
  readonly sourceType: DbSourceType;

  insertRecord(
    table: string, flatRecord: Record<string, unknown>,
    fieldMap: Record<string, string>,
  ): QueryResult;

  deleteRecord(
    table: string, flatId: string,
    fieldMap: Record<string, string>,
  ): QueryResult;

  updateField(
    table: string, flatId: string,
    fieldName: string, value: unknown,
    fieldMap: Record<string, string>,
  ): QueryResult;

  addColumn(
    table: string, columnName: string, propType: string,
  ): QueryResult;

  removeColumn(
    table: string, columnName: string,
  ): QueryResult;

  changeColumnType(
    table: string, columnName: string,
    oldType: string, newType: string,
  ): QueryResult;
}
