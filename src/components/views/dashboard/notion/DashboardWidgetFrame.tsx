/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   DashboardWidgetFrame.tsx                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/10 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── DashboardWidgetFrame — one widget card: chrome + embedded view ─────────
// The body is literally <DatabaseView viewId={...} compact /> — the widget IS
// a database view (Notion model), scoped via DatabaseScopeProvider.
// Reading mode drops the toolbar strip: a view gets a plain heading, a number
// tile none (its label sits under the number); edit mode brings the strip back.

import React, { useRef, useState } from 'react';
import {
  MoreHorizontal, Settings2, Copy, Trash2, ArrowLeft, ArrowRight,
  CornerDownRight, GripVertical, Pencil, EyeOff, Eye, Hash, Table2, Smile, BarChart3, List,
} from 'lucide-react';
import { DatabaseView } from '../../../DatabaseView';
import { ViewSettingsPanel } from '../../../ViewSettingsPanel';
import { DatabaseScopeProvider } from '../../../../hooks/useDatabaseScope';
import { ErrorBoundary } from '../../../ErrorBoundary';
import { IconPickerPopover } from '../../../ui/IconPickerPopover';
import { useOutsideClick } from '../../../../hooks/useOutsideClick';
import { useViewPages } from '../../../../hooks/useViewPages';
import { useDatabaseStore } from '../../../../store/dbms/hardcoded/useDatabaseStore';
import { VIEW_META } from '../../../viewSettings/constants';
import type { ViewConfig, DashboardChartConfig, DashboardRecordsConfig, DashboardStatConfig, DashboardViewWidget } from '../../../../types/database';
import { numberProperties } from './model/dashboardViewOps';
import { formatCellValue } from '../constants';
import { StatKpi, STAT_FN_LABEL } from './StatKpi';
import { ChartView } from '../../chart/ChartView';
import { AskAiWidgetButton } from './AskAiWidgetButton';
import { cn } from '../../../../utils/cn';

export interface WidgetActions {
  onConfigureOpen?: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMove: (direction: 'left' | 'right' | 'newRowBelow') => void;
  onRename?: (title: string) => void;
  onToggleHideTitle?: () => void;
  /** Swap between the embedded view and a Number/KPI tile (null → view). */
  onSetStat?: (stat: DashboardStatConfig | null) => void;
  onSetChart?: (chart: DashboardChartConfig | null) => void;
  onSetRecords?: (records: DashboardRecordsConfig | null) => void;
  /** A Number tile's chip icon (null → the aggregate's default). */
  onSetIcon?: (icon: string | null) => void;
  /** Pointer drag start from the grip handle (edit mode). */
  onDragStart?: (event: React.PointerEvent) => void;
}

/** Live record count in the header — filters (view + global) shape it. */
function WidgetCountBadge({ viewId }: Readonly<{ viewId: string }>) {
  const pages = useViewPages(viewId);
  return (
    <span className={cn("text-xs text-ink-muted tabular-nums shrink-0 opacity-0 transition-opacity group-hover/widget:opacity-100")}>
      {pages.length}
    </span>
  );
}

