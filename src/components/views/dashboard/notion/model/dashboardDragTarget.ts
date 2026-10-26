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
 * card rects at drag start (and on scroll); every pointermove resolves to
 * the EDGE of the hovered card nearest the pointer, in pixels, so the bar
 * never lands across the card from where the pointer is (Notion's block DnD):
 *   · top / bottom edge → insert into that column's vertical stack;
 *   · left / right edge → insert a column before / after it;
 *   · the empty space below a short column → append to its stack;
 *   · a gap between columns → insert a column there;
 *   · the gutter under a row → new row.
 * Capacity is enforced HERE (4 columns/row net of a vacated source column,
 * 3 cards/stack); a blocked drop keeps its indicator geometry so the hook
 * can paint it as refused instead of hiding it.
 */

import { MAX_PER_ROW, STACK_DEPTH_MAX } from './dashboardLayout';
import type { MoveTarget } from './dashboardLayoutMove';

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

export type DropIndicator = { kind: 'slot'; x: number; top: number; bottom: number }
  | { kind: 'row'; y: number; left: number; right: number }
  | { kind: 'stack'; y: number; left: number; right: number };

export interface DropResolution {
  target: MoveTarget | null;
  /** Pointer is over a row/stack that cannot take the widget; `indicator`
   *  still names where the refused drop would have gone. */
  blocked: boolean;
  /** Indicator geometry in the same coordinate space as the rects. */
  indicator: DropIndicator | null;
}

const NONE: DropResolution = { target: null, blocked: false, indicator: null };

function cardsOf(row: RowGeometry, slot: SlotRect): { top: number; bottom: number }[] {
  return slot.cards ?? [{ top: row.top, bottom: row.bottom }];
}

/** y of the bar for inserting at `at`: the gap midpoint between two cards. */
function stackBarY(cards: readonly { top: number; bottom: number }[], at: number): number {
  if (at <= 0) return cards[0].top;
  if (at >= cards.length) return cards[cards.length - 1].bottom;
  return (cards[at - 1].bottom + cards[at].top) / 2;
}

function stackDrop(row: RowGeometry, col: number, at: number): DropResolution {
  const slot = row.slots[col];
  const cards = cardsOf(row, slot);
  const indicator: DropIndicator = { kind: 'stack', y: stackBarY(cards, at), left: slot.left + 4, right: slot.right - 4 };
  if (!slot.containsSource && cards.length >= STACK_DEPTH_MAX) return { target: null, blocked: true, indicator };
  return { target: { rowId: row.rowId, index: 0, intoStack: { col, at } }, blocked: false, indicator };
}

function columnDrop(row: RowGeometry, index: number): DropResolution {
  const { slots } = row;
  let x = slots[index - 1]?.right ?? slots[0]?.left ?? row.left;
  if (index > 0 && index < slots.length) x = (slots[index - 1].right + slots[index].left) / 2;
  const indicator: DropIndicator = { kind: 'slot', x, top: row.top, bottom: row.bottom };
  // Net columns after the move: a vacated single-card source column frees one.
  const vacated = row.sourceAloneColumn ?? row.containsSource;
  if (slots.length - (vacated ? 1 : 0) >= MAX_PER_ROW) return { target: null, blocked: true, indicator };
  return { target: { rowId: row.rowId, index }, blocked: false, indicator };
}

/** Edge of a card nearest the pointer, in pixels; ties go to the side. */
function nearestEdge(
  left: number, right: number, top: number, bottom: number, x: number, y: number,
): 'left' | 'right' | 'top' | 'bottom' {
  const side = Math.min(x - left, right - x);
  const vertical = Math.min(y - top, bottom - y);
  if (vertical < side) return y - top < bottom - y ? 'top' : 'bottom';
  return x - left < right - x ? 'left' : 'right';
}

function resolveInRow(row: RowGeometry, x: number, y: number): DropResolution {
  const col = row.slots.findIndex(slot => x >= slot.left && x <= slot.right);
  if (col === -1) {
    // A gap between columns, or the slack after the last one.
    const after = row.slots.findIndex(slot => slot.left > x);
    return columnDrop(row, after === -1 ? row.slots.length : after);
  }
  const slot = row.slots[col];
  const cards = cardsOf(row, slot);
  const card = cards.findIndex(c => y >= c.top && y <= c.bottom);
  if (card === -1) {
    // Below the column's last card (the hole a shrunk card leaves), or the
    // gap between two stacked cards.
    const next = cards.findIndex(c => c.top > y);
    return stackDrop(row, col, next === -1 ? cards.length : next);
  }
  const { top, bottom } = cards[card];
  switch (nearestEdge(slot.left, slot.right, top, bottom, x, y)) {
    case 'top': return stackDrop(row, col, card);
    case 'bottom': return stackDrop(row, col, card + 1);
    case 'left': return columnDrop(row, col);
    default: return columnDrop(row, col + 1);
  }
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
