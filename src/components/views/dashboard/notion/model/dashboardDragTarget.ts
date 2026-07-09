/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   dashboardDragTarget.ts                             :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 12:00:00 by dlesieur          #+#    #+#             */
/*                                                +#+#+#+#+#+   +#+           */
/* ************************************************************************** */

/**
 * Pure hit-testing for widget drag-and-drop. The hook snapshots row/column/
 * card rects at drag start (and on scroll); every pointermove resolves to:
 *   · a STACK slot — the top/bottom band of a card, or the EMPTY SPACE below
 *     a short column (the hole a shrunk card leaves) → insert into that
 *     column's vertical stack;
 *   · a COLUMN slot inside a row (index between column midpoints);
 *   · the gutter under a row (→ new row).
 * Capacity is enforced HERE (4 columns/row net of a vacated source column,
 * 3 cards/stack) so the indicator can show "blocked" before the drop.
 */

import { MAX_PER_ROW, STACK_DEPTH_MAX } from './dashboardLayout';
import type { MoveTarget } from './dashboardLayoutMove';

/** Vertical fraction of a card acting as its stack-above/below band. */
const STACK_BAND = 0.28;

export interface SlotRect {
  left: number;
  right: number;
  /** Member card rects top→bottom; absent → one full-height card. */
  cards?: { top: number; bottom: number }[];
  /** The dragged widget is a member of this column's stack. */
  containsSource?: boolean;
}
export interface RowGeometry {
  rowId: string;
  top: number;
  bottom: number;
  left: number;
  right: number;
  slots: SlotRect[];
  /** Whether the dragged widget already lives in this row. */
  containsSource: boolean;
  /** The dragged widget is a SINGLE-card column here (vacates on move). */
  sourceAloneColumn?: boolean;
}

export interface DropResolution {
  target: MoveTarget | null;
  /** Pointer is over a row/stack that cannot take the widget. */
  blocked: boolean;
  /** Indicator geometry in the same coordinate space as the rects. */
  indicator: { kind: 'slot'; x: number; top: number; bottom: number }
    | { kind: 'row'; y: number; left: number; right: number }
    | { kind: 'stack'; y: number; left: number; right: number }
    | null;
}

const NONE: DropResolution = { target: null, blocked: false, indicator: null };
const BLOCKED: DropResolution = { target: null, blocked: true, indicator: null };

function stackHit(row: RowGeometry, colIndex: number, at: number, y: number): DropResolution {
  const slot = row.slots[colIndex];
  return {
    target: { rowId: row.rowId, index: 0, intoStack: { col: colIndex, at } },
    blocked: false,
    indicator: { kind: 'stack', y, left: slot.left + 4, right: slot.right - 4 },
  };
}

/** Stack zones of the column under x: card top/bottom bands + the hole
 *  below a short column. Returns null when the pointer is mid-card (→ the
 *  column-insert path decides). */
function resolveStackZone(row: RowGeometry, x: number, y: number): DropResolution | null {
  const colIndex = row.slots.findIndex(slot => x >= slot.left && x <= slot.right);
  if (colIndex === -1) return null;
  const slot = row.slots[colIndex];
  const cards = slot.cards ?? [{ top: row.top, bottom: row.bottom }];
  const full = !slot.containsSource && cards.length >= STACK_DEPTH_MAX;

  const last = cards[cards.length - 1];
  if (y > last.bottom) return full ? BLOCKED : stackHit(row, colIndex, cards.length, last.bottom + 4);
  for (let j = 0; j < cards.length; j++) {
    const card = cards[j];
    if (y < card.top || y > card.bottom) continue;
    const band = (card.bottom - card.top) * STACK_BAND;
    if (y < card.top + band) return full ? BLOCKED : stackHit(row, colIndex, j, card.top);
    if (y > card.bottom - band) return full ? BLOCKED : stackHit(row, colIndex, j + 1, card.bottom);
    return null;
  }
  return null;
}

function resolveInRow(row: RowGeometry, x: number, y: number): DropResolution {
  const stackZone = resolveStackZone(row, x, y);
  if (stackZone) return stackZone;

  // Column insertion: net columns after the move (a vacated single-card
  // source column frees a slot) must stay within the cap.
  const vacated = row.sourceAloneColumn ?? row.containsSource;
  if (row.slots.length - (vacated ? 1 : 0) >= MAX_PER_ROW) return BLOCKED;
  let index = row.slots.length;
  for (let i = 0; i < row.slots.length; i++) {
    const slot = row.slots[i];
    if (x < (slot.left + slot.right) / 2) {
      index = i;
      break;
    }
  }
  const edge = index === 0
    ? row.slots[0]?.left ?? row.left
    : row.slots[index - 1].right;
  return {
    target: { rowId: row.rowId, index },
    blocked: false,
    indicator: { kind: 'slot', x: edge, top: row.top, bottom: row.bottom },
  };
}

/** Resolves a pointer position against the row snapshot. Gutters (between
 *  rows / below the last row) insert a NEW row after the row above. */
export function hitTestDropTarget(rows: readonly RowGeometry[], x: number, y: number): DropResolution {
  if (rows.length === 0) return NONE;
  for (const row of rows) {
    if (y >= row.top && y <= row.bottom) {
      if (x < row.left || x > row.right) return NONE;
      return resolveInRow(row, x, y);
    }
  }
  // Gutter: the nearest row ABOVE the pointer (below the last row included).
  let above: RowGeometry | null = null;
  for (const row of rows) {
    if (row.bottom < y && (!above || row.bottom > above.bottom)) above = row;
  }
  if (!above) return NONE;
  return {
    target: { rowId: above.rowId, index: 0, newRowAfter: true },
    blocked: false,
    indicator: { kind: 'row', y: above.bottom + 4, left: above.left, right: above.right },
  };
}
