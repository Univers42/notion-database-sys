/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   PageContentEditor.tsx                              :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:39:26 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/02 15:07:14 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ═══════════════════════════════════════════════════════════════════════════════
// PageContentEditor — block-based content editor for page modals
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useDatabaseStore } from '../store/dbms/hardcoded/useDatabaseStore';
import { useBlockEditor } from '../hooks/useBlockEditor';
import { useUndoRedo } from '../hooks/useUndoRedo';
import { usePasteHandler } from '../hooks/usePasteHandler';
import { BlockRenderer } from './blocks/BlockRenderer';
import { SlashCommandMenu } from './blocks/SlashCommandMenu';
import { InlineToolbar } from './blocks/InlineToolbar';
import { DraggableBlockWrapper, EmptyBlockPlaceholder } from './PageContentEditorHelpers';
import { cn } from '../utils/cn';

// ─── Main component ─────────────────────────────────────────────────────────

export function PageContentEditor({ pageId }: Readonly<{ pageId: string }>) {
  const pages = useDatabaseStore(s => s.pages);
  const page = pages[pageId];
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);

  const {
    slashMenu, setSlashMenu,
    handleBlockChange, handleKeyDown,
    handleSlashSelect, handleAddBlock,
    handleInitBlock, registerBlockRef, focusBlock,
  } = useBlockEditor(pageId);

  // Undo/redo — keyboard shortcuts handled internally
  useUndoRedo(pageId);

  // Paste markdown → block conversion
  usePasteHandler(pageId);

  if (!page) return null;
  const content = page.content || [];

  return (
    <div className={cn("flex flex-col gap-0.5 min-h-[200px]")} data-page-content-editor>
      {content.length === 0 ? (
        <EmptyBlockPlaceholder onFocus={() => handleInitBlock(content)} />
      ) : (
        content.map((block) => (
          <DraggableBlockWrapper
            key={block.id}
            block={block}
            content={content}
            pageId={pageId}
            focusBlock={focusBlock}
            draggedBlockId={draggedBlockId}
            onDraggedChange={setDraggedBlockId}
          >
            <div ref={el => registerBlockRef(block.id, el)}>
              <BlockRenderer
                block={block}
                pageId={pageId}
                index={content.indexOf(block)}
                onChange={(text) => handleBlockChange(block.id, text, content)}
                onKeyDown={(e) => handleKeyDown(e, block.id, content)}
              />
            </div>
          </DraggableBlockWrapper>
        ))
      )}

      {content.length > 0 && (
        <button
          onClick={() => handleAddBlock(content)}
          className={cn("flex items-center gap-2 text-sm text-ink-disabled hover:text-hover-text-muted py-2 transition-colors group")}
        >
          <Plus className={cn("w-4 h-4")} />
          <span className={cn("opacity-0 group-hover:opacity-100 transition-opacity")}>Add a block</span>
        </button>
      )}

      {slashMenu && (
        <SlashCommandMenu
          position={slashMenu.position}
          filter={slashMenu.filter}
          onSelect={(type) => handleSlashSelect(type, content)}
          onClose={() => setSlashMenu(null)}
        />
      )}

      <InlineToolbar />
    </div>
  );
}
