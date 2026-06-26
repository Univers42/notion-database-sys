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
import { ChevronDown, Plus } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { useTableViewState } from './useTableViewState';
import { useDefaultTemplateCreate } from '../useDefaultTemplateCreate';
import { useSubItems } from './subItemsContext';
import { SubItemRows } from './SubItemRows';
import { colorForPage } from '../../../lib/conditionalColor';
import type { Page } from '../../../types/database';

/** Renders the full table view with header, rows, grouping, pagination, and cell editing. */
export function TableView() {
  const {
    view, database,
    focusedCell, editingCell,
    searchQuery, setSearchQuery,
    dragColId, setDragColId,
    configPanel, setConfigPanel,
    setVisibleCount,
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
    virtual,
  } = useTableViewState();

  const subItems = useSubItems();
  const createRecord = useDefaultTemplateCreate(() => { if (database) addPage(database.id); });

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
    databaseId: database.id, onCellClick: handleCellClick,
    onUpdateProperty: handleUpdateProperty, onStopEditing: handleStopEditing,
    onOpenPage: handleOpenPage, onFillDragStart: startFillDrag,
    onFormulaEdit: handleFormulaEdit, onRowMenu: handleRowMenu,
    onPropertyConfig: handlePropertyConfig, tableRef,
    rowTint: colorRules?.length
      ? (page: Page) => colorForPage(page, colorRules, database.properties)?.tint ?? null
      : undefined,
  };

  return (
    <div className={cn("flex-1 overflow-auto bg-surface-primary outline-none")} tabIndex={0} onKeyDown={handleKeyDown} ref={tableRef}>
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
                {hasMore && (
                  <tr>
                    <td colSpan={colCount} className={cn("p-0 border-b border-line")}>
                      <button
                        onClick={() => setVisibleCount(Math.min(currentLimit + loadLimit, pages.length))}
                        className={cn("w-full text-left px-4 py-2 text-sm text-accent-text-soft hover:text-hover-accent-text-bold hover:bg-hover-surface-accent2 transition-colors flex items-center justify-between")}
                      >
                        <span className={cn("flex items-center gap-2")}><ChevronDown className={cn("w-4 h-4")} />Load more</span>
                        <span className={cn("text-xs text-ink-muted tabular-nums")}>{currentLimit} of {pages.length}</span>
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
  );
}
