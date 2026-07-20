/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   MemoTableRow.tsx                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:37:50 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 16:30:13 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { SchemaProperty, Page, PropertyValue } from '../../../types/database';
import { CURSORS } from '../../ui/cursors';
import { ChevronRight, MoreHorizontal } from 'lucide-react';
import { renderCellContent, CellRendererProps } from './CellRenderer';
import { colWidthVar } from './useColumnResize';
import { useStoreApi } from '../../../store/dbms/hardcoded/useDatabaseStore';
import { useSubItems } from './subItemsContext';
import { GripHandleIcon } from '../../ui/Icons';
import { cn } from '../../../utils/cn';
import { cellDomId } from './gridKeyboard';

/** Props for the memoized table row component. */
export interface MemoTableRowProps {
  page: Page;
  rowIdx: number;
  visibleProps: SchemaProperty[];
  focusedPropId: string | null;
  editingPropId: string | null;
  /** ANY fill drag is in progress — drives the crosshair cursor. Changes only
   *  at drag start/end, never per mousemove. */
  fillDragActive: boolean;
  /** The dragged column's prop id when THIS row is inside the fill range, else
   *  null. Scalar (not the drag-state object, whose identity changes per
   *  mousemove) so React.memo holds for the rows the drag doesn't touch. */
  fillRangePropId: string | null;
  showRowNumbers: boolean;
  showVerticalLines: boolean;
  wrapContent: boolean;
  getColWidth: (propId: string) => number;
  databaseId: string;
  onCellClick: (pageId: string, propId: string, type: string, currentValue: PropertyValue) => void;
  onCellDoubleClick: (pageId: string, propId: string, type: string) => void;
  onUpdateProperty: (pageId: string, propId: string, value: PropertyValue) => void;
  onStopEditing: () => void;
  onOpenPage: (pageId: string) => void;
  onFillDragStart: (propId: string, rowIdx: number) => void;
  onFormulaEdit: (propId: string) => void;
  onRowMenu: (pageId: string, x: number, y: number) => void;
  onPropertyConfig: (prop: SchemaProperty, position: { top: number; left: number }) => void;
  tableRef: React.RefObject<HTMLDivElement | null>;
  /** Conditional-color background (translucent token tint), if matched. */
  tint?: string | null;
  /** Virtualizer row-measure ref (windowed body) — attaches to the <tr>. */
  measureRef?: (el: HTMLTableRowElement | null) => void;
  /** Row drag-reorder (manual order): off under user sorts / grouping. */
  canReorder?: boolean;
  onRowDragStart?: (pageId: string) => void;
  onRowDragEnd?: () => void;
  onRowDragOver?: (pageId: string) => void;
  onRowDrop?: (pageId: string) => void;
  /** This row is the current drop target — paints the insertion edge. */
  isDropTarget?: boolean;
}

/** Computes cell focus ring classes. */
function focusRingClass(isFocused: boolean, inFillRange: boolean): string {
  if (isFocused) return 'ring-2 ring-ring-success ring-inset bg-emerald-surface z-10 shadow-[inset_0_0_0_1px_var(--color-inset-success)]';
  if (inFillRange) return 'ring-1 ring-ring-success-soft ring-inset bg-emerald-surface2 z-[5]';
  return '';
}

