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
 * Pure hit-testing for widget drag-and-drop. The hook snapshots row/slot
 * rects at drag start (and on scroll); every pointermove resolves to either
 * a slot inside a row (index between widget midpoints) or the gutter under
 * a row (→ new row). Capacity is enforced HERE (same 4-cap rule moveWidget
 * applies) so the indicator can show "blocked" before the drop happens.
 */

import { MAX_PER_ROW } from './dashboardLayout';
import type { MoveTarget } from './dashboardLayoutMove';

export interface SlotRect { left: number; right: number }
export interface RowGeometry {
  rowId: string;
  top: number;
  bottom: number;
  left: number;
  right: number;
  slots: SlotRect[];
  /** Whether the dragged widget already lives in this row. */
  containsSource: boolean;
}

export interface DropResolution {
  target: MoveTarget | null;
  /** Pointer is over a full row the source isn't part of. */
  blocked: boolean;
  /** Indicator geometry in the same coordinate space as the rects. */
  indicator: { kind: 'slot'; x: number; top: number; bottom: number }
    | { kind: 'row'; y: number; left: number; right: number }
    | null;
}

const NONE: DropResolution = { target: null, blocked: false, indicator: null };

function resolveInRow(row: RowGeometry, x: number): DropResolution {
  if (!row.containsSource && row.slots.length >= MAX_PER_ROW) {
    return { target: null, blocked: true, indicator: null };
  }
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
    indicator: { kind: 'slot', x: index === 0 ? edge : edge, top: row.top, bottom: row.bottom },
  };
}

/** Resolves a pointer position against the row snapshot. Gutters (between
 *  rows / below the last row) insert a NEW row after the row above. */
export function hitTestDropTarget(rows: readonly RowGeometry[], x: number, y: number): DropResolution {
  if (rows.length === 0) return NONE;
  for (const row of rows) {
    if (y >= row.top && y <= row.bottom) {
      if (x < row.left || x > row.right) return NONE;
      return resolveInRow(row, x);
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
