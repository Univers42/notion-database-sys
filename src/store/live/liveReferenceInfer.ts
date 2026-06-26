/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   liveReferenceInfer.ts                              :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/26 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/26 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * Engine-agnostic foreign-key-by-convention. A `<base>_id` / `<base>_ref`
 * column whose base resolves to a SIBLING table on the same mount is surfaced
 * as a `references` so the grid renders it as a relation (a tag showing the
 * referenced record's title) instead of a bare number. This fills the gap for
 * engines that don't report real FK metadata (sqlite, mssql, mongo, dynamodb);
 * postgres/mysql already carry real `references` from information_schema and
 * always win. Mirrors the query-router graph heuristic
 * (`graph.generators.ts:fkBase/pluralCandidates`). Only same-mount targets are
 * inferred — the grid can't resolve a relation into another mount. Pure.
 */

import type { LiveMountTableSet } from './liveCrossMount';
import type {
  LiveColumnSchema,
  LiveForeignKeyRef,
  LiveSchemaResponse,
  LiveTableSchema,
} from './liveTypes';

/** Ownership/tenancy stamps that look like FKs but collapse every row onto one
 *  owner — never a meaningful relation. */
const FK_STAMPS = new Set(['owner_id', 'tenant_id', 'owner_pk', 'owner']);

/** The reference base of a key column — `<base>_id` or `<base>_ref` — else null. */
function fkBase(field: string): string | null {
  if (FK_STAMPS.has(field)) return null;
  if (field.endsWith('_id') && field.length > 3) return field.slice(0, -3);
  if (field.endsWith('_ref') && field.length > 4) return field.slice(0, -4);
  return null;
}

/** Candidate table names for a base: singular + common plural inflections
 *  (`device`→[device, devices]; `company`→[…, companies]; `box`→[…, boxes]). */
function pluralCandidates(base: string): string[] {
  const out = [base, `${base}s`];
  if (/[^aeiou]y$/.test(base)) out.push(`${base.slice(0, -1)}ies`);
  if (/(s|x|z|ch|sh)$/.test(base)) out.push(`${base}es`);
  return out;
}

/** A schema with convention-inferred `references` filled in. Real FK metadata
 *  is kept as-is; returns the SAME object when nothing was inferred. */
export function inferLiveReferences(
  schema: LiveSchemaResponse,
  ownDbId?: string,
  crossMount?: LiveMountTableSet[],
): LiveSchemaResponse {
  const byName = new Map<string, LiveTableSchema>();
  for (const table of schema.tables) byName.set(table.name.toLowerCase(), table);
  const others = (crossMount ?? []).filter((mount) => mount.dbId !== ownDbId);
  const resolve = (base: string): LiveForeignKeyRef | null => resolveFkTarget(base, byName, others);
  let anyChange = false;
  const tables = schema.tables.map((table) => {
    let tableChanged = false;
    const columns = table.columns.map((column) => {
      const inferred = inferColumnReference(column, table.name, resolve);
      if (inferred !== column) {
        tableChanged = true;
        anyChange = true;
      }
      return inferred;
    });
    return tableChanged ? { ...table, columns } : table;
  });
  return anyChange ? { ...schema, tables } : schema;
}

/** Resolve a FK base to a target ref: own mount first (same-mount, no dbId),
 *  else exactly ONE other mount owning the table (cross-mount, carries dbId);
 *  ambiguous (≥2 other mounts) or unknown → null. Mirrors the query-router
 *  graph `resolveTarget`. */
function resolveFkTarget(
  base: string,
  byName: Map<string, LiveTableSchema>,
  others: LiveMountTableSet[],
): LiveForeignKeyRef | null {
  const candidates = pluralCandidates(base.toLowerCase());
  for (const candidate of candidates) {
    const hit = byName.get(candidate);
    if (hit) return { table: hit.name, column: hit.primary_key[0] ?? 'id' };
  }
  let found: LiveForeignKeyRef | null = null;
  let matches = 0;
  for (const mount of others) {
    const table = mount.tables.find((name) => candidates.includes(name.toLowerCase()));
    if (table) {
      found = { table, column: 'id', dbId: mount.dbId };
      matches += 1;
    }
  }
  return matches === 1 ? found : null;
}

/** One column → itself, or a copy with a convention `references` when its name
 *  is a `<base>_id`/`_ref` resolving to another table (same mount, or exactly
 *  one other mount). A same-mount self-reference is left as-is. */
function inferColumnReference(
  column: LiveColumnSchema,
  ownTable: string,
  resolve: (base: string) => LiveForeignKeyRef | null,
): LiveColumnSchema {
  if (column.references) return column;
  const base = fkBase(column.name);
  if (base === null) return column;
  const target = resolve(base);
  if (target === null || (target.dbId === undefined && target.table === ownTable)) return column;
  return { ...column, references: target };
}