/** Memoized table row that only re-renders when its own data changes. */
export const MemoTableRow = React.memo(function MemoTableRow(props: MemoTableRowProps) {
  const {
    page, rowIdx, visibleProps, focusedPropId, editingPropId,
    fillDragActive, fillRangePropId, showRowNumbers, showVerticalLines, wrapContent,
    getColWidth, databaseId, onCellClick, onCellDoubleClick, onUpdateProperty, onStopEditing,
    onOpenPage, onFillDragStart, onFormulaEdit, onRowMenu, onPropertyConfig, tableRef,
  } = props;

  const storeApi = useStoreApi();
  const subItems = useSubItems();
  const expanded = subItems?.isExpanded(page.id) ?? false;
  const cellBorder = showVerticalLines ? 'border-r border-line' : '';

  return (
    <tr ref={props.measureRef} data-row-idx={rowIdx} data-index={rowIdx} data-page-id={page.id}
      role="row"
      className={cn(`group transition-colors duration-100 hover:bg-hover-surface-soft ${props.isDropTarget ? 'shadow-[inset_0_2px_0_0_var(--color-accent)]' : ''}`)}
      style={props.tint ? { backgroundColor: props.tint } : undefined}
      onDragOver={props.canReorder ? e => { e.preventDefault(); props.onRowDragOver?.(page.id); } : undefined}
      onDrop={props.canReorder ? e => { e.preventDefault(); props.onRowDrop?.(page.id); } : undefined}>
      {/* Leading control gutter — ALWAYS rendered (uniform w-10 so the cluster
          never clips): drag grip + sub-item expand on row hover; the row number
          only when enabled. Open-as-page lives on the title cell (OPEN pill)
          and in the row-options menu — not here. */}
      <td className={cn("w-10 px-1 py-1.5 border-r border-b border-line text-center align-middle relative")}>
        {showRowNumbers && (
          <span className={cn("text-xs text-ink-muted tabular-nums group-hover:opacity-0")}>{rowIdx + 1}</span>
        )}
        <div className={cn("absolute inset-0 flex items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100")}>
          {props.canReorder && (
            <button type="button" aria-label="Drag to reorder record" title="Drag to reorder"
              draggable
              className={cn("shrink-0 p-0.5 rounded text-ink-muted hover:text-hover-text hover:bg-hover-surface2 cursor-grab active:cursor-grabbing")}
              onDragStart={e => { e.stopPropagation(); e.dataTransfer.effectAllowed = 'move'; props.onRowDragStart?.(page.id); }}
              onDragEnd={e => { e.stopPropagation(); props.onRowDragEnd?.(); }}>
              <GripHandleIcon className={cn("w-[10px] h-[14px]")} />
            </button>
          )}
          {subItems && (
            <button type="button" aria-label={expanded ? "Collapse sub-items" : "Expand sub-items"}
              className={cn("shrink-0 p-0.5 rounded text-ink-muted hover:text-hover-text hover:bg-hover-surface2")}
              onClick={e => { e.stopPropagation(); subItems.toggle(page.id); }}>
              <ChevronRight className={cn(`w-3 h-3 transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`)} />
            </button>
          )}
        </div>
      </td>

      {visibleProps.map(prop => {
        const value = page.properties[prop.id];
        const isFocused = focusedPropId === prop.id;
        const isEditing = editingPropId === prop.id;
        const inFill = fillRangePropId === prop.id;
        const ring = focusRingClass(isFocused, inFill);

        const cellProps: CellRendererProps = {
          prop, page, value, isEditing, wrapContent, databaseId,
          onUpdate: onUpdateProperty, onStopEditing, onOpenPage,
          onFormulaEdit, onPropertyConfig, tableRef, storeApi,
        };

        let cellCursor: string | undefined;
        if (fillDragActive) cellCursor = CURSORS.crosshair;
        else if (isEditing) cellCursor = undefined;
        else cellCursor = CURSORS.cell;

        // var() first so a column-resize drag can move every cell per frame by
        // writing ONE CSS custom property on the table element (no store write,
        // no re-render); the store-backed width is the resting fallback.
        const width = `var(${colWidthVar(prop.id)}, ${getColWidth(prop.id)}px)`;
        return (
          <td key={prop.id}
            id={cellDomId(databaseId, page.id, prop.id)}
            role="gridcell"
            aria-selected={isFocused}
            className={cn(`px-3 py-1.5 ${cellBorder} border-b border-line ${isFocused ? 'overflow-visible' : 'overflow-hidden'} ${wrapContent ? 'align-top' : 'align-middle'} relative ${ring}`)}
            style={{
              width, minWidth: width, maxWidth: width,
              cursor: cellCursor,
            }}
            onClick={() => onCellClick(page.id, prop.id, prop.type, value)}
            onDoubleClick={() => onCellDoubleClick(page.id, prop.id, prop.type)}>
            {renderCellContent(cellProps)}
            {isFocused && !isEditing && (
              <button type="button" className={cn("absolute w-[7px] h-[7px] bg-emerald border border-surface-primary rounded-[1px] z-20 p-0 appearance-none outline-none")}
                style={{ bottom: -3, right: -3, cursor: CURSORS.crosshair }}
                tabIndex={-1}
                aria-label="Fill handle"
                onMouseDown={e => { e.stopPropagation(); e.preventDefault(); onFillDragStart(prop.id, rowIdx); }} />
            )}
          </td>
        );
      })}

      <td className={cn("border-b border-line px-1")}>
        <button aria-label="Row options" className={cn("p-1 min-h-[24px] min-w-[24px] text-ink-muted hover:text-hover-text opacity-0 group-hover:opacity-100 rounded hover:bg-hover-surface2")}
          onClick={e => { const r = e.currentTarget.getBoundingClientRect(); onRowMenu(page.id, r.left, r.bottom); }}>
          <MoreHorizontal className={cn("w-3.5 h-3.5")} />
        </button>
      </td>
      <td className={cn("border-b border-line")} />
    </tr>
  );
});
