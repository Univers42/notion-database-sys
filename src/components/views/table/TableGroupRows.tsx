/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   TableGroupRows.tsx                                 :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:38:48 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/02 01:19:23 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { ChevronRight, MoreHorizontal, Plus } from 'lucide-react';
import { SchemaProperty, Page, PropertyValue } from '../../../types/database';
import type { FillDragState } from './useFillDrag';
import { MemoTableRow } from './MemoTableRow';

interface GroupData {
  groupId: string;
  groupLabel: string;
  groupColor: string;
  pages: Page[];
}

interface RenderPageRowsProps {
  visibleProps: SchemaProperty[];
  focusedCell: { pageId: string; propId: string } | null;
  editingCell: { pageId: string; propId: string } | null;
  fillDrag: FillDragState | null;
  showRowNumbers: boolean;
  showVerticalLines: boolean;
  wrapContent: boolean;
  getColWidth: (propId: string) => number;
  databaseId: string;
  onCellClick: (pageId: string, propId: string, type: string, currentValue: PropertyValue) => void;
  onUpdateProperty: (pageId: string, propId: string, value: PropertyValue) => void;
  onStopEditing: () => void;
  onOpenPage: (pageId: string) => void;
  onFillDragStart: (propId: string, rowIdx: number) => void;
  onFormulaEdit: (propId: string) => void;
  onRowMenu: (pageId: string, x: number, y: number) => void;
  onPropertyConfig: (prop: SchemaProperty, position: { top: number; left: number }) => void;
  tableRef: React.RefObject<HTMLDivElement | null>;
}

export function renderPageRows(
  rowPages: Page[],
  props: RenderPageRowsProps,
  globalOffset = 0,
) {
  const {
    visibleProps, focusedCell, editingCell, fillDrag,
    showRowNumbers, showVerticalLines, wrapContent, getColWidth,
    databaseId, onCellClick, onUpdateProperty, onStopEditing,
    onOpenPage, onFillDragStart, onFormulaEdit, onRowMenu,
    onPropertyConfig, tableRef,
  } = props;

  return rowPages.map((page, i) => {
    const rowIdx = globalOffset + i;
    const isFocusedRow = focusedCell?.pageId === page.id;
    const isEditingRow = editingCell?.pageId === page.id;
    return (
      <MemoTableRow
        key={page.id}
        page={page}
        rowIdx={rowIdx}
        visibleProps={visibleProps}
        focusedPropId={isFocusedRow ? focusedCell!.propId : null}
        editingPropId={isEditingRow ? editingCell!.propId : null}
        fillDrag={fillDrag}
        showRowNumbers={showRowNumbers}
        showVerticalLines={showVerticalLines}
        wrapContent={wrapContent}
        getColWidth={getColWidth}
        databaseId={databaseId}
        onCellClick={onCellClick}
        onUpdateProperty={onUpdateProperty}
        onStopEditing={onStopEditing}
        onOpenPage={onOpenPage}
        onFillDragStart={onFillDragStart}
        onFormulaEdit={onFormulaEdit}
        onRowMenu={onRowMenu}
        onPropertyConfig={onPropertyConfig}
        tableRef={tableRef}
      />
    );
  });
}

interface TableGroupRowsProps extends RenderPageRowsProps {
  groupedData: GroupData[];
  collapsedGroups: Set<string>;
  toggleGroup: (groupId: string) => void;
  colCount: number;
  addPage: (databaseId: string) => void;
}

export function TableGroupRows({
  groupedData, collapsedGroups, toggleGroup, colCount,
  addPage, databaseId, ...rowProps
}: Readonly<TableGroupRowsProps>) {
  return (
    <>
      {groupedData.map((group) => {
        const isCollapsed = collapsedGroups.has(group.groupId);
        const colorParts = group.groupColor.split(' ');
        const bgColor = colorParts[0] || 'bg-surface-muted';
        const textColor = colorParts[1] || 'text-ink-body';

        return (
          <React.Fragment key={group.groupId}>
            {/* ── Group header row ── */}
            <tr className="group/hdr">
              <td colSpan={colCount} className="p-0 border-b border-line bg-surface-secondary-soft2">
                <div className="flex items-center gap-2 px-3 py-2 select-none">
                  <button
                    onClick={() => toggleGroup(group.groupId)}
                    className="p-0.5 hover:bg-hover-surface3 rounded transition-colors shrink-0"
                  >
                    <ChevronRight className={`w-3.5 h-3.5 text-ink-secondary transition-transform duration-150 ${isCollapsed ? '' : 'rotate-90'}`} />
                  </button>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${bgColor} ${textColor}`}>
                    {group.groupLabel}
                  </span>
                  <span className="text-xs text-ink-muted tabular-nums">{group.pages.length}</span>
                  <div className="ml-auto flex items-center gap-1 opacity-0 group-hover/hdr:opacity-100 transition-opacity">
                    <button
                      onClick={() => addPage(databaseId)}
                      className="p-1 hover:bg-hover-surface3 rounded text-ink-muted hover:text-hover-text transition-colors"
                      title="Add page to group"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      className="p-1 hover:bg-hover-surface3 rounded text-ink-muted hover:text-hover-text transition-colors"
                      title="Group options"
                    >
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </td>
            </tr>

            {/* ── Group content rows ── */}
            {!isCollapsed && renderPageRows(group.pages, { ...rowProps, databaseId })}

            {/* Empty group placeholder */}
            {!isCollapsed && group.pages.length === 0 && (
              <tr>
                <td colSpan={colCount} className="px-8 py-3 text-sm text-ink-muted border-b border-line bg-surface-secondary-soft5">
                  No pages
                </td>
              </tr>
            )}

            {/* + New in group */}
            {!isCollapsed && (
              <tr>
                <td colSpan={colCount} className="p-0 border-b border-line-light">
                  <button onClick={() => addPage(databaseId)}
                    className="w-full text-left px-8 py-1.5 text-xs text-ink-muted hover:text-hover-text hover:bg-hover-surface-accent3 transition-colors flex items-center gap-1.5">
                    <Plus className="w-3 h-3" /> New
                  </button>
                </td>
              </tr>
            )}
          </React.Fragment>
        );
      })}

      {/* Global footer */}
      <tr>
        <td colSpan={colCount} className="p-0">
          <button onClick={() => addPage(databaseId)}
            className="w-full text-left px-4 py-2.5 text-sm text-ink-muted hover:text-hover-text hover:bg-hover-surface-accent transition-colors flex items-center gap-2 border-b border-transparent hover:border-hover-border-accent">
            <Plus className="w-4 h-4" /> New
          </button>
        </td>
      </tr>
    </>
  );
}
