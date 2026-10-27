/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   TableView.tsx                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/02 14:38:28 by dlesieur          #+#    #+#             */
/*   Updated: 2026/10/26 15:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { PropertyConfigPanel } from '../../PropertyConfigPanel';
import { FormulaEditorPanel } from '../../FormulaEditorPanel';
import { TableHeader } from './TableHeader';
import { TableGroupRows, renderPageRows } from './TableGroupRows';
import { TableRowContextMenu } from './TableRowContextMenu';
import { ViewPaginationBar } from '../shared/ViewPaginationBar';
import { Plus } from 'lucide-react';
import { TableLoadMoreRow } from './TableLoadMoreRow';
import { TableCalculationRow } from './TableCalculationRow';
import { cn } from '../../../utils/cn';
import { useTableViewState } from './useTableViewState';
import { useDefaultTemplateCreate } from '../useDefaultTemplateCreate';
import { useSubItems } from './subItemsContext';
import { SubItemRows } from './SubItemRows';
import { colorForPage } from '../../../lib/conditionalColor';
import type { Page } from '../../../types/database';
import { useStoreApi } from '../../../store/dbms/hardcoded/useDatabaseStore';
import { buildManualRowOrder } from '../../../lib/manualRowOrder';
import { cellDomId, GRID_KEY_SHORTCUTS } from './gridKeyboard';
import { groupPresetValue } from '../../../store/slices/storeHelpers';
import { resolvePageSize } from '../../../hooks/useViewPager';
import type { PropertyValue } from '../../../types/database';

/** Renders the full table view with header, rows, grouping, pagination, and cell editing. */
export function TableView() {
  const {
    view, database,
    focusedCell, editingCell, selection, clipboard,
    searchQuery, setSearchQuery,
    dragColId, setDragColId,
    configPanel, setConfigPanel,
    formulaEditor, setFormulaEditor,
    tableRef, fillDrag, startFillDrag,
    resizingCol, handleResizeStart, getColWidth,
    visibleProps, filteredVisible, filteredHidden,
    rowMenu, setRowMenu,
    pages, displayedPages, pager,
    handleCellClick, handleCellDoubleClick, handleCellMouseDown, handleCellMouseEnter,
    handleUpdateProperty, handleStopEditing, handleOpenPage, handleFormulaEdit, handleRowMenu, handlePropertyConfig,
    handleHeaderClick, toggleGroup, handleKeyDown, handleGridFocus, handleGridMouseDown,
    addPage, openPage, deletePage, duplicatePage,
    showVerticalLines, wrapContent, showRowNumbers,
    colCount, isGrouped, groupLayout, showMoreInGroup, canCreate,
    virtual,
  } = useTableViewState();

  const subItems = useSubItems();
  const createRecord = useDefaultTemplateCreate(() => { if (database) addPage(database.id); });

  // Row drag-reorder (grip on row hover, see MemoTableRow): drop writes manualRowOrder
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

  const groupProperty = view.grouping ? database.properties[view.grouping.propertyId] : undefined;
  const addToGroup = (groupId: string) => {
    const preset = groupProperty ? groupPresetValue(groupProperty, groupId) : undefined;
    addPage(database.id, preset && groupProperty ? { [groupProperty.id]: preset.value as PropertyValue } : {});
  };

  const renderAfterRow = subItems
    ? (page: Page): React.ReactNode =>
        subItems.isExpanded(page.id) ? (
          <SubItemRows
            recordId={page.id}
            visibleProps={visibleProps}
            getColWidth={getColWidth}
            titlePropId={database.titlePropertyId}
            colCount={colCount}
            hasGutter={showRowNumbers}
          />
        ) : null
    : undefined;

  const colorRules = view.settings?.conditionalColors;
  const rowProps = {
    visibleProps, focusedCell, editingCell, fillDrag, selection,
    showRowNumbers, showVerticalLines, wrapContent, getColWidth,
    databaseId: database.id, onCellClick: handleCellClick, onCellDoubleClick: handleCellDoubleClick,
    onCellMouseDown: handleCellMouseDown, onCellMouseEnter: handleCellMouseEnter,
    onUpdateProperty: handleUpdateProperty, onStopEditing: handleStopEditing,
    onOpenPage: handleOpenPage, onFillDragStart: startFillDrag,
    onFormulaEdit: handleFormulaEdit, onRowMenu: handleRowMenu,
    onPropertyConfig: handlePropertyConfig, tableRef,
    rowTint: colorRules?.length
      ? (page: Page) => colorForPage(page, colorRules, database.properties, storeApi.getState().getCellValue)?.tint ?? null
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
      {/* isolate: the sticky header (z-30), calculation bar (z-20) and selected
          cells (z-10) are layered against each other only. Without it they
          outranked page menus and the outline rail laid over the table. The
          box already clips its content, so nothing inside can lose by it. */}
      <div className={cn("isolate flex-1 overflow-auto bg-surface-primary outline-none [overflow-anchor:none]")}
        tabIndex={0} onKeyDown={handleKeyDown} onFocus={handleGridFocus} onMouseDown={handleGridMouseDown}
        onKeyDownCapture={clipboard.onKeyDownCapture}
        onCopy={clipboard.onCopy} onCut={clipboard.onCut} onPaste={clipboard.onPaste}
        ref={tableRef}
        role="grid"
        aria-multiselectable="true"
        aria-keyshortcuts={GRID_KEY_SHORTCUTS}
        aria-label={`${database.name || 'Database'} table — arrows or Tab to move, type or Enter to edit, Ctrl+Enter to open, Shift+F10 for row menu, Escape to exit`}
        aria-activedescendant={focusedCell ? cellDomId(database.id, focusedCell.pageId, focusedCell.propId) : undefined}>
        {/* Its copy/cut/paste events bubble to the grid's handlers above. */}
        <textarea ref={clipboard.sinkRef} aria-hidden tabIndex={-1} value="" onChange={() => {}}
          className={cn("fixed top-0 left-0 w-px h-px opacity-0 pointer-events-none resize-none")} />
        <div className={cn("inline-block min-w-full")}>
        {/* Separate borders: collapsed ones are painted by the table as a whole,
            so each row the virtualizer swaps in repainted every visible row
            (12.9k → 3.2k paint ops over 25 scroll frames, measured). Row-level
            borders do not render in this model — they live on the cells. */}
        <table className={cn("min-w-full text-left border-separate border-spacing-0")}>
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
            {virtual.paddingTop > 0 && (
              <tr aria-hidden="true"><td colSpan={colCount} style={{ height: virtual.paddingTop }} className={cn("p-0 border-0")} /></tr>
            )}
            {groupLayout ? (
              <TableGroupRows
                items={groupLayout.items.slice(virtual.firstIndex, virtual.lastIndex + 1)}
                firstIndex={virtual.firstIndex} measureRow={virtual.measureRow}
                colCount={colCount} pageSize={resolvePageSize(view.settings?.loadLimit)}
                onToggleGroup={toggleGroup} onAddToGroup={canCreate ? addToGroup : undefined} onShowMore={showMoreInGroup}
                {...rowProps}
              />
            ) : (
              renderPageRows(displayedPages.slice(virtual.firstIndex, virtual.lastIndex + 1), rowProps, virtual.firstIndex, virtual.measureRow, renderAfterRow)
            )}
            {virtual.paddingBottom > 0 && (
              <tr aria-hidden="true"><td colSpan={colCount} style={{ height: virtual.paddingBottom }} className={cn("p-0 border-0")} /></tr>
            )}
            {!isGrouped && pager.hasNext && (
              <TableLoadMoreRow colCount={colCount} shown={pager.end} total={pager.total}
                onLoadMore={pager.loadMore} onShowAll={pager.showAll} />
            )}
            {canCreate && <tr>
              <td colSpan={colCount} className={cn("p-0")}>
                <button onClick={createRecord}
                  className={cn("w-full text-left px-4 py-2.5 text-sm text-ink-muted hover:text-hover-text hover:bg-hover-surface-accent transition-colors flex items-center gap-2 border-b border-transparent hover:border-hover-border-accent")}>
                  <Plus className={cn("w-4 h-4")} /> New
                </button>
              </td>
            </tr>}
          </tbody>
          <TableCalculationRow viewId={view.id} pages={pages} visibleProps={visibleProps}
            calculations={view.settings?.columnCalculations} getColWidth={getColWidth}
            showVerticalLines={showVerticalLines} showRowNumbers={showRowNumbers} />
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
          openPage={openPage} duplicatePage={duplicatePage} deletePage={deletePage} returnFocusRef={tableRef} />
      )}
      </div>
    </div>
  );
}
