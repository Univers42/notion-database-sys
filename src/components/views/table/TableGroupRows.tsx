/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   TableGroupRows.tsx                                 :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:38:48 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 21:01:06 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { ChevronRight, Plus } from 'lucide-react';
import { TableLoadMoreRow } from './TableLoadMoreRow';
import type { SchemaProperty, Page, PropertyValue } from '../../../types/database';
import type { FillDragState } from './useFillDrag';
import { MemoTableRow } from './MemoTableRow';
import type { GroupRowItem } from './groupRowsLayout';
import type { EditingCell } from './gridKeyboard';
import { cn } from '../../../utils/cn';
import { getDotColor } from '../../../utils/color';

interface RenderPageRowsProps {
  visibleProps: SchemaProperty[];
  focusedCell: { pageId: string; propId: string } | null;
  editingCell: EditingCell | null;
  fillDrag: FillDragState | null;
  /** A multi-cell selection: its rows and column span, or null. */
  selection: { rowIds: ReadonlySet<string>; colStart: number; colEnd: number } | null;
  showRowNumbers: boolean;
  showVerticalLines: boolean;
  wrapContent: boolean;
  getColWidth: (propId: string) => number;
  databaseId: string;
  onCellClick: (pageId: string, propId: string, type: string, currentValue: PropertyValue, shiftKey?: boolean) => void;
  onCellDoubleClick: (pageId: string, propId: string, type: string) => void;
  onCellMouseDown: (pageId: string, propId: string, shiftKey: boolean) => void;
  onCellMouseEnter: (pageId: string, propId: string) => void;
  onUpdateProperty: (pageId: string, propId: string, value: PropertyValue) => void;
  onStopEditing: () => void;
  onOpenPage: (pageId: string) => void;
  onFillDragStart: (propId: string, rowIdx: number) => void;
  onFormulaEdit: (propId: string) => void;
  onRowMenu: (pageId: string, x: number, y: number) => void;
  onPropertyConfig: (prop: SchemaProperty, position: { top: number; left: number }) => void;
  tableRef: React.RefObject<HTMLDivElement | null>;
  /** Conditional-color row tint (first matching rule), if any rules exist. */
  rowTint?: (page: Page) => string | null;
  /** Row drag-reorder (manual order) — off under user sorts / grouping. */
  canReorder?: boolean;
  onRowDragStart?: (pageId: string) => void;
  onRowDragEnd?: () => void;
  onRowDragOver?: (pageId: string) => void;
  onRowDrop?: (pageId: string) => void;
  dropTargetId?: string | null;
}

function fillRange(fillDrag: FillDragState | null): [number, number] {
  return fillDrag
    ? [Math.min(fillDrag.sourceRowIdx, fillDrag.currentRowIdx), Math.max(fillDrag.sourceRowIdx, fillDrag.currentRowIdx)]
    : [0, -1];
}

/** One MemoTableRow. The drag-state object's identity changes per mousemove;
 *  passing it to every row broke React.memo for ALL windowed rows on each
 *  pointer move, so rows receive the range test's stable scalars instead. */
function renderPageRow(
  page: Page, rowIdx: number, props: RenderPageRowsProps, [fillMin, fillMax]: [number, number],
  measure: { ref?: (el: HTMLTableRowElement | null) => void; index?: number },
) {
  const { focusedCell, editingCell, fillDrag, selection } = props;
  const inFillRange = fillDrag !== null
    && rowIdx >= fillMin && rowIdx <= fillMax && rowIdx !== fillDrag.sourceRowIdx;
  const inSelection = selection?.rowIds.has(page.id) ?? false;
  return (
    <MemoTableRow
      key={page.id}
      page={page}
      rowIdx={rowIdx}
      visibleProps={props.visibleProps}
      focusedPropId={focusedCell?.pageId === page.id ? focusedCell.propId : null}
      editingPropId={editingCell?.pageId === page.id ? editingCell.propId : null}
      editSeed={editingCell?.pageId === page.id ? editingCell.seed : undefined}
      fillDragActive={fillDrag !== null}
      fillRangePropId={inFillRange && fillDrag ? fillDrag.sourcePropId : null}
      selectedColStart={inSelection && selection ? selection.colStart : -1}
      selectedColEnd={inSelection && selection ? selection.colEnd : -1}
      showRowNumbers={props.showRowNumbers}
      showVerticalLines={props.showVerticalLines}
      wrapContent={props.wrapContent}
      getColWidth={props.getColWidth}
      databaseId={props.databaseId}
      onCellClick={props.onCellClick}
      onCellDoubleClick={props.onCellDoubleClick}
      onCellMouseDown={props.onCellMouseDown}
      onCellMouseEnter={props.onCellMouseEnter}
      onUpdateProperty={props.onUpdateProperty}
      onStopEditing={props.onStopEditing}
      onOpenPage={props.onOpenPage}
      onFillDragStart={props.onFillDragStart}
      onFormulaEdit={props.onFormulaEdit}
      onRowMenu={props.onRowMenu}
      onPropertyConfig={props.onPropertyConfig}
      tableRef={props.tableRef}
      tint={props.rowTint?.(page) ?? null}
      measureRef={measure.ref}
      virtualIndex={measure.index}
      canReorder={props.canReorder}
      onRowDragStart={props.onRowDragStart}
      onRowDragEnd={props.onRowDragEnd}
      onRowDragOver={props.onRowDragOver}
      onRowDrop={props.onRowDrop}
      isDropTarget={props.dropTargetId === page.id}
    />
  );
}

