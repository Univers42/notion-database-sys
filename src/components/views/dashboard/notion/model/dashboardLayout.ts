/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   dashboardLayout.ts                                 :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/10 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── dashboardLayout — pure add/remove/duplicate over rows+widgets ──────────
// Notion caps: ≤4 COLUMNS per row, ≤12 widgets total. Widths are fractions of
// the row summing to 1; row height is in px. A column may STACK up to 3 cards
// vertically (DashboardStack) — a stacked column always fills the row height,
// members split it by `shares` fractions. Pure functions → unit-tested.

import type { DashboardRow, DashboardStack, DashboardStatConfig, DashboardViewWidget } from '../../../../../types/database';

export interface DashboardLayout {
  rows: DashboardRow[];
  widgets: DashboardViewWidget[];
}

export const MAX_WIDGETS = 12;
export const MAX_PER_ROW = 4;
export const MIN_WIDTH_FRACTION = 1 / 8;
export const DEFAULT_ROW_HEIGHT = 320;
export const MIN_ROW_HEIGHT = 160;
export const MAX_ROW_HEIGHT = 800;
export const STACK_DEPTH_MAX = 3;
export const MIN_STACK_SHARE = 1 / 5;

export const EMPTY_LAYOUT: DashboardLayout = { rows: [], widgets: [] };

/** A row's columns as stacks — legacy rows derive one column per widget. */
export function rowStacks(row: DashboardRow): DashboardStack[] {
  return row.stacks ?? row.widgetIds.map(id => ({ widgetIds: [id] }));
}

/** Equal shares for `n` stack members. */
function equalShares(n: number): number[] {
  return Array.from({ length: n }, () => 1 / n);
}

/** A stack's effective member shares (validated, defaulting to equal). */
export function stackShares(stack: DashboardStack): number[] {
  const n = stack.widgetIds.length;
  if (!stack.shares || stack.shares.length !== n) return equalShares(n);
  const sum = stack.shares.reduce((total, s) => total + s, 0);
  return sum > 0 ? stack.shares.map(s => s / sum) : equalShares(n);
}

/**
 * Rebuilds a row from its stacks: empty stacks drop, `widgetIds` re-flattens,
 * singleton shares drop, and the `stacks` field itself drops when every
 * column is a single card (keeps persisted JSON in the legacy shape).
 * Widths are kept when the column count is unchanged, else re-equalized.
 */
export function rowFromStacks(row: DashboardRow, stacks: DashboardStack[]): DashboardRow {
  const columns = stacks
    .filter(stack => stack.widgetIds.length > 0)
    .map(stack => (stack.widgetIds.length === 1
      ? { widgetIds: stack.widgetIds }
      : {
        widgetIds: stack.widgetIds,
        shares: stackShares(stack),
        ...(stack.height != null ? { height: stack.height } : {}),
      }));
  const widths = columns.length === row.widths.length
    ? row.widths
    : Array.from({ length: columns.length }, () => 1 / Math.max(1, columns.length));
  return {
    ...row,
    widgetIds: columns.flatMap(stack => stack.widgetIds),
    widths,
    ...(columns.some(stack => stack.widgetIds.length > 1)
      ? { stacks: columns }
      : { stacks: undefined }),
  };
}

/** Equalizes a row's widths to its COLUMN count (used after add/remove/move). */
export function normalizeRow(row: DashboardRow): DashboardRow {
  const n = Math.max(1, rowStacks(row).length);
  return { ...row, widths: Array.from({ length: n }, () => 1 / n) };
}

export interface AddWidgetOptions {
  /** Land in this row when it has room (full → a new row right after it). */
  targetRowId?: string;
  /** Always open a fresh row at the bottom (the bottom add-strip). */
  forceNewRow?: boolean;
  /** Render as a Number/KPI tile over the backing view. */
  stat?: DashboardStatConfig;
}

/**
 * Adds a widget for `viewId` as a NEW COLUMN: into the target row when given
 * (spilling to a new row after it when full), else appended to the last row
 * with room, else on a new row. Returns null at the 12-widget cap.
 */
