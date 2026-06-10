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
// Notion caps: ≤4 widgets per row, ≤12 widgets total. Widths are fractions
// of the row summing to 1; row height is in px. Pure functions → unit-tested.

import type { DashboardRow, DashboardViewWidget } from '../../../../../types/database';

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

export const EMPTY_LAYOUT: DashboardLayout = { rows: [], widgets: [] };

/** Equalizes a row's widths to its widget count (used after add/remove/move). */
export function normalizeRow(row: DashboardRow): DashboardRow {
  const n = row.widgetIds.length;
  return { ...row, widths: Array.from({ length: n }, () => 1 / n) };
}

/**
 * Adds a widget for `viewId`: appended to the last row when it has room,
 * else on a new row. Returns null when the 12-widget cap is reached.
 */
export function addWidget(
  layout: DashboardLayout,
  viewId: string,
  id: string = `w-${crypto.randomUUID().slice(0, 8)}`,
): DashboardLayout | null {
  if (layout.widgets.length >= MAX_WIDGETS) return null;
  const widget: DashboardViewWidget = { id, viewId };
  const rows = [...layout.rows];
  const last = rows[rows.length - 1];
  if (last && last.widgetIds.length < MAX_PER_ROW) {
    rows[rows.length - 1] = normalizeRow({ ...last, widgetIds: [...last.widgetIds, id] });
  } else {
    rows.push(normalizeRow({
      id: `r-${crypto.randomUUID().slice(0, 8)}`,
      widgetIds: [id], widths: [1], height: DEFAULT_ROW_HEIGHT,
    }));
  }
  return { rows, widgets: [...layout.widgets, widget] };
}

/** Removes a widget; rows left empty are dropped. */
export function removeWidget(layout: DashboardLayout, widgetId: string): DashboardLayout {
  const rows = layout.rows
    .map(row => row.widgetIds.includes(widgetId)
      ? normalizeRow({ ...row, widgetIds: row.widgetIds.filter(id => id !== widgetId) })
      : row)
    .filter(row => row.widgetIds.length > 0);
  return { rows, widgets: layout.widgets.filter(w => w.id !== widgetId) };
}

/**
 * Duplicates a widget next to the original. The caller duplicates the
 * underlying view first and passes the new view's id.
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
  if (row.widgetIds.length < MAX_PER_ROW) {
    const at = row.widgetIds.indexOf(widgetId) + 1;
    const widgetIds = [...row.widgetIds];
    widgetIds.splice(at, 0, id);
    rows[rowIdx] = normalizeRow({ ...row, widgetIds });
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
