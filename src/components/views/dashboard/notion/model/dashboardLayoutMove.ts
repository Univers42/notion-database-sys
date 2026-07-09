/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   dashboardLayoutMove.ts                             :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/10 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── dashboardLayoutMove — pure reposition + resize mutations ───────────────

import type { DashboardRow, DashboardStack, DashboardViewWidget } from '../../../../../types/database';
import {
  MAX_PER_ROW, MIN_WIDTH_FRACTION, MIN_ROW_HEIGHT, MAX_ROW_HEIGHT,
  STACK_DEPTH_MAX, MIN_STACK_SHARE,
  normalizeRow, rowStacks, rowFromStacks, stackShares,
} from './dashboardLayout';
import type { DashboardLayout } from './dashboardLayout';

/** Where a widget should land: a column slot, inside a stack, or a new row. */
export interface MoveTarget {
  rowId: string;
  /** Column insertion index (ignored when intoStack / newRowAfter is set). */
  index: number;
  /** Insert a new row AFTER rowId (index ignored) instead of into it. */
  newRowAfter?: boolean;
  /** Stack the widget inside column `col` at member position `at`. */
  intoStack?: { col: number; at: number };
}

/** Drops `widgetId` from every stack, share-proportions preserved. */
function stacksWithout(stacks: DashboardStack[], widgetId: string): DashboardStack[] {
  return stacks.map(stack => ({
    ...stack,
    widgetIds: stack.widgetIds.filter(id => id !== widgetId),
    shares: stack.shares?.filter((_, i) => stack.widgetIds[i] !== widgetId),
  }));
}

/** Member fractions counting a detached column's own height as its extent —
 *  the leftover is the visible HOLE a dropped card should fill. */
function effectiveFractions(
  stack: DashboardStack,
  widgets: readonly DashboardViewWidget[],
  rowHeight: number,
): number[] {
  if (stack.widgetIds.length === 1) {
    const sole = widgets.find(w => w.id === stack.widgetIds[0]);
    if (sole?.height != null && rowHeight > 0) {
      return [Math.min(1 - MIN_STACK_SHARE, Math.max(MIN_STACK_SHARE, sole.height / rowHeight))];
    }
    return [1];
  }
  const shares = stackShares(stack);
  if (stack.height != null && rowHeight > 0) {
    const extent = Math.min(1 - MIN_STACK_SHARE, Math.max(MIN_STACK_SHARE, stack.height / rowHeight));
    return shares.map(share => share * extent);
  }
  return shares;
}

/** Shares after inserting a card at `at`: it takes the hole when one exists
 *  (a shrunk card left empty space), else an equal cut of everyone. */
function insertShares(existing: number[], at: number): number[] {
  const sum = existing.reduce((total, share) => total + share, 0);
  const hole = 1 - sum;
  const incoming = hole >= MIN_STACK_SHARE ? hole : 1 / (existing.length + 1);
  const scale = hole >= MIN_STACK_SHARE ? 1 : (1 - incoming) / (sum || 1);
  const shares = existing.map(share => share * scale);
  shares.splice(at, 0, incoming);
  const clamped = shares.map(share => Math.max(MIN_STACK_SHARE, share));
  const total = clamped.reduce((t, share) => t + share, 0);
  return clamped.map(share => share / total);
}

/** Cards inside a >1 stack shed their px override — shares own the space. */
function stripStackedHeights(
  rows: readonly DashboardRow[],
  widgets: readonly DashboardViewWidget[],
): DashboardViewWidget[] {
  const stacked = new Set(rows.flatMap(row =>
    rowStacks(row).filter(s => s.widgetIds.length > 1).flatMap(s => s.widgetIds)));
  return widgets.map(w => {
    if (!stacked.has(w.id) || w.height == null) return w;
    const { height: _dropped, ...aligned } = w;
    return aligned;
  });
}

/**
 * Moves a widget to a target slot. Column inserts reject rows already at the
 * 4-COLUMN cap (net of a vacated source column); stack inserts reject full
 * stacks. Source columns/rows left empty are dropped; only rows whose column
 * count changed re-equalize widths (rowFromStacks rule).
 */
