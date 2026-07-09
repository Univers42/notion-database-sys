// ─── viewOrder — a database's views in the user's saved tab order ────────────
// Order is persisted as `database.viewOrder` (an explicit id array, so it
// survives JSONB/JSON round-trips where object key order does not). Views not
// in it fall to the end in their existing (creation) order — new views append,
// stale ids in viewOrder are simply ignored. Pure → unit-testable.

import type { ViewConfig } from '../types/database';

/** The views of one database, sorted by its persisted `viewOrder`. Filters by
 *  `databaseId` (always defined) so it works even before the database object
 *  itself has loaded; `viewOrder` (from the database, when present) drives order. */
export function orderedDatabaseViews(
  views: Record<string, ViewConfig>,
  databaseId: string,
  viewOrder?: readonly string[],
): ViewConfig[] {
  const list = Object.values(views).filter((v) => v.databaseId === databaseId);
  if (!viewOrder || viewOrder.length === 0) return list;
  const rank = new Map(viewOrder.map((id, i) => [id, i]));
  // Stable sort: unranked views keep their relative (creation) order at the end.
  return [...list].sort((a, b) => (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity));
}
