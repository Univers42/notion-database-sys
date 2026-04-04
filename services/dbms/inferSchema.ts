/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   inferSchema.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 15:10:46 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 15:10:47 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// Derives DbFieldSchema[] from a sample of DbRecord objects.

import type { DbFieldSchema, DbRecord } from './types.ts';

type FieldType = DbFieldSchema['type'];

/** Infer the field type from a JS value. */
function inferType(value: unknown): FieldType {
  if (value === null || value === undefined) return 'unknown';
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'date';
    return 'string';
  }
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return 'object';
  return 'unknown';
}

/** Build a DbFieldSchema array by scanning all records. */
export function inferSchema(records: DbRecord[]): DbFieldSchema[] {
  if (records.length === 0) return [];

  const fieldMap = new Map<string, { types: Set<FieldType>; hasNull: boolean }>();

  for (const record of records) {
    for (const [key, value] of Object.entries(record)) {
      let entry = fieldMap.get(key);
      if (!entry) {
        entry = { types: new Set(), hasNull: false };
        fieldMap.set(key, entry);
      }
      if (value === null || value === undefined) {
        entry.hasNull = true;
      } else {
        entry.types.add(inferType(value));
      }
    }
    // Mark fields missing from this record as nullable
    for (const [key, entry] of fieldMap) {
      if (!(key in record)) entry.hasNull = true;
    }
  }

  const fields: DbFieldSchema[] = [];
  for (const [name, { types, hasNull }] of fieldMap) {
    const typeArr = [...types];
    const type: FieldType = typeArr.length === 1 ? typeArr[0] : 'unknown';
    fields.push({ name, type, nullable: hasNull });
  }
  return fields;
}
