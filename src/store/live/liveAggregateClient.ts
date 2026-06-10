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

/** Runs one grouped aggregate and parses it into matrix cells. */
export async function aggregateMatrix(params: AggregateMatrixParams): Promise<AggregateMatrixCell[]> {
  const groupBy = params.subColumn ? [params.xColumn, params.subColumn] : [params.xColumn];
  const aggregate = {
    groupBy,
    aggregates: [{
      func: params.func,
      ...(params.valueColumn ? { field: params.valueColumn } : {}),
      alias: VALUE_ALIAS,
    }],
  };
  const path = `/query/v1/${encodeURIComponent(params.dbId)}/tables/${encodeURIComponent(params.table)}`;
  const response = await requestLive<AggregateResponse>(path, {
    method: 'POST',
    body: JSON.stringify({ op: 'aggregate', filter: params.filter, aggregate }),
  });
  return matrixFromRows(response.rows, params.xColumn, params.subColumn, VALUE_ALIAS);
}
