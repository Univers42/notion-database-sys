/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   liveAggregateClient.ts                             :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/10 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── liveAggregateClient — op=aggregate matrices for chart server truth ─────
// `POST /query/v1/:dbId/tables/:table` with op:"aggregate" computes
// COUNT/SUM/AVG/MIN/MAX (+ up to 2-column GROUP BY for breakdowns) inside the
// engine — true numbers over the WHOLE table, not the adapter's 200-row load.
// Capability-gated: only call when `schema.capabilities.aggregate === true`.

import { requestLive } from './liveMountClient';
import { matrixFromRows } from './liveAggregateParse';
import type { AggregateMatrixCell, LiveAggregateFunc } from './liveAggregateParse';

export type { AggregateMatrixCell, LiveAggregateFunc } from './liveAggregateParse';
export { matrixFromRows } from './liveAggregateParse';

export interface AggregateMatrixParams {
  dbId: string;
  table: string;
  func: LiveAggregateFunc;
  /** Column fed into func() — omitted for count. */
  valueColumn?: string;
  /** GROUP BY column for chart x categories. */
  xColumn: string;
  /** Optional second GROUP BY column for breakdown series. */
  subColumn?: string;
  filter?: Record<string, unknown>;
}

interface AggregateResponse {
  rows: Record<string, unknown>[];
  rowCount: number;
}

const VALUE_ALIAS = 'v';

// In-flight dedup: a dashboard board can mount several cells bound to the same
// (dbId, table, plan) — and the same view appears across boards — each firing
// its own POST on mount/poll. Collapse identical concurrent requests onto one
// promise. The entry is dropped on settle, so there is NO TTL/staleness: the
// next poll re-fetches fresh, the 15s cadence and realtime freshness unchanged.
const inflight = new Map<string, Promise<AggregateMatrixCell[]>>();

/** Runs one grouped aggregate and parses it into matrix cells (deduped). */
export function aggregateMatrix(params: AggregateMatrixParams): Promise<AggregateMatrixCell[]> {
  const key = JSON.stringify(params);
  const hit = inflight.get(key);
  if (hit) return hit;
  const pending = runAggregate(params).finally(() => inflight.delete(key));
  inflight.set(key, pending);
  return pending;
}

async function runAggregate(params: AggregateMatrixParams): Promise<AggregateMatrixCell[]> {
  const groupBy = params.subColumn ? [params.xColumn, params.subColumn] : [params.xColumn];
  const aggregate = {
    groupBy,
    aggregates: [{
      func: params.func,
      ...(params.valueColumn ? { field: params.valueColumn } : {}),
      alias: VALUE_ALIAS,
    }],
  };
  const path = `/api/databases/${encodeURIComponent(params.dbId)}/tables/${encodeURIComponent(params.table)}`;
  const response = await requestLive<AggregateResponse>(path, {
    method: 'POST',
    body: JSON.stringify({ op: 'aggregate', filter: params.filter, aggregate }),
  });
  return matrixFromRows(response.rows, params.xColumn, params.subColumn, VALUE_ALIAS);
}
