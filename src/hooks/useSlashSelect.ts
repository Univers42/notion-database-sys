/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useSlashSelect.ts                                  :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:40:15 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 22:31:02 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { useCallback } from 'react';
import type { Block, BlockType } from '../types/database';

interface SlashSelectDeps {
  pageId: string;
  slashMenu: { blockId: string } | null;
  setSlashMenu: (s: null) => void;
  updateBlock: (pageId: string, blockId: string, updates: Partial<Block>) => void;
  changeBlockType: (pageId: string, blockId: string, newType: Block['type']) => void;
  insertBlock: (pageId: string, afterBlockId: string, block: Block) => void;
  createInlineDatabase: (name?: string) => { databaseId: string; viewId: string };
  focusBlock: (blockId: string) => void;
}

/**
 * Handles slash-command selection and transforms the target block.
 *
 * When the user picks a block type from the slash menu, this hook
 * strips the `/prefix` text, converts the block to the chosen type,
 * and applies type-specific initialization (e.g. empty table data,
 * column layout, inline database creation).
 *
 * @param deps - Store actions and slash menu state.
 * @returns Callback `(type, content) => void` to invoke on menu selection.
 */
export function useSlashSelect(deps: SlashSelectDeps) {
  const { pageId, slashMenu, setSlashMenu, updateBlock, changeBlockType, insertBlock, createInlineDatabase, focusBlock } = deps;

  return useCallback((type: BlockType, content: Block[]) => {
    if (!slashMenu) return;
    const { blockId } = slashMenu;
    setSlashMenu(null);

    const block = content.find(b => b.id === blockId);
    if (block) {
      const slashIdx = block.content.lastIndexOf('/');
      const cleanContent = slashIdx >= 0 ? block.content.slice(0, slashIdx) : block.content;
      updateBlock(pageId, blockId, { content: cleanContent });
    }

    if (type === 'database_inline' || type === 'database_full_page') {
      const { databaseId, viewId } = createInlineDatabase(type === 'database_full_page' ? 'Untitled' : undefined);
      changeBlockType(pageId, blockId, type);
      updateBlock(pageId, blockId, { content: '', databaseId, viewId });
      const newBlock: Block = { id: crypto.randomUUID(), type: 'paragraph', content: '' };
      insertBlock(pageId, blockId, newBlock);
      focusBlock(newBlock.id);
    } else if (type === 'table_block') {
      updateBlock(pageId, blockId, { content: '' });
      changeBlockType(pageId, blockId, type);
      updateBlock(pageId, blockId, { tableData: [['', '', ''], ['', '', '']] });
    } else if (type === 'column') {
      changeBlockType(pageId, blockId, type);
      updateBlock(pageId, blockId, {
        content: '',
        columns: [
          [{ id: crypto.randomUUID(), type: 'paragraph', content: '' }],
          [{ id: crypto.randomUUID(), type: 'paragraph', content: '' }],
        ],
        columnRatios: [1, 1],
      });
    } else if (type === 'equation') {
      changeBlockType(pageId, blockId, type);
      updateBlock(pageId, blockId, { content: '', expression: '' });
    } else if (type === 'spacer') {
      changeBlockType(pageId, blockId, type);
      updateBlock(pageId, blockId, { content: '', spacerHeight: 40 });
      const newBlock: Block = { id: crypto.randomUUID(), type: 'paragraph', content: '' };
      insertBlock(pageId, blockId, newBlock);
      focusBlock(newBlock.id);
    } else if (type === 'embed') {
      changeBlockType(pageId, blockId, type);
      updateBlock(pageId, blockId, { content: '' });
    } else if (type === 'table_of_contents' || type === 'breadcrumb') {
      changeBlockType(pageId, blockId, type);
      updateBlock(pageId, blockId, { content: '' });
      const newBlock: Block = { id: crypto.randomUUID(), type: 'paragraph', content: '' };
      insertBlock(pageId, blockId, newBlock);
      focusBlock(newBlock.id);
    } else if (type === 'divider') {
      changeBlockType(pageId, blockId, type);
      const newBlock: Block = { id: crypto.randomUUID(), type: 'paragraph', content: '' };
      insertBlock(pageId, blockId, newBlock);
      focusBlock(newBlock.id);
    } else {
      changeBlockType(pageId, blockId, type);
      focusBlock(blockId);
    }
  }, [pageId, slashMenu, updateBlock, changeBlockType, insertBlock, createInlineDatabase, focusBlock, setSlashMenu]);
}

/**
 * Repositions the cursor inside a block element after a markdown
 * shortcut conversion (e.g. `# ` became an h1). Runs on a 30ms delay
 * to allow React to re-render the new block type first.
 */
export function repositionCursor(blockId: string, content: string): void {
  setTimeout(() => {
    const el = document.querySelector(`[data-block-id="${blockId}"] [contenteditable]`) as HTMLElement;
    if (el) {
      el.textContent = content;
      el.focus();
      const sel = globalThis.getSelection();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, 30);
}
