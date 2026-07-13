/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   normalizeDatabases.ts                              :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/12 00:00:00 by dlesieur          #+#    #+#             */
/*                                                +#+#+#+#+#+   +#+           */
/* ************************************************************************** */

/**
 * A `DatabaseSchema.properties` map is contract-required, but databases loaded
 * from persisted state (an older schema version) or rebuilt by a live-mount
 * mapper can reach the store with `properties === undefined`. Every consumer
 * that does `Object.values(db.properties)` — the Sort/Filter panels first, but
 * also conditional-color, board group-by, and chart/map axes — then throws
 * `TypeError: Cannot convert undefined or null to object` and the database
 * error boundary blanks the whole block.
 *
 * Backfill the missing map to `{}` at the ingestion boundary so no malformed
 * database ever reaches a consumer. Returns the SAME ref when every database is
 * already valid (mirrors `applyStoredDbMeta`) so a clean load triggers no
 * needless store update / re-render.
 */

import type { DatabaseSchema } from '../../component/types';

export function normalizeDatabases(
  databases: Record<string, DatabaseSchema>,
): Record<string, DatabaseSchema> {
  let next: Record<string, DatabaseSchema> | null = null;
  for (const [id, database] of Object.entries(databases)) {
    if (database.properties) continue;
    next = next ?? { ...databases };
    next[id] = { ...database, properties: {} };
  }
  return next ?? databases;
}
