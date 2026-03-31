import React, { useCallback } from 'react';
import type { BlockRendererProps } from './BlockRenderer';
import { useDatabaseStore } from '../../store/useDatabaseStore';

export function TableBlockComponent({ block, pageId }: BlockRendererProps) {
  const updateBlock = useDatabaseStore(s => s.updateBlock);

  const data = block.tableData || [
    ['', '', ''],
    ['', '', ''],
    ['', '', ''],
  ];

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
    <div className="my-2 border border-line rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <tbody>
          {data.map((row, ri) => (
            <tr key={ri} className={ri === 0 ? 'bg-surface-secondary font-medium' : ''}>
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  contentEditable
                  suppressContentEditableWarning
                  className="border-b border-r border-line last:border-r-0 px-3 py-1.5 outline-none focus:bg-focus-surface-accent min-w-[80px] text-ink-body"
                  onInput={(e) => handleCellChange(ri, ci, (e.target as HTMLElement).textContent || '')}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex border-t border-line">
        <button
          type="button"
          onClick={addRow}
          className="flex-1 text-xs text-ink-muted hover:text-hover-text hover:bg-hover-surface py-1.5 transition-colors border-r border-line"
        >
          + Row
        </button>
        <button
          type="button"
          onClick={addCol}
          className="flex-1 text-xs text-ink-muted hover:text-hover-text hover:bg-hover-surface py-1.5 transition-colors"
        >
          + Column
        </button>
      </div>
    </div>
  );
}
