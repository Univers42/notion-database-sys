// ─── groupRowsLayout — a grouped table body as one flat list of <tr>s ────────
// Grouping used to render every group's rows outside the virtualizer, so a
// "Load all" view of 5k rows mounted 488k DOM nodes (13.6 s to switch to it).
// Flattened, the grouped body windows exactly like the ungrouped one, and the
// visible rows in visual order (`rowPages`) drive keyboard nav and fill-drag.

import type { Page } from '../../../types/database';

export interface GroupData {
  groupId: string;
  groupLabel: string;
  groupColor: string;
  pages: Page[];
}

export type GroupRowItem =
  | { kind: 'header'; group: GroupData; collapsed: boolean }
  | { kind: 'row'; group: GroupData; page: Page; rowIdx: number }
  | { kind: 'more'; group: GroupData; shown: number }
  | { kind: 'empty'; group: GroupData }
  | { kind: 'new'; group: GroupData };

export interface GroupRowsLayout {
  items: GroupRowItem[];
  /** Rendered rows in visual order; `rowIdx` indexes this. */
  rowPages: Page[];
  /** rowIdx → index in `items`, for scrolling a row into view. */
  itemIndexOfRow: number[];
}

export function layoutGroupRows(
  groups: readonly GroupData[],
  collapsed: ReadonlySet<string>,
  shownFor: (groupId: string) => number,
): GroupRowsLayout {
  const items: GroupRowItem[] = [];
  const rowPages: Page[] = [];
  const itemIndexOfRow: number[] = [];
  for (const group of groups) {
    const isCollapsed = collapsed.has(group.groupId);
    items.push({ kind: 'header', group, collapsed: isCollapsed });
    if (isCollapsed) continue;
    const shown = Math.min(group.pages.length, Math.max(0, shownFor(group.groupId)));
    for (let i = 0; i < shown; i++) {
      itemIndexOfRow.push(items.length);
      items.push({ kind: 'row', group, page: group.pages[i], rowIdx: rowPages.length });
      rowPages.push(group.pages[i]);
    }
    if (shown < group.pages.length) items.push({ kind: 'more', group, shown });
    if (group.pages.length === 0) items.push({ kind: 'empty', group });
    items.push({ kind: 'new', group });
  }
  return { items, rowPages, itemIndexOfRow };
}