export function moveWidget(
  layout: DashboardLayout,
  widgetId: string,
  target: MoveTarget,
): DashboardLayout {
  const sourceIdx = layout.rows.findIndex(r => r.widgetIds.includes(widgetId));
  const targetIdx = layout.rows.findIndex(r => r.id === target.rowId);
  if (sourceIdx === -1 || targetIdx === -1) return layout;
  const targetRow = layout.rows[targetIdx];

  if (target.intoStack) {
    const { col, at } = target.intoStack;
    const stacks = rowStacks(targetRow);
    const stack = stacks[col];
    if (!stack) return layout;
    const alreadyMember = stack.widgetIds.includes(widgetId);
    if (!alreadyMember && stack.widgetIds.length >= STACK_DEPTH_MAX) return layout;

    const rows = layout.rows
      .map((row, idx) => {
        if (idx === targetIdx) {
          const srcPos = stack.widgetIds.indexOf(widgetId);
          const baseIds = stack.widgetIds.filter(id => id !== widgetId);
          const baseEff = srcPos === -1
            ? effectiveFractions(stack, layout.widgets, row.height)
            : stackShares(stack).filter((_, i) => i !== srcPos);
          const slot = Math.max(0, Math.min(at, baseIds.length));
          const widgetIds = [...baseIds];
          widgetIds.splice(slot, 0, widgetId);
          const nextStacks = stacksWithout(stacks, widgetId);
          nextStacks[col] = { widgetIds, shares: insertShares(baseEff, slot) };
          return rowFromStacks(row, nextStacks);
        }
        return row.widgetIds.includes(widgetId)
          ? rowFromStacks(row, stacksWithout(rowStacks(row), widgetId))
          : row;
      })
      .filter(row => row.widgetIds.length > 0);
    return { rows, widgets: stripStackedHeights(rows, layout.widgets) };
  }

  const sourceAloneColumn = targetRow.widgetIds.includes(widgetId)
    && rowStacks(targetRow).some(s => s.widgetIds.length === 1 && s.widgetIds[0] === widgetId);
  if (!target.newRowAfter
    && rowStacks(targetRow).length - (sourceAloneColumn ? 1 : 0) >= MAX_PER_ROW) return layout;

  let rows = layout.rows.map(row => row.widgetIds.includes(widgetId)
    ? rowFromStacks(row, stacksWithout(rowStacks(row), widgetId))
    : row);

  if (target.newRowAfter) {
    const after = rows.findIndex(r => r.id === target.rowId);
    const newRow: DashboardRow = normalizeRow({
      id: `r-${crypto.randomUUID().slice(0, 8)}`,
      widgetIds: [widgetId], widths: [1],
      height: layout.rows[sourceIdx].height,
    });
    rows = [...rows.slice(0, after + 1), newRow, ...rows.slice(after + 1)];
  } else {
    rows = rows.map(row => {
      if (row.id !== target.rowId) return row;
      const stacks = rowStacks(row);
      const next = [...stacks];
      next.splice(Math.max(0, Math.min(target.index, next.length)), 0, { widgetIds: [widgetId] });
      return normalizeRow(rowFromStacks(row, next));
    });
  }
  const kept = rows.filter(r => r.widgetIds.length > 0);
  return { rows: kept, widgets: stripStackedHeights(kept, layout.widgets) };
}

/**
 * Shifts the divider between widths[i] and widths[i+1] by a signed fraction
 * of the row, clamping both sides to the 1/8 minimum.
 */
export function resizeWidths(
  layout: DashboardLayout,
  rowId: string,
  dividerIndex: number,
  deltaFraction: number,
): DashboardLayout {
  const rows = layout.rows.map(row => {
    if (row.id !== rowId) return row;
    const widths = [...row.widths];
    if (dividerIndex < 0 || dividerIndex >= widths.length - 1) return row;
    const pair = widths[dividerIndex] + widths[dividerIndex + 1];
    const left = Math.max(
      MIN_WIDTH_FRACTION,
      Math.min(pair - MIN_WIDTH_FRACTION, widths[dividerIndex] + deltaFraction),
    );
    widths[dividerIndex] = left;
    widths[dividerIndex + 1] = pair - left;
    return { ...row, widths };
  });
  return { rows, widgets: layout.widgets };
}

/**
 * Shifts the divider between two stacked cards by a signed fraction of the
 * COLUMN height, clamping both to the minimum share.
 */
