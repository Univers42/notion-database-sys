/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   TableView.tsx                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/02 14:38:28 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/03 00:12:17 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useDatabaseStore } from '../../../store/dbms/hardcoded/useDatabaseStore';
import { useActiveViewId } from '../../../hooks/useDatabaseScope';
import { PropertyConfigPanel } from '../../PropertyConfigPanel';
import { FormulaEditorPanel } from '../../FormulaEditorPanel';
import { SchemaProperty, PropertyValue } from '../../../types/database';
import { READ_ONLY_TYPES } from '../../../constants/propertyIcons';
import { useFillDrag } from './useFillDrag';
import { useColumnResize, useColWidth } from './useColumnResize';
import { useTableKeyboard } from './useTableKeyboard';
import { TableHeader } from './TableHeader';
import { TableGroupRows, renderPageRows } from './TableGroupRows';
import { TableRowContextMenu } from './TableRowContextMenu';
import { ChevronDown, Plus } from 'lucide-react';

export function TableView() {
  const activeViewId = useActiveViewId();
  const views = useDatabaseStore(s => s.views);
  const databases = useDatabaseStore(s => s.databases);
  const _pages = useDatabaseStore(s => s.pages);
  const _searchQuery = useDatabaseStore(s => s.searchQuery);
  const { getPagesForView, addPage, openPage, deletePage,
    getGroupedPages, duplicatePage } = useDatabaseStore.getState();

  const view = activeViewId ? views[activeViewId] : null;
  const database = view ? databases[view.databaseId] : null;

  const [focusedCell, setFocusedCell] = useState<{ pageId: string; propId: string } | null>(null);
  const [editingCell, setEditingCell] = useState<{ pageId: string; propId: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dragColId, setDragColId] = useState<string | null>(null);
  const [configPanel, setConfigPanel] = useState<{ prop: SchemaProperty; position: { top: number; left: number } } | null>(null);
  const [visibleCount, setVisibleCount] = useState<number | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [formulaEditor, setFormulaEditor] = useState<{ propId: string } | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const { fillDrag, startFillDrag } = useFillDrag(activeViewId);
  const { resizingCol, handleResizeStart } = useColumnResize(view?.id ?? '');
  const getColWidth = useColWidth();
  useEffect(() => { setVisibleCount(null); }, [activeViewId, view?.settings?.loadLimit]);

  const visibleProps = useMemo(
    () => (view && database) ? view.visibleProperties.map(id => database.properties[id]).filter(Boolean) : [],
    [view, database]
  );
  const allProps = useMemo(
    () => database ? Object.values(database.properties) : [],
    [database]
  );
  const hiddenProps = useMemo(
    () => allProps.filter(p => view ? !view.visibleProperties.includes(p.id) : true),
    [allProps, view]
  );
  const filteredVisible = useMemo(
    () => visibleProps.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [visibleProps, searchQuery]
  );
  const filteredHidden = useMemo(
    () => hiddenProps.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [hiddenProps, searchQuery]
  );
  const [rowMenu, setRowMenu] = useState<{ pageId: string; x: number; y: number } | null>(null);

  const pages = view ? getPagesForView(view.id) : [];
  const loadLimit = view?.settings?.loadLimit || 50;
  const currentLimit = visibleCount ?? loadLimit;
  const displayedPages = pages.slice(0, currentLimit);
  const hasMore = pages.length > currentLimit;

  const handleCellClick = useCallback((pageId: string, propId: string, type: string, currentValue: PropertyValue) => {
    setFocusedCell({ pageId, propId });
    if (type === 'checkbox') {
      useDatabaseStore.getState().updatePageProperty(pageId, propId, !currentValue);
    } else if (!READ_ONLY_TYPES.has(type)) {
      setEditingCell({ pageId, propId });
    }
  }, []);
  const handleUpdateProperty = useCallback((pageId: string, propId: string, value: PropertyValue) => {
    useDatabaseStore.getState().updatePageProperty(pageId, propId, value);
  }, []);
  const handleStopEditing = useCallback(() => { setEditingCell(null); }, []);
  const handleOpenPage = useCallback((pageId: string) => { useDatabaseStore.getState().openPage(pageId); }, []);
  const handleFormulaEdit = useCallback((propId: string) => { setFormulaEditor({ propId }); }, []);
  const handleRowMenu = useCallback((pageId: string, x: number, y: number) => { setRowMenu({ pageId, x, y }); }, []);
  const handlePropertyConfig = useCallback((prop: SchemaProperty, position: { top: number; left: number }) => { setConfigPanel({ prop, position }); }, []);

  const handleHeaderClick = (e: React.MouseEvent, prop: SchemaProperty) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setConfigPanel({ prop, position: { top: rect.bottom + 4, left: rect.left } });
  };

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId); else next.add(groupId);
      return next;
    });
  };

  const handleKeyDown = useTableKeyboard({
    focusedCell, editingCell, setFocusedCell, setEditingCell,
    displayedPages, visibleProps, database, tableRef,
  });

  if (!view || !database) return null;

  const settings = view.settings || {};
  const showVerticalLines = settings.showVerticalLines !== false;
  const wrapContent = settings.wrapContent === true;
  const showRowNumbers = settings.showRowNumbers === true;
  const colCount = visibleProps.length + (showRowNumbers ? 1 : 0) + 2;
  const isGrouped = !!view.grouping;
  const groupedData = isGrouped ? getGroupedPages(view.id) : [];

  const rowProps = {
    visibleProps, focusedCell, editingCell, fillDrag,
    showRowNumbers, showVerticalLines, wrapContent, getColWidth,
    databaseId: database.id, onCellClick: handleCellClick,
    onUpdateProperty: handleUpdateProperty, onStopEditing: handleStopEditing,
    onOpenPage: handleOpenPage, onFillDragStart: startFillDrag,
    onFormulaEdit: handleFormulaEdit, onRowMenu: handleRowMenu,
    onPropertyConfig: handlePropertyConfig, tableRef,
  };

  return (
    <div className="flex-1 overflow-auto bg-surface-primary outline-none" role="grid" tabIndex={0} onKeyDown={handleKeyDown} ref={tableRef}>
      <div className="inline-block min-w-full">
        <table className="min-w-full text-left border-collapse">
          <TableHeader
            visibleProps={visibleProps} showRowNumbers={showRowNumbers}
            showVerticalLines={showVerticalLines} getColWidth={getColWidth}
            resizingCol={resizingCol} handleResizeStart={handleResizeStart}
            dragColId={dragColId} setDragColId={setDragColId}
            viewId={view.id} databaseId={database.id}
            searchQuery={searchQuery} setSearchQuery={setSearchQuery}
            filteredVisible={filteredVisible} filteredHidden={filteredHidden}
            onHeaderClick={handleHeaderClick}
          />
          <tbody>
            {isGrouped ? (
              <TableGroupRows
                groupedData={groupedData} collapsedGroups={collapsedGroups}
                toggleGroup={toggleGroup} colCount={colCount}
                addPage={addPage} {...rowProps}
              />
            ) : (
              <>
                {renderPageRows(displayedPages, rowProps)}
                {hasMore && (
                  <tr>
                    <td colSpan={colCount} className="p-0 border-b border-line">
                      <button
                        onClick={() => setVisibleCount(Math.min(currentLimit + loadLimit, pages.length))}
                        className="w-full text-left px-4 py-2 text-sm text-accent-text-soft hover:text-hover-accent-text-bold hover:bg-hover-surface-accent2 transition-colors flex items-center justify-between"
                      >
                        <span className="flex items-center gap-2"><ChevronDown className="w-4 h-4" />Load more</span>
                        <span className="text-xs text-ink-muted tabular-nums">{currentLimit} of {pages.length}</span>
                      </button>
                    </td>
                  </tr>
                )}
                <tr>
                  <td colSpan={colCount} className="p-0">
                    <button onClick={() => addPage(database.id)}
                      className="w-full text-left px-4 py-2.5 text-sm text-ink-muted hover:text-hover-text hover:bg-hover-surface-accent transition-colors flex items-center gap-2 border-b border-transparent hover:border-hover-border-accent">
                      <Plus className="w-4 h-4" /> New
                    </button>
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      {configPanel && (
        <PropertyConfigPanel property={configPanel.prop} databaseId={database.id}
          viewId={view.id} position={configPanel.position} onClose={() => setConfigPanel(null)} />
      )}
      {formulaEditor && (
        <FormulaEditorPanel databaseId={database.id} propertyId={formulaEditor.propId}
          onClose={() => setFormulaEditor(null)} />
      )}
      {rowMenu && (
        <TableRowContextMenu rowMenu={rowMenu} onClose={() => setRowMenu(null)}
          openPage={openPage} duplicatePage={duplicatePage} deletePage={deletePage} />
      )}
    </div>
  );
}
