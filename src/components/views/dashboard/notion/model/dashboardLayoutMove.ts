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

import type { DashboardRow } from '../../../../../types/database';
import {
  MAX_PER_ROW, MIN_WIDTH_FRACTION, MIN_ROW_HEIGHT, MAX_ROW_HEIGHT,
  normalizeRow,
} from './dashboardLayout';
import type { DashboardLayout } from './dashboardLayout';

/** Where a widget should land: an index in a row, or a fresh row after it. */
export interface MoveTarget {
  rowId: string;
  index: number;
  /** Insert a new row AFTER rowId (index ignored) instead of into it. */
  newRowAfter?: boolean;
}

/**
 * Moves a widget to a target slot. Rejects rows already at the 4-widget cap
 * (unless moving within the same row). Source rows left empty are dropped.
 */
export function moveWidget(
  layout: DashboardLayout,
  widgetId: string,
  target: MoveTarget,
): DashboardLayout {
  const sourceIdx = layout.rows.findIndex(r => r.widgetIds.includes(widgetId));
  const targetIdx = layout.rows.findIndex(r => r.id === target.rowId);
  if (sourceIdx === -1 || targetIdx === -1) return layout;
  const sameRow = sourceIdx === targetIdx && !target.newRowAfter;
  if (!sameRow && !target.newRowAfter
    && layout.rows[targetIdx].widgetIds.length >= MAX_PER_ROW) return layout;

  let rows = layout.rows.map(row => row.widgetIds.includes(widgetId)
    ? { ...row, widgetIds: row.widgetIds.filter(id => id !== widgetId) }
    : row);

  if (target.newRowAfter) {
    const newRow: DashboardRow = normalizeRow({
      id: `r-${crypto.randomUUID().slice(0, 8)}`,
      widgetIds: [widgetId], widths: [1],
      height: layout.rows[sourceIdx].height,
    });
    rows = [...rows.slice(0, targetIdx + 1), newRow, ...rows.slice(targetIdx + 1)];
  } else {
    rows = rows.map(row => {
      if (row.id !== target.rowId) return row;
      const widgetIds = [...row.widgetIds];
      widgetIds.splice(Math.max(0, Math.min(target.index, widgetIds.length)), 0, widgetId);
      return { ...row, widgetIds };
    });
  }
  return {
    rows: rows.filter(r => r.widgetIds.length > 0).map(normalizeRow),
    widgets: layout.widgets,
  };
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
