/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   liveDdlMapper.ts                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/10 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * SchemaProperty → DDL request bodies for `POST /query/v1/:dbId/schema/ddl`
 * (the reverse of liveSchemaMapper, wire shape per schema-ddl.dto.ts). Type
 * choices: select → enum (enum_values = option values), number → 'decimal'
 * (the safe superset — no integer hint exists in a notion schema and a float
 * pick would corrupt money-like columns), checkbox → boolean, date →
 * 'datetime' (a date-only pick would truncate times the UI writes), text-ish
 * (text/url/email/phone/title) → text, multi_select → array. relation is OUT
 * of v1 scope (FK creation needs a target-table pk contract) and everything
 * else (formula, rollup, …) has no honest engine shape — both are reported
 * `unsupported` and surfaced, never guessed. Destructive ops carry
 * `confirm: true`: the UI's property-delete is already a deliberate
 * danger-styled menu action, which is the confirmation surface.
 */

import type { SchemaProperty } from '../../component/types';

/** Wire `ddl.column` shape (schema-ddl.dto.ts SchemaDdlColumnDto). */
export interface LiveDdlColumnDef {
  name: string;
  normalized_type: 'text' | 'integer' | 'float' | 'decimal' | 'boolean' | 'date' | 'datetime' | 'json' | 'uuid' | 'enum' | 'array';
  nullable?: boolean;
  default?: string | null;
  enum_values?: string[] | null;
}

export interface LiveDdlMapping {
  column?: LiveDdlColumnDef;
  unsupported?: string;
}

const TEXTUAL_TYPES = new Set(['text', 'url', 'email', 'phone', 'title']);

/** Property display name → a safe engine column name (snake_case identifier);
 *  null when nothing identifier-like remains. */
export function sanitizeLiveColumnName(name: string): string | null {
  const cleaned = name
    .trim()
    .replace(/([a-z\d])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/__+/g, '_');
  if (!cleaned || !/^[a-z_]/.test(cleaned)) return null;
  return cleaned.slice(0, 63);
}

/** One property → the DdlColumnDef it maps to (or why it can't). */
export function schemaPropertyToDdlColumn(property: SchemaProperty, columnName: string): LiveDdlMapping {
  if (property.type === 'select') {
    const values = (property.options ?? []).map((option) => option.value).filter(Boolean);
    if (values.length === 0) {
      return { unsupported: `select property "${property.name}" needs at least one option to become an enum column` };
    }
    return { column: { name: columnName, normalized_type: 'enum', nullable: true, enum_values: values } };
  }
  if (property.type === 'number') return { column: { name: columnName, normalized_type: 'decimal', nullable: true } };
  if (property.type === 'checkbox') return { column: { name: columnName, normalized_type: 'boolean', nullable: true } };
  if (property.type === 'date') return { column: { name: columnName, normalized_type: 'datetime', nullable: true } };
  if (property.type === 'multi_select') return { column: { name: columnName, normalized_type: 'array', nullable: true } };
  if (TEXTUAL_TYPES.has(property.type)) return { column: { name: columnName, normalized_type: 'text', nullable: true } };
  if (property.type === 'relation') {
    return { unsupported: `relation property "${property.name}" — live FK creation is out of scope for now` };
  }
  return { unsupported: `property "${property.name}" (${property.type}) has no honest engine column shape` };
}

/** add_column request for a UI-added property; `skipped` explains a refusal. */
export function ddlAddColumnRequest(
  table: string,
  property: SchemaProperty,
): { request?: Record<string, unknown>; skipped?: string } {
  const columnName = sanitizeLiveColumnName(property.name) ?? sanitizeLiveColumnName(property.id);
  if (!columnName) return { skipped: `property "${property.name}" has no usable column name` };
  const mapping = schemaPropertyToDdlColumn(property, columnName);
  if (!mapping.column) return { skipped: mapping.unsupported };
  return { request: { op: 'add_column', table, column: mapping.column } };
}

/** drop_column request — destructive, so `confirm: true` (see module doc). */
export function ddlDropColumnRequest(table: string, columnName: string): Record<string, unknown> {
  return { op: 'drop_column', table, column_name: columnName, confirm: true };
}

/** alter_column_type request with the FULL target definition (attributes the
 *  mapping omits — nullable/default — are preserved by the service's merge). */
export function ddlRetypeRequest(
  table: string,
  property: SchemaProperty,
): { request?: Record<string, unknown>; skipped?: string } {
  const mapping = schemaPropertyToDdlColumn(property, property.id);
  if (!mapping.column) return { skipped: mapping.unsupported };
  const { nullable: _keepCurrent, ...target } = mapping.column;
  return { request: { op: 'alter_column_type', table, column: target } };
}
