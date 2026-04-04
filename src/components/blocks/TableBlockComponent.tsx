/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   TableBlockComponent.tsx                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:35:39 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/02 15:07:14 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useCallback, useMemo } from 'react';
import type { BlockRendererProps } from './BlockRenderer';
import { useDatabaseStore } from '../../store/dbms/hardcoded/useDatabaseStore';
import { cn } from '../../utils/cn';

export function TableBlockComponent({ block, pageId }: Readonly<BlockRendererProps>) {
  const updateBlock = useDatabaseStore(s => s.updateBlock);

  const data = useMemo(() => block.tableData || [
    ['', '', ''],
    ['', '', ''],
    ['', '', ''],
  ], [block.tableData]);

  const handleCellChange = useCallback(
    (row: number, col: number, value: string) => {
      const newData = data.map((r, ri) =>
        ri === row ? r.map((c, ci) => (ci === col ? value : c)) : [...r]
      );
      updateBlock(pageId, block.id, { tableData: newData });
    },
    [updateBlock, pageId, block.id, data]
  );

  const addRow = useCallback(() => {
    const cols = data[0]?.length || 3;
    const newData = [...data, new Array(cols).fill('')];
    updateBlock(pageId, block.id, { tableData: newData });
  }, [updateBlock, pageId, block.id, data]);

  const addCol = useCallback(() => {
    const newData = data.map(row => [...row, '']);
    updateBlock(pageId, block.id, { tableData: newData });
  }, [updateBlock, pageId, block.id, data]);

  return (
    <div className={cn("my-2 border border-line rounded-lg overflow-hidden")}>
      <table className={cn("w-full text-sm")}>
        <tbody>
          {data.map((row, ri) => (
            <tr key={ri} className={cn(ri === 0 ? 'bg-surface-secondary font-medium' : '')}>{/* NOSONAR - table rows identified by position */}
              {row.map((cell, ci) => (
                <td
                  key={ci} // NOSONAR - table cells identified by position
                  contentEditable
                  suppressContentEditableWarning
                  className={cn("border-b border-r border-line last:border-r-0 px-3 py-1.5 outline-none focus:bg-focus-surface-accent min-w-[80px] text-ink-body")}
                  onInput={(e) => handleCellChange(ri, ci, (e.target as HTMLElement).textContent || '')}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className={cn("flex border-t border-line")}>
        <button
          type="button"
          onClick={addRow}
          className={cn("flex-1 text-xs text-ink-muted hover:text-hover-text hover:bg-hover-surface py-1.5 transition-colors border-r border-line")}
        >
          + Row
        </button>
        <button
          type="button"
          onClick={addCol}
          className={cn("flex-1 text-xs text-ink-muted hover:text-hover-text hover:bg-hover-surface py-1.5 transition-colors")}
        >
          + Column
        </button>
      </div>
    </div>
  );
}
