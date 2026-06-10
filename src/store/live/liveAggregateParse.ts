/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   liveAggregateParse.ts                              :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/10 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── liveAggregateParse — pure op=aggregate wire-shape parsing ──────────────
// Zero runtime imports so node:test can exercise it without the transport.

/** Aggregate functions the query-router accepts (median is client-only). */
export type LiveAggregateFunc = 'count' | 'sum' | 'avg' | 'min' | 'max';

/** One matrix cell: raw group values (null = SQL NULL group) + aggregate. */
export interface AggregateMatrixCell {
  x: string | null;
  sub: string | null;
  value: number;
}

/** Parses aggregate rows (`{ <x>, <sub>?, <alias> }`) into matrix cells. */
export function matrixFromRows(
  rows: Record<string, unknown>[],
  xColumn: string,
  subColumn: string | undefined,
  alias: string,
): AggregateMatrixCell[] {
  return rows.map(row => ({
    x: row[xColumn] === null || row[xColumn] === undefined ? null : String(row[xColumn]),
    sub: subColumn
      ? (row[subColumn] === null || row[subColumn] === undefined ? null : String(row[subColumn]))
      : null,
    value: Number(row[alias] ?? 0),
  }));
}
