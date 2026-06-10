/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   DashboardNotionView.tsx                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/10 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── DashboardNotionView — Notion-model dashboard renderer ──────────────────
// Widgets ARE database views in a row grid (≤4/row, ≤12 total); Edit mode
// arranges, View mode reads; global filters flow to widgets via context.

import React, { useRef, useState } from 'react';
import { Plus, Pencil, Check, ListFilter } from 'lucide-react';
import { useWidgetDrag } from './useWidgetDrag';
import { useDatabaseStore, useStoreApi } from '../../../../store/dbms/hardcoded/useDatabaseStore';
import { useActiveViewId } from '../../../../hooks/useDatabaseScope';
import { DashboardFiltersProvider } from '../../../../hooks/useDashboardFilters';
import { DashboardRowShell } from './DashboardRowShell';
import { DashboardWidgetFrame } from './DashboardWidgetFrame';
import { AddWidgetPicker } from './AddWidgetPicker';
import { DashboardFilterBar } from './DashboardFilterBar';
import { addWidget, duplicateWidget, removeWidget, layoutFromSettings, MAX_WIDGETS } from './model/dashboardLayout';
import type { DashboardLayout } from './model/dashboardLayout';
import { moveWidget, resizeWidths, resizeRowHeight } from './model/dashboardLayoutMove';
import { addViewForWidget, duplicateViewForWidget, eligibleWidgetViews, filterableProperties } from './model/dashboardViewOps';
import type { ViewType } from '../../../../types/database';
import { cn } from '../../../../utils/cn';