/** Card chrome around an embedded view; edit mode reveals the action menu. */
export function DashboardWidgetFrame({ widget, view, editMode, actions }: Readonly<{
  widget: DashboardViewWidget;
  view: ViewConfig | null;
  editMode: boolean;
  actions: WidgetActions;
}>) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [pickingIcon, setPickingIcon] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const configRef = useRef<HTMLDivElement>(null);
  useOutsideClick(menuRef, menuOpen, () => setMenuOpen(false));
  useOutsideClick(configRef, configOpen, () => setConfigOpen(false));
  const databases = useDatabaseStore(s => s.databases);
  const widgetNumberProps = view ? numberProperties(databases[view.databaseId]?.properties ?? {}) : [];
  const widgetChartProps = view ? Object.values(databases[view.databaseId]?.properties ?? {}).filter(p => p.type === 'select' || p.type === 'status' || p.type === 'date') : [];

  if (!view) {
    return (
      <div className={cn("h-full flex items-center justify-center rounded-xl border border-dashed border-line text-xs text-ink-muted")}>
        This widget's view was deleted.
        {editMode && (
          <button onClick={actions.onDelete} className={cn("ml-2 underline hover:text-ink")}>Remove widget</button>
        )}
      </div>
    );
  }
  const meta = VIEW_META[view.type];

  const menuItem = (icon: React.ReactNode, label: string, onClick: () => void, danger = false) => (
    <button onClick={() => { setMenuOpen(false); onClick(); }}
      className={cn(`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors hover:bg-hover-surface-soft2 ${danger ? 'text-danger-text' : 'text-ink-body'}`)}>
      <span className={cn("w-4 h-4 flex items-center justify-center shrink-0")}>{icon}</span>{label}
    </button>
  );

  const title = widget.title ?? view.name;
  const showHeader = editMode || (!widget.hideTitle && !widget.stat);
  return (
    <div className={cn("group/widget odb-rise-in h-full min-w-0 flex flex-col rounded-xl border border-line bg-surface-primary overflow-hidden")}>
      {showHeader && (
      <div className={cn(`flex items-center gap-1.5 shrink-0 ${editMode ? 'px-3 py-1.5 border-b border-line' : 'px-4 pt-3 pb-1'}`)}>
        {editMode && actions.onDragStart && (
          <button onPointerDown={actions.onDragStart} aria-label="Drag widget"
            className={cn("shrink-0 -ml-1 p-0.5 rounded text-ink-muted hover:bg-hover-surface cursor-grab touch-none")}>
            <GripVertical className={cn("w-3.5 h-3.5")} />
          </button>
        )}
        {editMode && (
          <span className={cn("w-4 h-4 flex items-center justify-center text-ink-muted shrink-0")}>
            {widget.stat ? <Hash className={cn("w-3.5 h-3.5")} /> : meta?.svgIcon}
          </span>
        )}
        {renaming === null ? (
          <span title={title} data-dash-title
            className={cn(`truncate ${editMode ? 'text-xs font-medium' : 'text-sm font-semibold'} ${widget.hideTitle ? 'text-ink-muted italic' : 'text-ink'}`)}>
            {title}
          </span>
        ) : (
          <input autoFocus value={renaming} onChange={e => setRenaming(e.target.value)}
            aria-label="Widget title"
            onBlur={() => { actions.onRename?.(renaming.trim()); setRenaming(null); }}
            onKeyDown={e => { if (e.key === 'Enter') { actions.onRename?.(renaming.trim()); setRenaming(null); } }}
            className={cn("flex-1 min-w-0 rounded border border-line bg-transparent px-1 text-xs outline-none")} />
        )}
        {!editMode && !widget.stat && (
          <span className={cn("ml-auto flex items-center gap-1")}>
            <AskAiWidgetButton viewId={widget.viewId} title={title} />
            <WidgetCountBadge viewId={widget.viewId} />
          </span>
        )}
        {editMode && (
          <div ref={menuRef} className={cn("relative ml-auto shrink-0")}>
            <button ref={menuButtonRef} onClick={() => setMenuOpen(o => !o)} aria-label="Widget actions"
              className={cn("p-1 rounded-md hover:bg-hover-surface text-ink-muted")}>
              <MoreHorizontal className={cn("w-3.5 h-3.5")} />
            </button>
            {pickingIcon && (
              <IconPickerPopover anchorRef={menuButtonRef} align="right" value={widget.icon ?? null}
                onSelect={name => { actions.onSetIcon?.(name); setPickingIcon(false); }}
                onRemove={() => { actions.onSetIcon?.(null); setPickingIcon(false); }}
                onClose={() => setPickingIcon(false)} />
            )}
            {menuOpen && (
              <div className={cn("odb-pop-in absolute right-0 top-full mt-1 z-30 w-48 py-1 rounded-lg border border-line bg-surface-primary shadow-lg max-h-72 overflow-y-auto")}>
                {menuItem(<Settings2 className={cn("w-3.5 h-3.5")} />, 'Configure view', () => setConfigOpen(true))}
                {actions.onRename && menuItem(<Pencil className={cn("w-3.5 h-3.5")} />, 'Rename widget', () => setRenaming(title))}
                {actions.onToggleHideTitle && menuItem(
                  widget.hideTitle ? <Eye className={cn("w-3.5 h-3.5")} /> : <EyeOff className={cn("w-3.5 h-3.5")} />,
                  widget.hideTitle ? 'Show title' : 'Hide title', actions.onToggleHideTitle)}
                {widget.stat && actions.onSetIcon && menuItem(<Smile className={cn("w-3.5 h-3.5")} />, 'Change icon', () => setPickingIcon(true))}
                {actions.onSetStat && (
                  <>
                    <div className={cn("my-1 border-t border-line")} />
                    <div className={cn("px-3 pt-1 pb-0.5 text-[10px] font-medium text-ink-muted uppercase tracking-wide select-none")}>Show as</div>
                    {widget.stat && menuItem(<Table2 className={cn("w-3.5 h-3.5")} />, 'Embedded view', () => actions.onSetStat?.(null))}
                    {(!widget.stat || widget.stat.fn !== 'count') &&
                      menuItem(<Hash className={cn("w-3.5 h-3.5")} />, 'Number · Count', () => actions.onSetStat?.({ fn: 'count' }))}
                    {widgetNumberProps.slice(0, 3).flatMap(prop => (
                      (['sum', 'avg'] as const)
                        .filter(fn => !(widget.stat?.fn === fn && widget.stat?.propertyId === prop.id))
                        .map(fn => menuItem(
                          <Hash className={cn("w-3.5 h-3.5")} />,
                          `Number · ${STAT_FN_LABEL[fn]} of ${prop.name}`,
                          () => actions.onSetStat?.({ fn, propertyId: prop.id }),
                        ))
                    ))}
                    {actions.onSetChart && (
                      <>
                        <div className={cn("my-1 border-t border-line")} />
                        <div className={cn("px-3 pt-1 pb-0.5 text-[10px] font-medium text-ink-muted uppercase tracking-wide select-none")}>Chart</div>
                        {widgetChartProps.slice(0, 5).map(prop => (
                          menuItem(<BarChart3 className={cn("w-3.5 h-3.5")} />, `Chart · ${prop.name}`,
                            () => actions.onSetChart?.({ chartType: 'vertical_bar', xAxisProperty: prop.id, yAxisAggregation: 'count' }))
                        ))}
                      </>
                    )}
                    {actions.onSetRecords && (
                      <>
                        <div className={cn("my-1 border-t border-line")} />
                        <div className={cn("px-3 pt-1 pb-0.5 text-[10px] font-medium text-ink-muted uppercase tracking-wide select-none")}>Records</div>
                        {menuItem(<List className={cn("w-3.5 h-3.5")} />, 'Recently edited', () => actions.onSetRecords?.({ direction: 'desc', limit: 10 }))}
                        {widgetNumberProps.slice(0, 3).map(prop => menuItem(
                          <List className={cn("w-3.5 h-3.5")} />, `Top by ${prop.name}`,
                          () => actions.onSetRecords?.({ sortPropertyId: prop.id, direction: 'desc', limit: 10, showPropertyId: prop.id })
                        ))}
                      </>
                    )}
                  </>
                )}
                <div className={cn("my-1 border-t border-line")} />
                {menuItem(<Copy className={cn("w-3.5 h-3.5")} />, 'Duplicate', actions.onDuplicate)}
                {menuItem(<ArrowLeft className={cn("w-3.5 h-3.5")} />, 'Move left', () => actions.onMove('left'))}
                {menuItem(<ArrowRight className={cn("w-3.5 h-3.5")} />, 'Move right', () => actions.onMove('right'))}
                {menuItem(<CornerDownRight className={cn("w-3.5 h-3.5")} />, 'Move to new row', () => actions.onMove('newRowBelow'))}
                {menuItem(<Trash2 className={cn("w-3.5 h-3.5")} />, 'Delete widget', actions.onDelete, true)}
              </div>
            )}
          </div>
        )}
      </div>
      )}
      <div className={cn("relative flex-1 min-h-0 flex flex-col overflow-auto")}>
        <ErrorBoundary>
          {widget.stat
            ? <StatKpi viewId={widget.viewId} stat={widget.stat} label={widget.hideTitle ? undefined : title} icon={widget.icon} />
            : widget.chart
              ? <DatabaseScopeProvider value={widget.viewId}><ChartView settingsOverride={widget.chart} /></DatabaseScopeProvider>
              : widget.records
                ? <RecordsWidget widget={widget} view={view} />
                : <DatabaseView viewId={widget.viewId} compact />}
        </ErrorBoundary>
        {configOpen && (
          <div ref={configRef} className={cn("absolute top-1 right-1 z-30 max-h-[95%] overflow-auto rounded-xl border border-line bg-surface-primary shadow-xl")}>
            <DatabaseScopeProvider value={widget.viewId}>
              <ViewSettingsPanel onClose={() => setConfigOpen(false)} />
            </DatabaseScopeProvider>
          </div>
        )}
      </div>
    </div>
  );
}