export function addWidget(
  layout: DashboardLayout,
  viewId: string,
  id: string = `w-${crypto.randomUUID().slice(0, 8)}`,
  options: AddWidgetOptions = {},
): DashboardLayout | null {
  if (layout.widgets.length >= MAX_WIDGETS) return null;
  const widget: DashboardViewWidget = { id, viewId, ...(options.stat ? { stat: options.stat } : {}) };
  const rows = [...layout.rows];
  const freshRow = (height = DEFAULT_ROW_HEIGHT): DashboardRow => normalizeRow({
    id: `r-${crypto.randomUUID().slice(0, 8)}`,
    widgetIds: [id], widths: [1], height,
  });
  const appendColumn = (row: DashboardRow): DashboardRow =>
    normalizeRow(rowFromStacks(row, [...rowStacks(row), { widgetIds: [id] }]));

  const targetIdx = options.targetRowId ? rows.findIndex(row => row.id === options.targetRowId) : -1;
  if (targetIdx !== -1 && !options.forceNewRow) {
    const target = rows[targetIdx];
    if (rowStacks(target).length < MAX_PER_ROW) {
      rows[targetIdx] = appendColumn(target);
    } else {
      rows.splice(targetIdx + 1, 0, freshRow(target.height));
    }
    return { rows, widgets: [...layout.widgets, widget] };
  }

  const last = rows[rows.length - 1];
  if (!options.forceNewRow && last && rowStacks(last).length < MAX_PER_ROW) {
    rows[rows.length - 1] = appendColumn(last);
  } else {
    rows.push(freshRow());
  }
  return { rows, widgets: [...layout.widgets, widget] };
}

/** Removes a widget from its stack; empty columns and rows are dropped. */
export function removeWidget(layout: DashboardLayout, widgetId: string): DashboardLayout {
  const rows = layout.rows
    .map(row => row.widgetIds.includes(widgetId)
      ? rowFromStacks(row, rowStacks(row).map(stack => ({
        ...stack,
        widgetIds: stack.widgetIds.filter(id => id !== widgetId),
        shares: stack.shares?.filter((_, i) => stack.widgetIds[i] !== widgetId),
      })))
      : row)
    .filter(row => row.widgetIds.length > 0);
  return { rows, widgets: layout.widgets.filter(w => w.id !== widgetId) };
}

/**
 * Duplicates a widget into a new column right after the original's column.
 * The caller duplicates the underlying view first and passes the new view id.
 */
export function duplicateWidget(
  layout: DashboardLayout,
  widgetId: string,
  newViewId: string,
  id: string = `w-${crypto.randomUUID().slice(0, 8)}`,
): DashboardLayout | null {
  if (layout.widgets.length >= MAX_WIDGETS) return null;
  const source = layout.widgets.find(w => w.id === widgetId);
  if (!source) return null;
  const widget: DashboardViewWidget = { ...source, id, viewId: newViewId };
  const rowIdx = layout.rows.findIndex(r => r.widgetIds.includes(widgetId));
  if (rowIdx === -1) return null;
  const rows = [...layout.rows];
  const row = rows[rowIdx];
  const stacks = rowStacks(row);
  if (stacks.length < MAX_PER_ROW) {
    const at = stacks.findIndex(stack => stack.widgetIds.includes(widgetId)) + 1;
    const next = [...stacks];
    next.splice(at, 0, { widgetIds: [id] });
    rows[rowIdx] = normalizeRow(rowFromStacks(row, next));
  } else {
    rows.splice(rowIdx + 1, 0, normalizeRow({
      id: `r-${crypto.randomUUID().slice(0, 8)}`,
      widgetIds: [id], widths: [1], height: row.height,
    }));
  }
  return { rows, widgets: [...layout.widgets, widget] };
}

/** Reads the persisted layout out of view settings (legacy-safe defaults). */
export function layoutFromSettings(settings: {
  dashboardRows?: DashboardRow[];
  dashboardWidgets?: DashboardViewWidget[];
}): DashboardLayout {
  return {
    rows: settings.dashboardRows ?? [],
    widgets: settings.dashboardWidgets ?? [],
  };
}
