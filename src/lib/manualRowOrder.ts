// ─── manualRowOrder — pure helpers for drag-reordering view rows ─────────────
// The order is a ranked list of page ids on view.settings.manualRowOrder:
// ranked pages sort by rank, unranked pages follow in creation order (so new
// records land at the bottom, Notion-style). Pure functions → unit-tested.

interface OrderablePage {
  id: string;
  createdAt?: string;
}

/** Comparator honoring a manual rank map, falling back to creation order. */
export function compareWithManualOrder(
  a: OrderablePage,
  b: OrderablePage,
  rank: ReadonlyMap<string, number> | null,
): number {
  if (rank) {
    const rankA = rank.get(a.id);
    const rankB = rank.get(b.id);
    if (rankA !== undefined && rankB !== undefined) return rankA - rankB;
    if (rankA !== undefined) return -1;
    if (rankB !== undefined) return 1;
  }
  return (a.createdAt || "").localeCompare(b.createdAt || "");
}

/** Builds the rank map once per sort. */
export function manualOrderRank(order: readonly string[] | undefined): Map<string, number> | null {
  if (!order || order.length === 0) return null;
  return new Map(order.map((id, index) => [id, index]));
}

/**
 * New manual order after dropping `draggedId` onto `targetId`: the dragged id
 * takes the target's slot (same splice semantics as column reorder). Built
 * from the CURRENTLY VISIBLE row order, so it is always self-consistent.
 * ponytail: with active filters only visible rows get ranked — hidden rows
 * keep creation order after them; full-order splicing can come later.
 */
export function buildManualRowOrder(
  visibleIds: readonly string[],
  draggedId: string,
  targetId: string,
): string[] | null {
  if (draggedId === targetId) return null;
  const order = [...visibleIds];
  const fromIdx = order.indexOf(draggedId);
  const toIdx = order.indexOf(targetId);
  if (fromIdx === -1 || toIdx === -1) return null;
  // Same splice semantics as column reorder (TableHeader): the target index is
  // captured BEFORE removal, so dragging down lands after the target and
  // dragging up lands before it.
  order.splice(fromIdx, 1);
  order.splice(toIdx, 0, draggedId);
  return order;
}

/**
 * Manual order placing `draggedId` explicitly before/after `targetId` —
 * board cards drop on a card's top or bottom half, so the edge is known
 * (unlike the table's take-the-slot splice).
 */
export function buildManualRowOrderAt(
  visibleIds: readonly string[],
  draggedId: string,
  targetId: string,
  after: boolean,
): string[] | null {
  if (draggedId === targetId) return null;
  const order = visibleIds.filter(id => id !== draggedId);
  const idx = order.indexOf(targetId);
  if (idx === -1) return null;
  order.splice(idx + (after ? 1 : 0), 0, draggedId);
  return order;
}