/** Compact record list for a records-presentation widget. */
function RecordsWidget({ widget, view }: Readonly<{ widget: DashboardViewWidget; view: ViewConfig | null }>) {
  const pages = useViewPages(widget.viewId);
  const getCellValue = useDatabaseStore(s => s.getCellValue);
  const getPageTitle = useDatabaseStore(s => s.getPageTitle);
  const openPage = useDatabaseStore(s => s.openPage);
  const databases = useDatabaseStore(s => s.databases);
  const database = view ? databases[view.databaseId] : undefined;
  const records = widget.records!;
  const sorted = React.useMemo(() => {
    const list = [...pages];
    list.sort((a, b) => {
      if (records.sortPropertyId) {
        const va = getCellValue(a, records.sortPropertyId);
        const vb = getCellValue(b, records.sortPropertyId);
        if (typeof va === 'number' && typeof vb === 'number') {
          return records.direction === 'asc' ? va - vb : vb - va;
        }
        const sa = String(va ?? '');
        const sb = String(vb ?? '');
        return records.direction === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa);
      }
      return records.direction === 'asc'
        ? a.updatedAt.localeCompare(b.updatedAt)
        : b.updatedAt.localeCompare(a.updatedAt);
    });
    return list.slice(0, records.limit);
  }, [pages, records, getCellValue]);

  const showProp = records.showPropertyId && database ? database.properties[records.showPropertyId] : null;

  return (
    <div className={cn("flex-1 min-h-0 overflow-auto p-3")}>
      <div className={cn("flex flex-col gap-1")}>
        {sorted.map(page => (
          <button type="button" key={page.id} onClick={() => openPage(page.id)}
            className={cn("flex items-center justify-between py-1.5 px-2 hover:bg-hover-surface rounded-lg cursor-pointer text-left w-full")}>
            <span className={cn("text-sm text-ink truncate")}>{getPageTitle(page) || 'Untitled'}</span>
            {showProp && (
              <span className={cn("text-xs text-ink-muted tabular-nums shrink-0 ml-2")}>
                {formatCellValue(page.properties[showProp.id], showProp)}
              </span>
            )}
          </button>
        ))}
        {sorted.length === 0 && <p className={cn("text-sm text-ink-muted py-4 text-center")}>No records</p>}
      </div>
    </div>
  );
}