/** Renders an array of pages as MemoTableRow components with proper row indexing.
 *  `renderAfterRow` (ungrouped sub-items only) interleaves host content (an
 *  expanded row's child notes) after a row.
 *  ponytail: the expansion <tr> is out-of-band for the row virtualizer (no
 *  data-index) — fine for a transient, user-toggled expansion; flatten into the
 *  virtual count if multi-row expansion ever needs exact scroll height. */
export function renderPageRows(
  rowPages: Page[],
  props: RenderPageRowsProps,
  globalOffset = 0,
  measureRow?: (el: HTMLTableRowElement | null) => void,
  renderAfterRow?: (page: Page) => React.ReactNode,
) {
  const range = fillRange(props.fillDrag);
  return rowPages.map((page, i) => {
    const row = renderPageRow(page, globalOffset + i, props, range, { ref: measureRow });
    const after = renderAfterRow?.(page);
    return after ? <React.Fragment key={page.id}>{row}{after}</React.Fragment> : row;
  });
}

interface TableGroupRowsProps extends RenderPageRowsProps {
  /** The windowed slice of the flattened grouped body. */
  items: readonly GroupRowItem[];
  /** Index of `items[0]` in the full layout (the virtualizer's index). */
  firstIndex: number;
  measureRow?: (el: HTMLTableRowElement | null) => void;
  colCount: number;
  /** The per-group cap one "Load more" reveals. */
  pageSize: number;
  onToggleGroup: (groupId: string) => void;
  /** Absent → the records are read-only: no add controls. */
  onAddToGroup?: (groupId: string) => void;
  onShowMore: (groupId: string, rows: number) => void;
}

/** Renders a window of grouped table rows: headers, rows, per-group footers. */
export function TableGroupRows({
  items, firstIndex, measureRow, colCount, pageSize,
  onToggleGroup, onAddToGroup, onShowMore, ...rowProps
}: Readonly<TableGroupRowsProps>) {
  const range = fillRange(rowProps.fillDrag);
  return (
    <>
      {items.map((item, i) => {
        const index = firstIndex + i;
        const { group } = item;
        const key = `${item.kind}:${group.groupId}`;
        switch (item.kind) {
          case 'row':
            return renderPageRow(item.page, item.rowIdx, rowProps, range, { ref: measureRow, index });
          case 'header':
            return <GroupHeaderRow key={key} index={index} measureRow={measureRow} colCount={colCount}
              label={group.groupLabel} color={group.groupColor} count={group.pages.length} collapsed={item.collapsed}
              onToggle={() => onToggleGroup(group.groupId)} onAdd={onAddToGroup && (() => onAddToGroup(group.groupId))} />;
          case 'more':
            return <TableLoadMoreRow key={key} index={index} measureRow={measureRow} colCount={colCount}
              shown={item.shown} total={group.pages.length} indented
              onLoadMore={() => onShowMore(group.groupId, pageSize)} onShowAll={() => onShowMore(group.groupId, Infinity)} />;
          case 'empty':
            return (
              <tr key={key} ref={measureRow} data-index={index}>
                <td colSpan={colCount} className={cn("px-8 py-3 text-sm text-ink-muted border-b border-line bg-surface-secondary-soft5")}>
                  No pages
                </td>
              </tr>
            );
          case 'new':
            return onAddToGroup && (
              <tr key={key} ref={measureRow} data-index={index}>
                <td colSpan={colCount} className={cn("p-0 border-b border-line-light")}>
                  <button type="button" onClick={() => onAddToGroup(group.groupId)}
                    aria-label={`New page in ${group.groupLabel}`}
                    className={cn("w-full text-left px-8 py-1.5 text-xs text-ink-muted hover:text-hover-text hover:bg-hover-surface-accent3 transition-colors flex items-center gap-1.5")}>
                    <Plus className={cn("w-3 h-3")} /> New
                  </button>
                </td>
              </tr>
            );
        }
      })}
    </>
  );
}

interface GroupHeaderRowProps {
  index: number;
  measureRow?: (el: HTMLTableRowElement | null) => void;
  colCount: number;
  label: string;
  color: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
  onAdd?: () => void;
}

function GroupHeaderRow({ index, measureRow, colCount, label, color, count, collapsed, onToggle, onAdd }: Readonly<GroupHeaderRowProps>) {
  return (
    <tr ref={measureRow} data-index={index} className={cn("group/hdr")}>
      <td colSpan={colCount} className={cn("p-0 border-b border-line bg-surface-secondary-soft2")}>
        <div className={cn("flex items-center gap-2 px-3 py-2 select-none")}>
          <button type="button" onClick={onToggle}
            aria-label={`${collapsed ? 'Expand' : 'Collapse'} group ${label}`}
            aria-expanded={!collapsed}
            className={cn("p-0.5 hover:bg-hover-surface3 rounded transition-colors shrink-0")}>
            <ChevronRight className={cn(`w-3.5 h-3.5 text-ink-secondary transition-transform duration-150 ${collapsed ? '' : 'rotate-90'}`)} />
          </button>
          {/* Same identity as a board lane: the option colour as a dot, the
              label as plain text, so the header doesn't read as one more cell chip. */}
          <span className={cn(`w-2 h-2 rounded-full shrink-0 ${getDotColor(color)}`)} aria-hidden="true" />
          <span className={cn("text-[13px] font-semibold text-ink truncate")}>{label}</span>
          <span className={cn("text-xs text-ink-muted tabular-nums")}>{count}</span>
          {onAdd && <button type="button" onClick={onAdd} aria-label={`Add page to ${label}`} title="Add page to group"
            className={cn("ml-auto p-1 hover:bg-hover-surface3 rounded text-ink-muted hover:text-hover-text transition-colors opacity-0 group-hover/hdr:opacity-100 focus-visible:opacity-100")}>
            <Plus className={cn("w-3.5 h-3.5")} />
          </button>}
        </div>
      </td>
    </tr>
  );
}
