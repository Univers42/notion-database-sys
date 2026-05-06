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

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useDatabaseStore, useStoreApi } from '../../../store/dbms/hardcoded/useDatabaseStore';
import { useActiveViewId } from '../../../hooks/useDatabaseScope';
import { SchemaProperty, PropertyValue } from '../../../types/database';
import { READ_ONLY_TYPES } from '../../../constants/propertyIcons';
import { useFillDrag } from './useFillDrag';
import { useColumnResize, useColWidth } from './useColumnResize';
import { useTableKeyboard } from './useTableKeyboard';

/** Encapsulates all state, memos, and callbacks for the TableView component. */
export function useTableViewState() {
  const activeViewId = useActiveViewId();
  const views = useDatabaseStore(s => s.views);
  const databases = useDatabaseStore(s => s.databases);
  const _pages = useDatabaseStore(s => s.pages);
  const _searchQuery = useDatabaseStore(s => s.searchQuery);
  const storeApi = useStoreApi();
  const { getPagesForView, addPage, openPage, deletePage,
    getGroupedPages, duplicatePage } = storeApi.getState();

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
  const [rowMenu, setRowMenu] = useState<{ pageId: string; x: number; y: number } | null>(null);
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

  const pages = view ? getPagesForView(view.id) : [];
  const loadLimit = view?.settings?.loadLimit || 50;
  const currentLimit = visibleCount ?? loadLimit;
  const displayedPages = pages.slice(0, currentLimit);
  const hasMore = pages.length > currentLimit;

  const handleCellClick = useCallback((pageId: string, propId: string, type: string, currentValue: PropertyValue) => {
    setFocusedCell({ pageId, propId });
    if (type === 'checkbox') {
      storeApi.getState().updatePageProperty(pageId, propId, !currentValue);
    } else if (!READ_ONLY_TYPES.has(type)) {
      setEditingCell({ pageId, propId });
    }
  }, [storeApi]);
  const handleUpdateProperty = useCallback((pageId: string, propId: string, value: PropertyValue) => {
    storeApi.getState().updatePageProperty(pageId, propId, value);
  }, [storeApi]);
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
  });

  const settings = view?.settings || {};
  const showVerticalLines = settings.showVerticalLines !== false;
  const wrapContent = settings.wrapContent === true;
  const showRowNumbers = settings.showRowNumbers === true;
  const colCount = visibleProps.length + (showRowNumbers ? 1 : 0) + 2;
  const isGrouped = !!view?.grouping;
  const groupedData = (isGrouped && view) ? getGroupedPages(view.id) : [];

  return {
    view, database,
    focusedCell, editingCell,
    searchQuery, setSearchQuery,
    dragColId, setDragColId,
    configPanel, setConfigPanel,
    visibleCount, setVisibleCount,
    collapsedGroups, formulaEditor, setFormulaEditor,
    tableRef, fillDrag, startFillDrag,
    resizingCol, handleResizeStart, getColWidth,
    visibleProps, filteredVisible, filteredHidden,
    rowMenu, setRowMenu,
    pages, displayedPages, hasMore, loadLimit, currentLimit,
    handleCellClick, handleUpdateProperty, handleStopEditing,
    handleOpenPage, handleFormulaEdit, handleRowMenu, handlePropertyConfig,
    handleHeaderClick, toggleGroup, handleKeyDown,
    addPage, openPage, deletePage, duplicatePage,
    showVerticalLines, wrapContent, showRowNumbers,
    colCount, isGrouped, groupedData,
  };
}
