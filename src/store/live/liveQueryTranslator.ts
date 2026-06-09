/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   liveQueryTranslator.ts                             :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/09 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/09 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * PageQuery (the adapter contract's DocFilter) → the data-plane filter wire
 * grammar, built against data-plane-core/src/filter.rs reality:
 * - `{col: {"$op": v}}` with ops $eq $ne $lt $lte $gt $gte $like $ilike $in
 *   $between $null; `{"$and": [..]}` / `{"$or": [..]}` / `{"$not": f}`.
 * - field names must not start with `$`; `$in` lists are capped at 1000.
 * - `$null: true` → IS NULL, `$null: false` → IS NOT NULL.
 * Mapping: eq→$eq, neq→$ne, in→$in, nin→$not($in), gt/gte/lt/lte→same,
 * contains(string)→$ilike '%v%' (escaped), exists→$null(!exists).
 * Anything unmappable is OMITTED server-side and reported in `clientSide` —
 * the views already filter client-side over loaded pages.
 * Sort: only the FIRST entry is sent (the wire sort is a BTreeMap, so multi-
 * key order would not survive); the rest stays client-side.
 */

import type { PageQuery } from '../../component/types';
import type { LiveListParams } from './liveTypes';

/** The router caps `limit` at 1..500 (query.dto.ts). */
export const LIVE_MAX_LIMIT = 500;
const LIVE_MAX_IN = 1000;

/** Server-side params + the propertyId:op pairs left for client-side filtering. */
export interface LiveQueryTranslation {
  params: LiveListParams;
  clientSide: string[];
}

/** Escape LIKE wildcards so `contains` matches literally (`\` default escape). */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

function translateColumn(
  column: string,
  ops: Record<string, unknown>,
  clientSide: string[],
): Record<string, unknown>[] {
  if (column.startsWith('$')) {
    clientSide.push(`${column}:*`);
    return [];
  }
  const nodes: Record<string, unknown>[] = [];
  const direct: Record<string, unknown> = {};
  const simple: Record<string, string> = {
    eq: '$eq', neq: '$ne', gt: '$gt', gte: '$gte', lt: '$lt', lte: '$lte',
  };
  for (const [op, value] of Object.entries(ops)) {
    if (value === undefined) continue;
    if (op in simple) direct[simple[op]] = value;
    else if (op === 'in' && Array.isArray(value) && value.length <= LIVE_MAX_IN) direct.$in = value;
    else if (op === 'nin' && Array.isArray(value) && value.length <= LIVE_MAX_IN) {
      nodes.push({ $not: { [column]: { $in: value } } });
    } else if (op === 'contains' && typeof value === 'string') {
      direct.$ilike = `%${escapeLikePattern(value)}%`;
    } else if (op === 'exists' && typeof value === 'boolean') direct.$null = !value;
    else clientSide.push(`${column}:${op}`);
  }
  if (Object.keys(direct).length > 0) nodes.push({ [column]: direct });
  return nodes;
}

/** Translate a PageQuery into `{ filter, sort, limit }` per the wire grammar. */
export function translateLivePageQuery(query: PageQuery): LiveQueryTranslation {
  const clientSide: string[] = [];
  const params: LiveListParams = {};
  const nodes: Record<string, unknown>[] = [];

  for (const [column, ops] of Object.entries(query.filter ?? {})) {
    if (!ops || typeof ops !== 'object') continue;
    nodes.push(...translateColumn(column, ops as Record<string, unknown>, clientSide));
  }
  if (nodes.length === 1) params.filter = nodes[0];
  else if (nodes.length > 1) params.filter = { $and: nodes };

  const sorts = query.sort ?? [];
  const first = sorts[0];
  if (first && !first.propertyId.startsWith('$')) {
    params.sort = { [first.propertyId]: first.direction };
  }
  for (const skipped of sorts.slice(1)) clientSide.push(`${skipped.propertyId}:sort`);

  if (typeof query.limit === 'number' && Number.isFinite(query.limit)) {
    params.limit = Math.min(Math.max(Math.trunc(query.limit), 1), LIVE_MAX_LIMIT);
  }
  return { params, clientSide };
}
