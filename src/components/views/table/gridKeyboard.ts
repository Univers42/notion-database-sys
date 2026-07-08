/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   gridKeyboard.ts                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * Pure keyboard/navigation logic for the table grid — no React, no DOM, so it
 * unit-tests exhaustively across every property type. The hook `useTableKeyboard`
 * and the click handlers in `useTableViewState` are thin wiring over this.
 *
 * Focus model (spreadsheet-like, 3 levels):
 *   - Level 0: focus outside the grid.
 *   - Level 1: a cell is *selected* (ring, no editor) — arrows/Tab/Home/End/
 *     PageUp-Down move it; Enter/double-click *activates* it.
 *   - Level 2: the cell is *editing/activated* (inline input or popover).
 * Escape unwinds one level: editor → selected → out of grid.
 */

/** A logical cell coordinate — the grid tracks focus logically (not via DOM
 *  `.focus()`) because the virtualized body unmounts off-screen rows. */
export interface CellCoord {
  pageId: string;
  propId: string;
}

/** What pressing Enter (or double-clicking) on a focused cell of this type does. */
export type CellActivation = 'edit' | 'toggle' | 'button' | 'formula' | 'readonly';

/** Computed/system-owned types (or types with no inline editor): Enter is a
 *  no-op and Delete must never clear them. `formula` is handled before this set
 *  (it opens its own panel); the rest are genuinely non-writable from the grid.
 *  (`files_media` IS editable — it has FilesCellEditor — so it is NOT here.) */
const NON_EDITABLE_TYPES = new Set<string>([
  'id',
  'rollup',
  'created_time',
  'last_edited_time',
  'created_by',
  'last_edited_by',
  // Display-only (avatars projected from a relation; no picker in the grid):
  'assigned_to',
]);

/** The single source of truth for "what does Enter do on this cell type",
 *  replacing the two divergent read-only sets that used to disagree. */
export function resolveCellActivation(type: string): CellActivation {
  if (type === 'checkbox') return 'toggle';
  if (type === 'button') return 'button';
  if (type === 'formula') return 'formula';
  if (NON_EDITABLE_TYPES.has(type)) return 'readonly';
  return 'edit';
}

/** Delete/Backspace clears the cell only when it holds user-writable data. */
export function isClearableType(type: string): boolean {
  return type === 'checkbox' || resolveCellActivation(type) === 'edit';
}

/** The value a cleared cell is reset to, by type (default empty string). */
export const CLEAR_VALUE_BY_TYPE: Record<string, unknown> = {
  checkbox: false,
  multi_select: [],
  relation: [],
  assigned_to: [],
  files_media: [],
};

export type GridDirection =
  | 'up' | 'down' | 'left' | 'right'
  | 'rowStart' | 'rowEnd' | 'gridStart' | 'gridEnd'
  | 'pageUp' | 'pageDown';

interface HasId { id: string }

/** Maps a keyboard event to a navigation direction (or null if it isn't one).
 *  Ctrl/Cmd+Home/End jump to the grid corners; plain Home/End to the row ends. */
export function directionForKey(e: { key: string; ctrlKey?: boolean; metaKey?: boolean }): GridDirection | null {
  const jump = Boolean(e.ctrlKey || e.metaKey);
  switch (e.key) {
    case 'ArrowUp': return 'up';
    case 'ArrowDown': return 'down';
    case 'ArrowLeft': return 'left';
    case 'ArrowRight': return 'right';
    case 'Home': return jump ? 'gridStart' : 'rowStart';
    case 'End': return jump ? 'gridEnd' : 'rowEnd';
    case 'PageUp': return 'pageUp';
    case 'PageDown': return 'pageDown';
    default: return null;
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Pure: the next focused cell for a navigation direction, or `null` when the
 *  move is blocked at an edge (the caller keeps the current cell). Jumps
 *  (gridStart/gridEnd) always resolve; edge-blocked steps return null so a ring
 *  never silently "sticks" without feedback. */
export function nextFocusedCell(
  dir: GridDirection,
  current: CellCoord,
  pages: HasId[],
  props: HasId[],
  pageStep = 10,
): CellCoord | null {
  const pi = pages.findIndex(p => p.id === current.pageId);
  const ci = props.findIndex(p => p.id === current.propId);
  if (pi < 0 || ci < 0 || pages.length === 0 || props.length === 0) return null;

  const atRow = (i: number): CellCoord => ({ pageId: pages[clamp(i, 0, pages.length - 1)].id, propId: current.propId });
  const atCol = (i: number): CellCoord => ({ pageId: current.pageId, propId: props[clamp(i, 0, props.length - 1)].id });

  switch (dir) {
    case 'up': return pi > 0 ? atRow(pi - 1) : null;
    case 'down': return pi < pages.length - 1 ? atRow(pi + 1) : null;
    case 'left': return ci > 0 ? atCol(ci - 1) : null;
    case 'right': return ci < props.length - 1 ? atCol(ci + 1) : null;
    case 'rowStart': return ci > 0 ? atCol(0) : null;
    case 'rowEnd': return ci < props.length - 1 ? atCol(props.length - 1) : null;
    case 'gridStart': return { pageId: pages[0].id, propId: props[0].id };
    case 'gridEnd': return { pageId: pages[pages.length - 1].id, propId: props[props.length - 1].id };
    case 'pageUp': return pi > 0 ? atRow(pi - pageStep) : null;
    case 'pageDown': return pi < pages.length - 1 ? atRow(pi + pageStep) : null;
    default: return null;
  }
}

/** Keys that, pressed while the grid is focused but no cell is selected yet,
 *  should "enter" the grid by selecting the first cell. */
export function isGridEntryKey(key: string): boolean {
  return (
    key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight' ||
    key === 'Home' || key === 'End' || key === 'PageUp' || key === 'PageDown' ||
    key === 'Enter' || key === 'Tab'
  );
}

/** Stable DOM id for a cell, used for `aria-activedescendant` on the grid
 *  container and to locate the on-screen cell (e.g. to fire a button action).
 *  Scoped by database id so two databases on one page don't collide. */
export function cellDomId(scopeId: string, pageId: string, propId: string): string {
  return `odb-cell:${scopeId}:${pageId}:${propId}`;
}
