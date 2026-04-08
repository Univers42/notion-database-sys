/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   PageContentEditor.tsx                              :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:39:26 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 11:45:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { useDatabaseStore } from "../store/dbms/hardcoded/useDatabaseStore";
import { useBlockEditor } from "../hooks/useBlockEditor";
import { useBlockContextMenu } from "../hooks/useBlockContextMenu";
import { useUndoRedo } from "../hooks/useUndoRedo";
import { usePasteHandler } from "../hooks/usePasteHandler";
import { BlockRenderer } from "./blocks/BlockRenderer";
import { BlockContextMenu } from "./blocks/BlockContextMenu";
import { SlashCommandMenu } from "./blocks/SlashCommandMenu";
import { InlineToolbar } from "./blocks/InlineToolbar";
import {
  DraggableBlockWrapper,
  EmptyBlockPlaceholder,
} from "./PageContentEditorHelpers";
import { cn } from "../utils/cn";

/** Block-based content editor for page modals with drag-and-drop, slash commands, and inline toolbar. */
export function PageContentEditor({ pageId }: Readonly<{ pageId: string }>) {
  const pages = useDatabaseStore((s) => s.pages);
  const updatePageContent = useDatabaseStore((s) => s.updatePageContent);
  const page = pages[pageId];
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);

  const {
    slashMenu,
    setSlashMenu,
    handleBlockChange,
    handleKeyDown,
    handleSlashSelect,
    handleAddBlock,
    handleInitBlock,
    registerBlockRef,
    focusBlock,
  } = useBlockEditor(pageId);

  const {
    contextMenu,
    contextMenuSections,
    openContextMenu,
    closeContextMenu,
  } = useBlockContextMenu({
    pageId,
    content: page?.content || [],
    updatePageContent,
    focusBlock,
  });

  // Undo/redo — keyboard shortcuts handled internally
  useUndoRedo(pageId);

  // Paste markdown → block conversion
  usePasteHandler(pageId);

  if (!page) return null;
  const content = page.content || [];

  return (
    <div
      className={cn("flex flex-col gap-0.5 min-h-[200px]")}
      data-page-content-editor
    >
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
            onContextMenu={openContextMenu}
          >
            <div ref={(el) => registerBlockRef(block.id, el)}>
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
          className={cn(
            "flex items-center gap-2 text-sm text-ink-disabled hover:text-hover-text-muted py-2 transition-colors group",
          )}
        >
          <Plus className={cn("w-4 h-4")} />
          <span
            className={cn(
              "opacity-0 group-hover:opacity-100 transition-opacity",
            )}
          >
            Add a block
          </span>
        </button>
      )}

      {slashMenu && (
        <SlashCommandMenu
          position={slashMenu.position}
          filter={slashMenu.filter}
          onSelect={(item) =>
            handleSlashSelect(item.type, content, item.calloutIcon)
          }
          onClose={() => setSlashMenu(null)}
        />
      )}

      <InlineToolbar />

      <BlockContextMenu
        menu={contextMenu}
        sections={contextMenuSections}
        onClose={closeContextMenu}
      />
    </div>
  );
}
