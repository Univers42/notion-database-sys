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
import { MoreHorizontal } from 'lucide-react';
import { renderCellContent, CellRendererProps } from './CellRenderer';
import { useStoreApi } from '../../../store/dbms/hardcoded/useDatabaseStore';
import { cn } from '../../../utils/cn';

/** Props for the memoized table row component. */
export interface MemoTableRowProps {
  page: Page;
  rowIdx: number;
  visibleProps: SchemaProperty[];
  focusedPropId: string | null;
  editingPropId: string | null;
  fillDrag: { sourcePropId: string; sourceRowIdx: number; currentRowIdx: number } | null;
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

/** Determines whether a row falls within the fill-drag highlight range. */
function isInFillRange(
  fillDrag: MemoTableRowProps['fillDrag'],
  propId: string,
  rowIdx: number,
): boolean {
  if (propId !== fillDrag?.sourcePropId) return false;
  const minR = Math.min(fillDrag.sourceRowIdx, fillDrag.currentRowIdx);
  const maxR = Math.max(fillDrag.sourceRowIdx, fillDrag.currentRowIdx);
  return rowIdx >= minR && rowIdx <= maxR && rowIdx !== fillDrag.sourceRowIdx;
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
    fillDrag, showRowNumbers, showVerticalLines, wrapContent,
    getColWidth, databaseId, onCellClick, onUpdateProperty, onStopEditing,
    onOpenPage, onFillDragStart, onFormulaEdit, onRowMenu, onPropertyConfig, tableRef,
  } = props;

  const storeApi = useStoreApi();
  const cellBorder = showVerticalLines ? 'border-r border-line' : '';

  return (
    <tr data-row-idx={rowIdx} className={cn("group hover:bg-hover-surface-soft")}>
      {showRowNumbers && (
        <td className={cn("w-10 px-2 py-1.5 border-r border-b border-line text-xs text-ink-muted text-center tabular-nums")}>
          {rowIdx + 1}
        </td>
      )}

      {visibleProps.map(prop => {
        const value = page.properties[prop.id];
        const isFocused = focusedPropId === prop.id;
        const isEditing = editingPropId === prop.id;
        const inFill = isInFillRange(fillDrag, prop.id, rowIdx);
        const ring = focusRingClass(isFocused, inFill);

        const cellProps: CellRendererProps = {
          prop, page, value, isEditing, wrapContent, databaseId,
          onUpdate: onUpdateProperty, onStopEditing, onOpenPage,
          onFormulaEdit, onPropertyConfig, tableRef, storeApi,
        };

        let cellCursor: string | undefined;
        if (fillDrag) cellCursor = CURSORS.crosshair;
        else if (isEditing) cellCursor = undefined;
        else cellCursor = CURSORS.cell;

        return (
          <td key={prop.id}
            className={cn(`px-3 py-1.5 ${cellBorder} border-b border-line ${isFocused ? 'overflow-visible' : 'overflow-hidden'} ${wrapContent ? 'align-top' : 'align-middle'} relative ${ring}`)}
            style={{
              width: getColWidth(prop.id), minWidth: getColWidth(prop.id), maxWidth: getColWidth(prop.id),
              cursor: cellCursor,
            }}
            onClick={() => onCellClick(page.id, prop.id, prop.type, value)}>
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
        <button className={cn("p-1 text-ink-muted hover:text-hover-text opacity-0 group-hover:opacity-100 rounded hover:bg-hover-surface2")}
          onClick={e => { const r = e.currentTarget.getBoundingClientRect(); onRowMenu(page.id, r.left, r.bottom); }}>
          <MoreHorizontal className={cn("w-3.5 h-3.5")} />
        </button>
      </td>
      <td className={cn("border-b border-line")} />
    </tr>
  );
});
