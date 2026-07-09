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
import { addWidget, duplicateWidget, removeWidget, layoutFromSettings, rowStacks, MAX_WIDGETS, type AddWidgetOptions } from './model/dashboardLayout';
import type { DashboardLayout } from './model/dashboardLayout';
import type { StackVariant } from './DashboardRowShell';
import {
  moveWidget, resizeWidths, resizeRowHeight, resizeWidgetHeight,
  resizeStackShares, resizeStackHeight, resizeLastWidth,
} from './model/dashboardLayoutMove';
import {
  addViewForWidget, duplicateViewForWidget, filterableProperties,
  groupedWidgetViews, numberProperties,
} from './model/dashboardViewOps';
import type { DashboardStatConfig, ViewType } from '../../../../types/database';
import { cn } from '../../../../utils/cn';

/** Where a picked widget should land (toolbar/bottom-strip/row `+`). */
interface PickerTarget {
  rowId?: string;
  forceNewRow?: boolean;
}

/** Notion-model dashboard: toolbar + filter bar + widget rows. */
export default function DashboardNotionView() {
  const activeViewId = useActiveViewId();
  // Narrow selectors: a bare useDatabaseStore() re-rendered the WHOLE dashboard
  // (every embedded view) on every store change — the main sluggishness source.
  const views = useDatabaseStore(s => s.views);
  const databases = useDatabaseStore(s => s.databases);
  const updateViewSettings = useDatabaseStore(s => s.updateViewSettings);
  const storeApi = useStoreApi();
  const view = activeViewId ? views[activeViewId] : null;
  const database = view ? databases[view.databaseId] : null;
  const [editMode, setEditMode] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
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
  const { host: hostViewsAll, others: otherGroupsAll } = groupedWidgetViews(views, databases, view.databaseId);
  const hostViews = hostViewsAll.filter(v => v.id !== view.id && !usedWidgetIds.has(v.id));
  const otherGroups = otherGroupsAll
    .map(group => ({ ...group, views: group.views.filter(v => !usedWidgetIds.has(v.id)) }))
    .filter(group => group.views.length > 0);
  const hostNumberProps = numberProperties(database.properties);
  // Cards with their own height (detached from their row's group bar).
  const cellHeights = Object.fromEntries(
    layout.widgets.flatMap(w => (w.height != null ? [[w.id, w.height] as const] : [])),
  );

  // "Responsive layout" (view setting): rows with more widgets stack at wider
  // container widths so no widget renders too thin to read. Stat/KPI widgets
  // stay legible much narrower, so all-stat rows get gentler thresholds.
  // OFF keeps the always-on 672px (2xl) baseline only.
  const stackVariantFor = (row: DashboardLayout['rows'][number]): StackVariant => {
    const n = row.widgetIds.length;
    if (settings.responsiveLayout !== true || n <= 1) return '2xl';
    const allStats = row.widgetIds.every(id => layout.widgets.find(w => w.id === id)?.stat);
    if (allStats) return n >= 4 ? '3xl' : '2xl';
    if (n === 2) return '3xl';
    if (n === 3) return '4xl';
    return '5xl';
  };

  const commit = (next: DashboardLayout | null) => {
    if (!next) return;
    updateViewSettings(view.id, { dashboardRows: next.rows, dashboardWidgets: next.widgets });
  };
  const patchWidget = (widgetId: string, updates: Partial<(typeof layout.widgets)[number]>) =>
    commit({
      ...layout,
      widgets: layout.widgets.map(w => (w.id === widgetId ? { ...w, ...updates } : w)),
    });

  const addOptions = (): AddWidgetOptions => ({
    targetRowId: pickerTarget?.rowId,
    forceNewRow: pickerTarget?.forceNewRow,
  });
  const handlePickExisting = (viewId: string) => commit(addWidget(layout, viewId, undefined, addOptions()));
  const handleCreateNew = (type: ViewType) =>
    commit(addWidget(layout, addViewForWidget(storeApi, view.databaseId, type), undefined, addOptions()));
  const handlePickStat = (stat: DashboardStatConfig) => {
    // A stat needs a backing view: the first host view, else a fresh table.
    const backing = hostViewsAll.find(v => v.id !== view.id)?.id
      ?? addViewForWidget(storeApi, view.databaseId, 'table', 'All records');
    commit(addWidget(layout, backing, undefined, { ...addOptions(), stat }));
  };

  /** One-click starter built purely from EXISTING views (view creation on
   *  adapter-backed surfaces races the host catalog): KPI row on top, the
   *  primary views below. */
  const applySuggestedLayout = () => {
    const candidates = hostViewsAll.filter(v => v.id !== view.id);
    const backing = candidates[0]?.id;
    if (!backing) return;
    let next = addWidget(layout, backing, undefined, { stat: { fn: 'count' } });
    if (next && hostNumberProps[0]) {
      next = addWidget(next, backing, undefined, { stat: { fn: 'sum', propertyId: hostNumberProps[0].id } }) ?? next;
    }
    const chartView = candidates.find(v => v.type === 'chart');
    if (next && chartView) next = addWidget(next, chartView.id) ?? next;
    next = next ? (addWidget(next, backing, undefined, { forceNewRow: true }) ?? next) : next;
    if (next && candidates[1]) next = addWidget(next, candidates[1].id, undefined, { targetRowId: next.rows[1]?.id }) ?? next;
    commit(next);
    setEditMode(true);
  };

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
    onSetStat: (stat: DashboardStatConfig | null) => patchWidget(widgetId, { stat: stat ?? undefined }),
    onDragStart: (event: React.PointerEvent) => startDrag(widgetId, event),
  });

  const picker = (
    <AddWidgetPicker
      hostViews={hostViews}
      otherGroups={otherGroups}
      numberProps={hostNumberProps}
      onPickExisting={handlePickExisting}
      onPickStat={handlePickStat}
      onCreateNew={handleCreateNew}
      onClose={() => setPickerTarget(null)}
    />
  );

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
              <button onClick={() => setPickerTarget(t => (t && !t.rowId && !t.forceNewRow ? null : {}))}
                disabled={layout.widgets.length >= MAX_WIDGETS}
                className={cn("flex items-center gap-1 px-2 py-1 text-xs rounded-md text-ink-muted hover:bg-hover-surface transition-colors disabled:opacity-40")}>
                <Plus className={cn("w-3.5 h-3.5")} /> Add widget
              </button>
              {pickerTarget && !pickerTarget.rowId && !pickerTarget.forceNewRow && picker}
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
        <div ref={containerRef} className={cn("flex-1 overflow-auto p-4 @container")}>
          <div ref={indicatorRef} aria-hidden="true" data-dash-drop-indicator
            className={cn("pointer-events-none fixed z-40 rounded bg-accent")}
            style={{ display: 'none' }} />
          {layout.rows.length === 0 && (
            <div className={cn("h-64 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line text-ink-muted")}>
              <p className={cn("text-sm font-medium")}>Build your dashboard</p>
              <p className={cn("text-xs")}>Mix views, numbers, and charts — from this database or any other.</p>
              {!locked && (
                <div className={cn("mt-1 flex items-center gap-2")}>
                  {hostViewsAll.some(v => v.id !== view.id) && (
                    <button onClick={applySuggestedLayout}
                      className={cn("flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-accent text-ink-inverse hover:opacity-90 transition-opacity")}>
                      Use suggested layout
                    </button>
                  )}
                  <div className={cn("relative")}>
                    <button onClick={() => { setEditMode(true); setPickerTarget({}); }}
                      className={cn("flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-accent-soft text-accent-text-light hover:bg-accent-soft3 transition-colors")}>
                      <Plus className={cn("w-3.5 h-3.5")} /> Add your first widget
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          {layout.rows.map(row => (
            <DashboardRowShell key={row.id} row={row} editMode={editMode}
              stack={stackVariantFor(row)}
              cellHeights={cellHeights}
              onCommitWidths={(dividerIndex, delta) => commit(resizeWidths(layout, row.id, dividerIndex, delta))}
              onCommitHeight={height => commit(resizeRowHeight(layout, row.id, height))}
              onCommitCellHeight={(widgetId, height) => commit(resizeWidgetHeight(layout, widgetId, height))}
              onCommitStackHeight={(colIndex, height) => commit(resizeStackHeight(layout, row.id, colIndex, height))}
              onCommitStackShares={(colIndex, dividerIndex, delta) =>
                commit(resizeStackShares(layout, row.id, colIndex, dividerIndex, delta))}
              onCommitLastWidth={delta => commit(resizeLastWidth(layout, row.id, delta))}
              onAddToRow={editMode && !locked && layout.widgets.length < MAX_WIDGETS
                ? () => setPickerTarget(t => (t?.rowId === row.id ? null : { rowId: row.id }))
                : undefined}
              addPicker={pickerTarget?.rowId === row.id
                ? <div className={cn("absolute right-0 top-9 z-30")}><div className={cn("relative")}>{picker}</div></div>
                : null}
              renderWidget={widgetId => {
                const widget = layout.widgets.find(w => w.id === widgetId);
                if (!widget) return null;
                const colIndex = rowStacks(row).findIndex(s => s.widgetIds.includes(widgetId));
                return (
                  <DashboardWidgetFrame widget={widget}
                    view={views[widget.viewId] ?? null} editMode={editMode}
                    actions={widgetActions(widgetId, row.id, colIndex)} />
                );
              }} />
          ))}
          {editMode && !locked && layout.rows.length > 0 && (
            <div className={cn("relative mt-1")}>
              <button onClick={() => setPickerTarget(t => (t?.forceNewRow ? null : { forceNewRow: true }))}
                disabled={layout.widgets.length >= MAX_WIDGETS}
                className={cn("w-full h-9 flex items-center justify-center gap-1 rounded-lg border border-dashed border-line text-xs text-ink-muted hover:text-ink hover:bg-hover-surface-soft2 transition-colors disabled:opacity-40")}>
                <Plus className={cn("w-3.5 h-3.5")} /> Add widget
              </button>
              {pickerTarget?.forceNewRow && picker}
            </div>
          )}
        </div>
      </DashboardFiltersProvider>
    </div>
  );
}
