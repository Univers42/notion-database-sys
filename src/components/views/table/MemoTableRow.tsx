/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   MemoTableRow.tsx                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:37:50 by dlesieur          #+#    #+#             */
/*   Updated: 2026/10/26 15:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { SchemaProperty, Page, PropertyValue } from '../../../types/database';
import { CURSORS } from '../../ui/cursors';
import { ChevronRight, MoreHorizontal } from 'lucide-react';
import { renderCellContent, CellRendererProps } from './CellRenderer';
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
  /** Typed character that started the edit (type-to-edit); replaces the text. */
  editSeed?: string;
  /** ANY fill drag is in progress — drives the crosshair cursor. Changes only
   *  at drag start/end, never per mousemove. */
  fillDragActive: boolean;
  /** The dragged column's prop id when THIS row is inside the fill range, else
   *  null. Scalar (not the drag-state object, whose identity changes per
   *  mousemove) so React.memo holds for the rows the drag doesn't touch. */
  fillRangePropId: string | null;
  /** Column span of a multi-cell selection when THIS row is in it, else -1/-1.
   *  Scalars, so rows outside the selection keep their memo. */
  selectedColStart: number;
  selectedColEnd: number;
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
  /** Conditional-color background (translucent token tint), if matched. */
  tint?: string | null;
  /** Virtualizer row-measure ref (windowed body) — attaches to the <tr>. */
  measureRef?: (el: HTMLTableRowElement | null) => void;
  /** The row's index in the virtualizer when it differs from `rowIdx`
   *  (grouped bodies interleave header and footer rows). */
  virtualIndex?: number;
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

interface RowControlsProps {
  pageId: string;
  canReorder?: boolean;
  subItems: ReturnType<typeof useSubItems>;
  expanded: boolean;
  /** Overlay the first cell (no gutter column) instead of filling the gutter. */
  floating: boolean;
  onRowDragStart?: (pageId: string) => void;
  onRowDragEnd?: () => void;
}

/** Drag grip + sub-item expand, revealed on row hover. */
function RowControls({ pageId, canReorder, subItems, expanded, floating, onRowDragStart, onRowDragEnd }: Readonly<RowControlsProps>) {
  if (!canReorder && !subItems) return null;
  const place = floating
    ? 'absolute left-0.5 top-1/2 -translate-y-1/2 z-10 rounded bg-surface-primary shadow-sm'
    : 'absolute inset-0 justify-center';
  return (
    // Its own mousedown must not start a cell selection under it.
    <div className={cn(`${place} flex items-center gap-0.5 opacity-0 group-hover:opacity-100`)}
      onMouseDown={e => e.stopPropagation()}>
      {canReorder && (
        <button type="button" aria-label="Drag to reorder record" title="Drag to reorder"
          draggable tabIndex={-1}
          className={cn("shrink-0 p-0.5 rounded text-ink-muted hover:text-hover-text hover:bg-hover-surface2 cursor-grab active:cursor-grabbing")}
          onDragStart={e => { e.stopPropagation(); e.dataTransfer.effectAllowed = 'move'; onRowDragStart?.(pageId); }}
          onDragEnd={e => { e.stopPropagation(); onRowDragEnd?.(); }}>
          <GripHandleIcon className={cn("w-[10px] h-[14px]")} />
        </button>
      )}
      {subItems && (
        <button type="button" aria-label={expanded ? "Collapse sub-items" : "Expand sub-items"}
          className={cn("shrink-0 p-0.5 rounded text-ink-muted hover:text-hover-text hover:bg-hover-surface2")}
          onClick={e => { e.stopPropagation(); subItems.toggle(pageId); }}>
          <ChevronRight className={cn(`w-3 h-3 transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`)} />
        </button>
      )}
    </div>
  );
}