export function resizeStackShares(
  layout: DashboardLayout,
  rowId: string,
  colIndex: number,
  dividerIndex: number,
  deltaFraction: number,
): DashboardLayout {
  const rows = layout.rows.map(row => {
    if (row.id !== rowId) return row;
    const stacks = rowStacks(row);
    const stack = stacks[colIndex];
    if (!stack || stack.widgetIds.length < 2) return row;
    const shares = stackShares(stack);
    if (dividerIndex < 0 || dividerIndex >= shares.length - 1) return row;
    const pair = shares[dividerIndex] + shares[dividerIndex + 1];
    const top = Math.max(
      MIN_STACK_SHARE,
      Math.min(pair - MIN_STACK_SHARE, shares[dividerIndex] + deltaFraction),
    );
    shares[dividerIndex] = top;
    shares[dividerIndex + 1] = pair - top;
    return rowFromStacks(row, stacks.map((s, i) => (i === colIndex ? { ...s, shares } : s)));
  });
  return { rows, widgets: layout.widgets };
}

/** Snap-to-full threshold for the trailing width handle (fraction). */
const SNAP_FULL_FRACTION = 0.04;

/**
 * Resizes the LAST column from its right edge by a signed fraction of the
 * row. Shrinking leaves trailing SLACK (widths sum < 1) — empty space that
 * renders as a phantom track and accepts drops; growing consumes it, and
 * within the snap threshold of full the row snaps back to slack-free.
 * Works for single-column rows too — the only way a solo card gets narrower.
 */
export function resizeLastWidth(
  layout: DashboardLayout,
  rowId: string,
  deltaFraction: number,
): DashboardLayout {
  const rows = layout.rows.map(row => {
    if (row.id !== rowId || row.widths.length === 0) return row;
    const widths = [...row.widths];
    const last = widths.length - 1;
    const others = widths.reduce((total, w) => total + w, 0) - widths[last];
    const max = 1 - others;
    const next = Math.max(MIN_WIDTH_FRACTION, Math.min(max, widths[last] + deltaFraction));
    widths[last] = max - next <= SNAP_FULL_FRACTION ? max : next;
    return { ...row, widths };
  });
  return { rows, widgets: layout.widgets };
}

/** Sets a row's height in px, clamped to sane bounds. */
export function resizeRowHeight(
  layout: DashboardLayout,
  rowId: string,
  height: number,
): DashboardLayout {
  const clamped = Math.max(MIN_ROW_HEIGHT, Math.min(MAX_ROW_HEIGHT, Math.round(height)));
  return {
    rows: layout.rows.map(row => row.id === rowId ? { ...row, height: clamped } : row),
    widgets: layout.widgets,
  };
}

/**
 * Sets a STACKED column's own height (px, clamped), detaching the whole
 * stack from the row line — it leaves the group bar until re-aligned.
 * `null` clears it. Members keep splitting the (new) column height by
 * shares. No-op for single-card columns (those use resizeWidgetHeight).
 */
export function resizeStackHeight(
  layout: DashboardLayout,
  rowId: string,
  colIndex: number,
  height: number | null,
): DashboardLayout {
  const targetRow = layout.rows.find(r => r.id === rowId);
  const target = targetRow ? rowStacks(targetRow)[colIndex] : undefined;
  if (!target || target.widgetIds.length < 2) return layout;
  const rows = layout.rows.map(row => {
    if (row.id !== rowId) return row;
    const stacks = rowStacks(row);
    const next = stacks.map((s, i) => {
      if (i !== colIndex) return s;
      if (height == null) {
        const { height: _dropped, ...aligned } = s;
        return aligned;
      }
      return { ...s, height: Math.max(MIN_ROW_HEIGHT, Math.min(MAX_ROW_HEIGHT, Math.round(height))) };
    });
    return rowFromStacks(row, next);
  });
  return { rows, widgets: layout.widgets };
}

/**
 * Sets ONE widget's own height (px, clamped), detaching it from the row's
 * shared height — it leaves the group bar until re-aligned. `null` clears
 * the override, snapping the card back to the row height. Cards inside a
 * >1 stack are governed by shares instead — this is a no-op for them.
 */
export function resizeWidgetHeight(
  layout: DashboardLayout,
  widgetId: string,
  height: number | null,
): DashboardLayout {
  if (!layout.widgets.some(w => w.id === widgetId)) return layout;
  const inStack = layout.rows.some(row =>
    rowStacks(row).some(s => s.widgetIds.length > 1 && s.widgetIds.includes(widgetId)));
  if (inStack) return layout;
  return {
    rows: layout.rows,
    widgets: layout.widgets.map(w => {
      if (w.id !== widgetId) return w;
      if (height == null) {
        const { height: _dropped, ...aligned } = w;
        return aligned;
      }
      return { ...w, height: Math.max(MIN_ROW_HEIGHT, Math.min(MAX_ROW_HEIGHT, Math.round(height))) };
    }),
  };
}
