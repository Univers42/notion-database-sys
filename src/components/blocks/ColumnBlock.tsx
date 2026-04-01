/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ColumnBlock.tsx                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:34:49 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 19:40:54 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */


// ═══════════════════════════════════════════════════════════════════════════════
// ColumnBlock — horizontal multi-column layout block
// ═══════════════════════════════════════════════════════════════════════════════
//
// Renders N columns side-by-side. Each column holds child blocks rendered via
// BlockRenderer. Columns are resizable via drag handles.
//
// Block data:
//   block.columns: Block[][] — array of column arrays
//   block.columnRatios: number[] — flex ratios for each column
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useCallback, useRef } from 'react';
import type { Block } from '../../types/database';
import { BlockRenderer } from './BlockRenderer';
import { EditableContent } from './EditableContent';
import { useDatabaseStore } from '../../store/useDatabaseStore';
import { Plus, GripVertical } from 'lucide-react';
import { ColumnResizeHandle } from './ColumnResizeHandle';

export interface ColumnBlockProps {
  block: Block;
  pageId: string;
}

export function ColumnBlock({ block, pageId }: ColumnBlockProps) {
  const updateBlock = useDatabaseStore(s => s.updateBlock);
  const columns = block.columns || [[], []];
  const ratios = block.columnRatios || columns.map(() => 1);

  const handleAddColumn = useCallback(() => {
    const newColumns = [...columns, []];
    const newRatios = [...ratios, 1];
    updateBlock(pageId, block.id, { columns: newColumns, columnRatios: newRatios });
  }, [columns, ratios, updateBlock, pageId, block.id]);

  const handleRemoveColumn = useCallback((colIdx: number) => {
    if (columns.length <= 1) return;
    const newColumns = columns.filter((_, i) => i !== colIdx);
    const newRatios = ratios.filter((_, i) => i !== colIdx);
    updateBlock(pageId, block.id, { columns: newColumns, columnRatios: newRatios });
  }, [columns, ratios, updateBlock, pageId, block.id]);

  const handleBlockChange = useCallback((colIdx: number, blockIdx: number, text: string) => {
    const newColumns = columns.map((col, ci) =>
      ci === colIdx
        ? col.map((b, bi) => bi === blockIdx ? { ...b, content: text } : b)
        : col
    );
    updateBlock(pageId, block.id, { columns: newColumns });
  }, [columns, updateBlock, pageId, block.id]);

  const handleAddBlockToColumn = useCallback((colIdx: number) => {
    const newBlock: Block = { id: crypto.randomUUID(), type: 'paragraph', content: '' };
    const newColumns = columns.map((col, ci) =>
      ci === colIdx ? [...col, newBlock] : col
    );
    updateBlock(pageId, block.id, { columns: newColumns });
  }, [columns, updateBlock, pageId, block.id]);

  const handleDeleteBlock = useCallback((colIdx: number, blockId: string) => {
    const newColumns = columns.map((col, ci) =>
      ci === colIdx ? col.filter(b => b.id !== blockId) : col
    );
    updateBlock(pageId, block.id, { columns: newColumns });
  }, [columns, updateBlock, pageId, block.id]);

  // Column resize
  const handleKeyDownNoop = useCallback(() => {}, []);

  return (
    <div className="my-2">
      <div className="flex gap-4" style={{ display: 'flex' }}>
        {columns.map((col, colIdx) => (
          <React.Fragment key={colIdx}>
            {colIdx > 0 && (
              <ColumnResizeHandle
                pageId={pageId}
                blockId={block.id}
                colIdx={colIdx}
                ratios={ratios}
                columns={columns}
              />
            )}
            <div
              className="min-w-0 flex-1 group/column"
              style={{ flex: ratios[colIdx] || 1 }}
            >
              <div className="min-h-[40px] rounded-md border border-transparent hover:border-line-light transition-colors p-1">
                {col.length === 0 ? (
                  <button
                    onClick={() => handleAddBlockToColumn(colIdx)}
                    className="w-full py-3 text-xs text-ink-disabled hover:text-hover-text-muted hover:bg-hover-surface rounded transition-colors"
                  >
                    + Add block
                  </button>
                ) : (
                  col.map((childBlock, blockIdx) => (
                    <div key={childBlock.id} className="group/nested relative">
                      <BlockRenderer
                        block={childBlock}
                        pageId={pageId}
                        index={blockIdx}
                        onChange={(text) => handleBlockChange(colIdx, blockIdx, text)}
                        onKeyDown={(e) => {
                          if (e.key === 'Backspace' && childBlock.content === '' && col.length > 1) {
                            e.preventDefault();
                            handleDeleteBlock(colIdx, childBlock.id);
                          }
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            const newBlock: Block = { id: crypto.randomUUID(), type: 'paragraph', content: '' };
                            const newColumns = columns.map((c, ci) =>
                              ci === colIdx
                                ? [...c.slice(0, blockIdx + 1), newBlock, ...c.slice(blockIdx + 1)]
                                : c
                            );
                            updateBlock(pageId, block.id, { columns: newColumns });
                          }
                        }}
                      />
                    </div>
                  ))
                )}
                {col.length > 0 && (
                  <button
                    onClick={() => handleAddBlockToColumn(colIdx)}
                    className="w-full flex items-center gap-1 text-xs text-ink-disabled hover:text-hover-text-muted py-1 opacity-0 group-hover/column:opacity-100 transition-opacity"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </React.Fragment>
        ))}
      </div>
      {columns.length < 5 && (
        <button
          onClick={handleAddColumn}
          className="mt-1 text-xs text-ink-disabled hover:text-hover-text-muted transition-colors flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Add column
        </button>
      )}
    </div>
  );
}