/** Notion-model dashboard: toolbar + filter bar + widget rows. */
export default function DashboardNotionView() {
  const activeViewId = useActiveViewId();
  const { views, databases, updateViewSettings } = useDatabaseStore();
  const storeApi = useStoreApi();
  const view = activeViewId ? views[activeViewId] : null;
  const database = view ? databases[view.databaseId] : null;
  const [editMode, setEditMode] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Pointer drag-and-drop: DOM-only during the gesture, ONE commit on drop.
  const containerRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const viewIdRef = useRef<string | null>(null);
  viewIdRef.current = view?.id ?? null;
  const { startDrag } = useWidgetDrag({
    containerRef, indicatorRef,
    onDrop: (widgetId, target) => {
      const id = viewIdRef.current;
      if (!id) return;
      const current = storeApi.getState().views[id];
      if (!current) return;
      const currentLayout = layoutFromSettings(current.settings || {});
      const next = moveWidget(currentLayout, widgetId, target);
      if (next !== currentLayout) {
        updateViewSettings(id, { dashboardRows: next.rows, dashboardWidgets: next.widgets });
      }
    },
  });

  if (!view || !database) return null;
  const locked = Boolean(database.locked || view.settings?.locked);
  const settings = view.settings || {};
  const layout = layoutFromSettings(settings);
  const filters = settings.dashboardFilters ?? [];
  const usedWidgetIds = new Set(layout.widgets.map(w => w.viewId));

  const commit = (next: DashboardLayout | null) => {
    if (!next) return;
    updateViewSettings(view.id, { dashboardRows: next.rows, dashboardWidgets: next.widgets });
  };
  const patchWidget = (widgetId: string, updates: Partial<(typeof layout.widgets)[number]>) =>
    commit({
      ...layout,
      widgets: layout.widgets.map(w => (w.id === widgetId ? { ...w, ...updates } : w)),
    });
  const widgetActions = (widgetId: string, rowId: string, indexInRow: number) => ({
    onDuplicate: () => {
      const widget = layout.widgets.find(w => w.id === widgetId);
      const newViewId = widget ? duplicateViewForWidget(storeApi, widget.viewId) : null;
      if (newViewId) commit(duplicateWidget(layout, widgetId, newViewId));
    },
    onDelete: () => commit(removeWidget(layout, widgetId)),
    onMove: (direction: 'left' | 'right' | 'newRowBelow') => {
      if (direction === 'newRowBelow') {
        commit(moveWidget(layout, widgetId, { rowId, index: 0, newRowAfter: true }));
      } else {
        const index = direction === 'left' ? Math.max(0, indexInRow - 1) : indexInRow + 1;
        commit(moveWidget(layout, widgetId, { rowId, index }));
      }
    },
    onRename: (title: string) => patchWidget(widgetId, { title: title || undefined }),
    onToggleHideTitle: () => {
      const widget = layout.widgets.find(w => w.id === widgetId);
      patchWidget(widgetId, { hideTitle: !widget?.hideTitle });
    },
    onDragStart: (event: React.PointerEvent) => startDrag(widgetId, event),
  });

  return (
    <div className={cn("flex-1 flex flex-col min-h-0 bg-surface-secondary")}>
      <div className={cn("flex items-center gap-2 px-4 py-2 border-b border-line bg-surface-primary shrink-0")}>
        <span className={cn("text-xs text-ink-muted select-none")}>
          {layout.widgets.length}/{MAX_WIDGETS} widgets
        </span>
        <div className={cn("ml-auto flex items-center gap-1.5")}>
          <button onClick={() => setShowFilters(s => !s)}
            className={cn(`flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors ${
              filters.length > 0 || showFilters ? 'text-accent-text-light bg-accent-soft' : 'text-ink-muted hover:bg-hover-surface'
            }`)}>
            <ListFilter className={cn("w-3.5 h-3.5")} />
            Filters{filters.length > 0 ? ` (${filters.length})` : ''}
          </button>
          {editMode && !locked && (
            <div className={cn("relative")}>
              <button onClick={() => setPickerOpen(o => !o)} disabled={layout.widgets.length >= MAX_WIDGETS}
                className={cn("flex items-center gap-1 px-2 py-1 text-xs rounded-md text-ink-muted hover:bg-hover-surface transition-colors disabled:opacity-40")}>
                <Plus className={cn("w-3.5 h-3.5")} /> Add widget
              </button>
              {pickerOpen && (
                <AddWidgetPicker
                  views={eligibleWidgetViews(views, view.databaseId).filter(v => v.id !== view.id && !usedWidgetIds.has(v.id))}
                  onPickExisting={viewId => commit(addWidget(layout, viewId))}
                  onCreateNew={(type: ViewType) => commit(addWidget(layout, addViewForWidget(storeApi, view.databaseId, type)))}
                  onClose={() => setPickerOpen(false)} />
              )}
            </div>
          )}
          {!locked && (
            <button onClick={() => setEditMode(e => !e)}
              className={cn(`flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors ${
                editMode ? 'text-accent-text-light bg-accent-soft' : 'text-ink-muted hover:bg-hover-surface'
              }`)}>
              {editMode ? <Check className={cn("w-3.5 h-3.5")} /> : <Pencil className={cn("w-3.5 h-3.5")} />}
              {editMode ? 'Done' : 'Edit layout'}
            </button>
          )}
        </div>
      </div>

      {(showFilters || filters.length > 0) && (
        <DashboardFilterBar filters={[...filters]} properties={filterableProperties(database.properties)}
          onChange={next => updateViewSettings(view.id, { dashboardFilters: next })} />
      )}

      <DashboardFiltersProvider value={filters}>
        <div ref={containerRef} className={cn("flex-1 overflow-auto p-4")}>
          <div ref={indicatorRef} aria-hidden="true" data-dash-drop-indicator
            className={cn("pointer-events-none fixed z-40 rounded bg-accent")}
            style={{ display: 'none' }} />
          {layout.rows.length === 0 && (
            <div className={cn("h-64 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line text-ink-muted")}>
              <p className={cn("text-sm font-medium")}>Build your dashboard</p>
              <p className={cn("text-xs")}>Add widgets that show this database's views side by side.</p>
              {!locked && (
                <button onClick={() => { setEditMode(true); setPickerOpen(true); }}
                  className={cn("mt-1 flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-accent-soft text-accent-text-light hover:bg-accent-soft3 transition-colors")}>
                  <Plus className={cn("w-3.5 h-3.5")} /> Add your first widget
                </button>
              )}
            </div>
          )}
          {layout.rows.map(row => (
            <DashboardRowShell key={row.id} row={row} editMode={editMode}
              onCommitWidths={(dividerIndex, delta) => commit(resizeWidths(layout, row.id, dividerIndex, delta))}
              onCommitHeight={height => commit(resizeRowHeight(layout, row.id, height))}
              renderWidget={widgetId => {
                const widget = layout.widgets.find(w => w.id === widgetId);
                if (!widget) return null;
                return (
                  <DashboardWidgetFrame widget={widget}
                    view={views[widget.viewId] ?? null} editMode={editMode}
                    actions={widgetActions(widgetId, row.id, row.widgetIds.indexOf(widgetId))} />
                );
              }} />
          ))}
        </div>
      </DashboardFiltersProvider>
    </div>
  );
}
