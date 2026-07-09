/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   TableView.tsx                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/02 14:38:28 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/05 01:31:17 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { PropertyConfigPanel } from '../../PropertyConfigPanel';
import { FormulaEditorPanel } from '../../FormulaEditorPanel';
import { TableHeader } from './TableHeader';
import { TableGroupRows, renderPageRows } from './TableGroupRows';
import { TableRowContextMenu } from './TableRowContextMenu';
import { ViewPaginationBar } from '../shared/ViewPaginationBar';
import { ChevronDown, Plus } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { useTableViewState } from './useTableViewState';
import { useDefaultTemplateCreate } from '../useDefaultTemplateCreate';
import { useSubItems } from './subItemsContext';
import { SubItemRows } from './SubItemRows';
import { colorForPage } from '../../../lib/conditionalColor';
import type { Page } from '../../../types/database';
import { useStoreApi } from '../../../store/dbms/hardcoded/useDatabaseStore';
import { buildManualRowOrder } from '../../../lib/manualRowOrder';
import { cellDomId } from './gridKeyboard';

/** Renders the full table view with header, rows, grouping, pagination, and cell editing. */
export function TableView() {
  const {
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
  } = useTableViewState();

  const subItems = useSubItems();
  const createRecord = useDefaultTemplateCreate(() => { if (database) addPage(database.id); });

  // Row drag-reorder (grip in the leading gutter): drop writes manualRowOrder
  // into view settings; getPagesForView applies it when no user sorts exist.
  const storeApi = useStoreApi();
  const dragRowRef = React.useRef<string | null>(null);
  const [dropTargetId, setDropTargetId] = React.useState<string | null>(null);
  const pageIdsRef = React.useRef<string[]>([]);
  pageIdsRef.current = pages.map((p: Page) => p.id);
  const viewIdRef = React.useRef<string | null>(null);
  viewIdRef.current = view?.id ?? null;
  const handleRowDragStart = React.useCallback((pageId: string) => { dragRowRef.current = pageId; }, []);
  const handleRowDragEnd = React.useCallback(() => { dragRowRef.current = null; setDropTargetId(null); }, []);
  const handleRowDragOver = React.useCallback((pageId: string) => {
    setDropTargetId((current) => (current === pageId ? current : pageId));
  }, []);
  const handleRowDrop = React.useCallback((targetId: string) => {
    const draggedId = dragRowRef.current;
    const viewId = viewIdRef.current;
    dragRowRef.current = null;
    setDropTargetId(null);
    if (!draggedId || !viewId) return;
    const order = buildManualRowOrder(pageIdsRef.current, draggedId, targetId);
    if (order) storeApi.getState().updateViewSettings(viewId, { manualRowOrder: order });
  }, [storeApi]);

  if (!view || !database) return null;

  const renderAfterRow = subItems
    ? (page: Page): React.ReactNode =>
        subItems.isExpanded(page.id) ? (
          <SubItemRows
            recordId={page.id}
            visibleProps={visibleProps}
            showRowNumbers={showRowNumbers}
            getColWidth={getColWidth}
            titlePropId={database.titlePropertyId}
            colCount={colCount}
          />
        ) : null
    : undefined;

  const colorRules = view.settings?.conditionalColors;
  const rowProps = {
    visibleProps, focusedCell, editingCell, fillDrag,
    showRowNumbers, showVerticalLines, wrapContent, getColWidth,
    databaseId: database.id, onCellClick: handleCellClick, onCellDoubleClick: handleCellDoubleClick,
    onUpdateProperty: handleUpdateProperty, onStopEditing: handleStopEditing,
    onOpenPage: handleOpenPage, onFillDragStart: startFillDrag,
    onFormulaEdit: handleFormulaEdit, onRowMenu: handleRowMenu,
    onPropertyConfig: handlePropertyConfig, tableRef,
    rowTint: colorRules?.length
      ? (page: Page) => colorForPage(page, colorRules, database.properties)?.tint ?? null
      : undefined,
    // Manual reorder only makes sense without user sorts or grouping.
    canReorder: view.sorts.length === 0 && !isGrouped,
    onRowDragStart: handleRowDragStart,
    onRowDragEnd: handleRowDragEnd,
    onRowDragOver: handleRowDragOver,
    onRowDrop: handleRowDrop,
    dropTargetId,
  };

  return (
    <div className={cn("flex-1 flex flex-col min-h-0")}>
      {!isGrouped && <ViewPaginationBar pager={pager} />}
      <div className={cn("flex-1 overflow-auto bg-surface-primary outline-none [overflow-anchor:none]")}
        tabIndex={0} onKeyDown={handleKeyDown} onFocus={handleGridFocus} onMouseDown={handleGridMouseDown}
        ref={tableRef}
        role="grid"
        aria-label={`${database.name || 'Database'} table — arrow keys to move, Enter to edit, Escape to exit`}
        aria-activedescendant={focusedCell ? cellDomId(database.id, focusedCell.pageId, focusedCell.propId) : undefined}>
        <div className={cn("inline-block min-w-full")}>
        <table className={cn("min-w-full text-left border-collapse")}>
          <TableHeader
            visibleProps={visibleProps} showRowNumbers={showRowNumbers}
            showVerticalLines={showVerticalLines} getColWidth={getColWidth}
            resizingCol={resizingCol} handleResizeStart={handleResizeStart}
            dragColId={dragColId} setDragColId={setDragColId}
            viewId={view.id} databaseId={database.id}
            searchQuery={searchQuery} setSearchQuery={setSearchQuery}
            filteredVisible={filteredVisible} filteredHidden={filteredHidden}
            onHeaderClick={handleHeaderClick}
            onPropertyCreated={handlePropertyConfig}
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
                {virtual.paddingTop > 0 && (
                  <tr aria-hidden="true"><td colSpan={colCount} style={{ height: virtual.paddingTop }} className={cn("p-0 border-0")} /></tr>
                )}
                {renderPageRows(displayedPages.slice(virtual.firstIndex, virtual.lastIndex + 1), rowProps, virtual.firstIndex, virtual.measureRow, renderAfterRow)}
                {virtual.paddingBottom > 0 && (
                  <tr aria-hidden="true"><td colSpan={colCount} style={{ height: virtual.paddingBottom }} className={cn("p-0 border-0")} /></tr>
                )}
                {pager.hasNext && (
                  <tr>
                    <td colSpan={colCount} className={cn("p-0 border-b border-line")}>
                      <button
                        onClick={pager.goNext}
                        className={cn("w-full text-left px-4 py-2 text-sm text-accent-text-soft hover:text-hover-accent-text-bold hover:bg-hover-surface-accent2 transition-colors flex items-center justify-between")}
                      >
                        <span className={cn("flex items-center gap-2")}><ChevronDown className={cn("w-4 h-4")} />Load more</span>
                        <span className={cn("text-xs text-ink-muted tabular-nums")}>{pager.end} of {pager.total}</span>
                      </button>
                    </td>
                  </tr>
                )}
                <tr>
                  <td colSpan={colCount} className={cn("p-0")}>
                    <button onClick={createRecord}
                      className={cn("w-full text-left px-4 py-2.5 text-sm text-ink-muted hover:text-hover-text hover:bg-hover-surface-accent transition-colors flex items-center gap-2 border-b border-transparent hover:border-hover-border-accent")}>
                      <Plus className={cn("w-4 h-4")} /> New
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
    </div>
  );
}
