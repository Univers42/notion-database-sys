/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useTableViewState.ts                               :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/05 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 16:30:13 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState, useRef, useCallback, useMemo } from 'react';
import { useDatabaseStore, useStoreApi } from '../../../store/dbms/hardcoded/useDatabaseStore';
import { useActiveViewId } from '../../../hooks/useDatabaseScope';
import { SchemaProperty, PropertyValue } from '../../../types/database';
import { useFillDrag } from './useFillDrag';
import { useColumnResize, useColWidth } from './useColumnResize';
import { useTableKeyboard } from './useTableKeyboard';
import { type CellCoord, resolveCellActivation } from './gridKeyboard';
import { runButtonAction } from './cellRenderers';
import { useViewPages } from '../../../hooks/useViewPages';
import { useViewPager } from '../../../hooks/useViewPager';
import { useTableVirtualizer } from './useTableVirtualizer';

/** Encapsulates all state, memos, and callbacks for the TableView component. */
export function useTableViewState() {
  const activeViewId = useActiveViewId();
  const views = useDatabaseStore(s => s.views);
  const databases = useDatabaseStore(s => s.databases);
  const _pages = useDatabaseStore(s => s.pages);
  const _searchQuery = useDatabaseStore(s => s.searchQuery);
  const storeApi = useStoreApi();
  const { addPage, openPage, deletePage,
    getGroupedPages, duplicatePage } = storeApi.getState();

  const view = activeViewId ? views[activeViewId] : null;
  const database = view ? databases[view.databaseId] : null;

  const [focusedCell, setFocusedCell] = useState<{ pageId: string; propId: string } | null>(null);
  const [editingCell, setEditingCell] = useState<{ pageId: string; propId: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dragColId, setDragColId] = useState<string | null>(null);
  const [configPanel, setConfigPanel] = useState<{ prop: SchemaProperty; position: { top: number; left: number } } | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [formulaEditor, setFormulaEditor] = useState<{ propId: string } | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  // The element focused *before* the grid was entered — Escape from a selected
  // cell restores it ("go back to previous focus"). Captured only on a fresh
  // entry so returning from a popover doesn't overwrite it.
  const previousFocusRef = useRef<HTMLElement | null>(null);
  // Set on pointer-down so grid focusin can tell a click (which will select the
  // clicked cell itself) from a keyboard tab-in (which should select the first).
  const pointerDownRef = useRef(false);
  const { fillDrag, startFillDrag } = useFillDrag(activeViewId);
  const { resizingCol, handleResizeStart } = useColumnResize(view?.id ?? '');
  const getColWidth = useColWidth();
  const [rowMenu, setRowMenu] = useState<{ pageId: string; x: number; y: number } | null>(null);

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

  const pages = useViewPages(view?.id);
  // Grouping renders every group (its own per-group cap); the pager only
  // windows the flat, ungrouped list — the common case the top/bottom nav drive.
  const pager = useViewPager(pages, view?.settings?.loadLimit, activeViewId);
  const displayedPages = pager.items;

  const settings = view?.settings || {};
  const showVerticalLines = settings.showVerticalLines !== false;
  const wrapContent = settings.wrapContent === true;
  const showRowNumbers = settings.showRowNumbers === true;
  // +1: the leading control gutter (drag grip / expand / open) is ALWAYS rendered.
  const colCount = visibleProps.length + 1 + 2;
  const isGrouped = !!view?.grouping;
  const groupedData = (isGrouped && view) ? getGroupedPages(view.id) : [];
  const virtual = useTableVirtualizer({
    count: displayedPages.length,
    scrollRef: tableRef,
    enabled: !isGrouped,
  });

  // Activate a cell per its type (Enter or double-click): text/select/date etc.
  // → edit; checkbox → toggle; button → run action; formula → open panel;
  // read-only/computed → no-op. One place, shared by mouse and keyboard.
  const activateCell = useCallback((cell: CellCoord) => {
    if (!database) return;
    const prop = database.properties[cell.propId];
    if (!prop) return;
    switch (resolveCellActivation(prop.type)) {
      case 'toggle': {
        const page = displayedPages.find(p => p.id === cell.pageId);
        storeApi.getState().updatePageProperty(cell.pageId, cell.propId, !page?.properties[cell.propId]);
        break;
      }
      case 'button': {
        const page = displayedPages.find(p => p.id === cell.pageId);
        if (page) runButtonAction(prop, { storeApi, page, databaseId: database.id });
        break;
      }
      case 'formula': setFormulaEditor({ propId: cell.propId }); break;
      case 'edit': setEditingCell(cell); break;
      case 'readonly': break;
    }
  }, [database, displayedPages, storeApi]);

  // Spreadsheet model: single click *selects* the cell (ring, no editor); a
  // checkbox is the one exception that toggles on a single click. Editing starts
  // on Enter / double-click (see handleCellDoubleClick) / — never a single click.
  const handleCellClick = useCallback((pageId: string, propId: string, type: string, currentValue: PropertyValue) => {
    setFocusedCell({ pageId, propId });
    if (type === 'checkbox') storeApi.getState().updatePageProperty(pageId, propId, !currentValue);
  }, [storeApi]);
  const handleCellDoubleClick = useCallback((pageId: string, propId: string, type: string) => {
    setFocusedCell({ pageId, propId });
    if (type === 'checkbox') return; // the first click already toggled it
    activateCell({ pageId, propId });
  }, [activateCell]);
  const handleUpdateProperty = useCallback((pageId: string, propId: string, value: PropertyValue) => {
    storeApi.getState().updatePageProperty(pageId, propId, value);
  }, [storeApi]);

  // Entering the grid: remember where focus came from (for Escape-to-return) and,
  // for a keyboard tab-in (no pointer), pre-select the first cell so arrows work
  // immediately. A click skips the pre-select — its own handler selects the cell.
  const handleGridMouseDown = useCallback(() => { pointerDownRef.current = true; }, []);
  const handleGridFocus = useCallback((e: React.FocusEvent<HTMLDivElement>) => {
    const grid = tableRef.current;
    const from = e.relatedTarget as HTMLElement | null;
    const fresh = !focusedCell;
    const viaPointer = pointerDownRef.current;
    pointerDownRef.current = false;
    if (fresh && from && !grid?.contains(from)) previousFocusRef.current = from;
    if (fresh && !viaPointer) {
      const first = displayedPages[0];
      const firstProp = visibleProps[0];
      if (first && firstProp) setFocusedCell({ pageId: first.id, propId: firstProp.id });
    }
  }, [focusedCell, displayedPages, visibleProps]);
  // Escape from a selected (not editing) cell: leave the grid, restoring the
  // focus that preceded it so the user lands back in the surrounding page.
  const handleExitGrid = useCallback(() => {
    setFocusedCell(null);
    setEditingCell(null);
    const prev = previousFocusRef.current;
    previousFocusRef.current = null;
    tableRef.current?.blur();
    if (prev && document.contains(prev)) prev.focus();
  }, []);
  const handleStopEditing = useCallback(() => { setEditingCell(null); }, []);
  const handleOpenPage = useCallback((pageId: string) => { storeApi.getState().openPage(pageId); }, [storeApi]);
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
    onActivateCell: activateCell, onExitGrid: handleExitGrid,
    scrollToIndex: virtual.scrollToIndex,
  });

  return {
    view, database,
    focusedCell, editingCell,
    searchQuery, setSearchQuery,
    dragColId, setDragColId,
    configPanel, setConfigPanel,
    collapsedGroups, formulaEditor, setFormulaEditor,
    tableRef, fillDrag, startFillDrag,
    resizingCol, handleResizeStart, getColWidth,
    visibleProps, filteredVisible, filteredHidden,
    rowMenu, setRowMenu,
    pages, displayedPages, pager,
    handleCellClick, handleCellDoubleClick, handleUpdateProperty, handleStopEditing,
    handleOpenPage, handleFormulaEdit, handleRowMenu, handlePropertyConfig,
    handleHeaderClick, toggleGroup, handleKeyDown, handleGridFocus, handleGridMouseDown,
    addPage, openPage, deletePage, duplicatePage,
    showVerticalLines, wrapContent, showRowNumbers,
    colCount, isGrouped, groupedData,
    virtual,
  };
}