/** Memoized table row that only re-renders when its own data changes. */
export const MemoTableRow = React.memo(function MemoTableRow(props: MemoTableRowProps) {
  const {
    page, rowIdx, visibleProps, focusedPropId, editingPropId, editSeed,
    fillDragActive, fillRangePropId, selectedColStart, selectedColEnd, showRowNumbers, showVerticalLines, wrapContent,
    getColWidth, databaseId, onCellClick, onCellDoubleClick, onCellMouseDown, onCellMouseEnter, onUpdateProperty, onStopEditing,
    onOpenPage, onFillDragStart, onFormulaEdit, onRowMenu, onPropertyConfig, tableRef,
  } = props;

  const storeApi = useStoreApi();
  const subItems = useSubItems();
  const expanded = subItems?.isExpanded(page.id) ?? false;
  const cellBorder = showVerticalLines ? 'border-r border-line' : '';
  const controls = (
    <RowControls pageId={page.id} canReorder={props.canReorder} subItems={subItems} expanded={expanded}
      floating={!showRowNumbers} onRowDragStart={props.onRowDragStart} onRowDragEnd={props.onRowDragEnd} />
  );

  return (
    <tr ref={props.measureRef} data-row-idx={rowIdx} data-index={props.virtualIndex ?? rowIdx} data-page-id={page.id}
      role="row"
      className={cn(`group transition-colors duration-100 hover:bg-hover-surface-soft ${props.isDropTarget ? 'shadow-[inset_0_2px_0_0_var(--color-accent)]' : ''}`)}
      style={props.tint ? { backgroundColor: props.tint } : undefined}
      onDragOver={props.canReorder ? e => { e.preventDefault(); props.onRowDragOver?.(page.id); } : undefined}
      onDrop={props.canReorder ? e => { e.preventDefault(); props.onRowDrop?.(page.id); } : undefined}>
      {/* The leading gutter is a real column only with row numbers; otherwise
          the row controls float over the first cell's left edge on hover, so an
          empty column never draws a border that group rows interrupt. */}
      {showRowNumbers && (
        <td className={cn("w-10 px-1 py-1.5 border-r border-b border-line text-center align-middle relative")}>
          <span className={cn("text-xs text-ink-muted tabular-nums group-hover:opacity-0")}>{rowIdx + 1}</span>
          {controls}
        </td>
      )}

      {visibleProps.map((prop, colIdx) => {
        const value = page.properties[prop.id];
        const isFocused = focusedPropId === prop.id;
        const isEditing = editingPropId === prop.id;
        const inSelection = colIdx >= selectedColStart && colIdx <= selectedColEnd;
        const ring = focusRingClass(isFocused, fillRangePropId === prop.id || inSelection);

        const cellProps: CellRendererProps = {
          prop, page, value, isEditing, editSeed: isEditing ? editSeed : undefined, wrapContent, databaseId,
          onUpdate: onUpdateProperty, onStopEditing, onOpenPage,
          onFormulaEdit, onPropertyConfig, tableRef, storeApi,
        };

        let cellCursor: string | undefined;
        if (fillDragActive) cellCursor = CURSORS.crosshair;
        else if (isEditing) cellCursor = undefined;
        else cellCursor = CURSORS.cell;

        // A resize drag rewrites this width in place through data-col (useColumnResize).
        const width = `${getColWidth(prop.id)}px`;
        return (
          <td key={prop.id} data-col={prop.id}
            id={cellDomId(databaseId, page.id, prop.id)}
            role="gridcell"
            aria-selected={isFocused || inSelection}
            className={cn(`px-3 py-1.5 ${cellBorder} border-b border-line ${isFocused ? 'overflow-visible' : 'overflow-hidden'} ${wrapContent ? 'align-top' : 'align-middle'} relative ${ring}`)}
            style={{
              width, minWidth: width, maxWidth: width,
              cursor: cellCursor,
            }}
            onMouseDown={e => { if (e.button === 0) onCellMouseDown(page.id, prop.id, e.shiftKey); }}
            onMouseEnter={() => onCellMouseEnter(page.id, prop.id)}
            onClick={e => onCellClick(page.id, prop.id, prop.type, value, e.shiftKey)}
            onDoubleClick={() => onCellDoubleClick(page.id, prop.id, prop.type)}>
            {renderCellContent(cellProps)}
            {colIdx === 0 && !showRowNumbers && !isEditing && controls}
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
        <button aria-label="Row options" tabIndex={-1} className={cn("p-1 min-h-[24px] min-w-[24px] text-ink-muted hover:text-hover-text opacity-0 group-hover:opacity-100 rounded hover:bg-hover-surface2")}
          onClick={e => { const r = e.currentTarget.getBoundingClientRect(); onRowMenu(page.id, r.left, r.bottom); }}>
          <MoreHorizontal className={cn("w-3.5 h-3.5")} />
        </button>
      </td>
      <td className={cn("border-b border-line")} />
    </tr>
  );
});
