/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   PageContentEditorHelpers.tsx                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:39:26 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 23:14:06 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { useDatabaseStore } from '../store/dbms/hardcoded/useDatabaseStore';
import type { Block } from '../types/database';
import { cn } from '../utils/cn';

/** MIME type used for block drag-and-drop transfers. */
export const DND_TYPE = 'application/x-block-id';

/** Renders add-block and drag-handle controls on block hover. */
export function BlockHoverControls({ block, content, pageId, focusBlock }: Readonly<{
  block: Block;
  content: Block[];
  pageId: string;
  focusBlock: (id: string) => void;
}>) {
  const { insertBlock, updatePageContent } = useDatabaseStore.getState();

  const handleInsertBefore = () => {
    const newBlock: Block = { id: crypto.randomUUID(), type: 'paragraph', content: '' };
    const idx = content.findIndex(b => b.id === block.id);
    const prevId = idx > 0 ? content[idx - 1].id : null;
    if (prevId) {
      insertBlock(pageId, prevId, newBlock);
    } else {
      updatePageContent(pageId, [newBlock, ...content]);
    }
    focusBlock(newBlock.id);
  };

  return (
    <div className={cn("absolute -left-8 top-1 opacity-0 group-hover/block:opacity-100 transition-opacity flex items-center gap-0.5")}>
      <button
        onClick={handleInsertBefore}
        className={cn("p-0.5 text-ink-disabled hover:text-hover-text-muted rounded hover:bg-hover-surface2 transition-colors")}
        title="Add block"
      >
        <Plus className={cn("w-4 h-4")} />
      </button>
      <DragHandle blockId={block.id} />
    </div>
  );
}

function DragHandle({ blockId }: Readonly<{ blockId: string }>) {
  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData(DND_TYPE, blockId);
    e.dataTransfer.effectAllowed = 'move';
    if (e.currentTarget.parentElement?.parentElement) {
      e.dataTransfer.setDragImage(e.currentTarget.parentElement.parentElement, 0, 0);
    }
  }, [blockId]);

  return (
    <button
      type="button"
      aria-label="Drag to reorder"
      draggable
      onDragStart={handleDragStart}
      className={cn("p-0.5 text-ink-disabled hover:text-hover-text-muted rounded hover:bg-hover-surface2 transition-colors cursor-grab active:cursor-grabbing")}
    >
      <svg className={cn("w-4 h-4")} viewBox="0 0 16 16" fill="currentColor">
        <circle cx="5.5" cy="3.5" r="1.5" />
        <circle cx="10.5" cy="3.5" r="1.5" />
        <circle cx="5.5" cy="8" r="1.5" />
        <circle cx="10.5" cy="8" r="1.5" />
        <circle cx="5.5" cy="12.5" r="1.5" />
        <circle cx="10.5" cy="12.5" r="1.5" />
      </svg>
    </button>
  );
}

/** Possible positions for a block drop indicator. */
export type DropPosition = 'above' | 'below' | null;

/** Renders a visual indicator for block drop targets during drag-and-drop. */
export function DropIndicator({ position }: Readonly<{ position: DropPosition }>) {
  if (!position) return null;
  return (
    <div
      className={cn(`absolute left-0 right-0 h-0.5 bg-accent-text-light rounded-full pointer-events-none z-10 ${
        position === 'above' ? '-top-px' : '-bottom-px'
      }`)}
    />
  );
}

/** Wraps a block with drag-and-drop and drop-target behavior. */
export function DraggableBlockWrapper({
  block, content, pageId, focusBlock, draggedBlockId, onDraggedChange, onContextMenu, children,
}: Readonly<{
  block: Block;
  content: Block[];
  pageId: string;
  focusBlock: (id: string) => void;
  draggedBlockId: string | null;
  onDraggedChange: (id: string | null) => void;
  onContextMenu?: (e: React.MouseEvent, blockId: string) => void;
  children: React.ReactNode;
}>) {
  const [dropPosition, setDropPosition] = useState<DropPosition>(null);
  const moveBlock = useDatabaseStore(s => s.moveBlock);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes(DND_TYPE)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    setDropPosition(e.clientY < midY ? 'above' : 'below');
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDropPosition(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDropPosition(null);
    const draggedId = e.dataTransfer.getData(DND_TYPE);
    if (!draggedId || draggedId === block.id) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const targetIdx = content.findIndex(b => b.id === block.id);
    const adjustedIdx = e.clientY < midY ? targetIdx : targetIdx + 1;
    moveBlock(pageId, draggedId, adjustedIdx);
    onDraggedChange(null);
  }, [block.id, content, moveBlock, pageId, onDraggedChange]);

  const handleDragEnd = useCallback(() => {
    onDraggedChange(null);
  }, [onDraggedChange]);

  const isDragged = draggedBlockId === block.id;

  return (
    <div // NOSONAR - block grouping pattern requires role="group"
      role="group"
      data-block-id={block.id}
      className={cn(`group/block relative transition-opacity ${isDragged ? 'opacity-30' : ''}`)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onDragEnd={handleDragEnd}
      onContextMenu={onContextMenu ? (e) => onContextMenu(e, block.id) : undefined}
    >
      <DropIndicator position={dropPosition} />
      <BlockHoverControls block={block} content={content} pageId={pageId} focusBlock={focusBlock} />
      {children}
    </div>
  );
}

/** Renders a placeholder input for empty page content to initiate the first block. */
export function EmptyBlockPlaceholder({ onFocus }: Readonly<{ onFocus: () => void }>) {
  return (
    <div // NOSONAR - contentEditable placeholder requires div with textbox role
      role="textbox"
      contentEditable
      data-block-editor
      className={cn("text-sm text-ink-muted outline-none py-1 focus:text-focus-text")}
      onFocus={onFocus}
      suppressContentEditableWarning
    >
      Type &apos;/&apos; for commands, or just start writing...
    </div>
  );
}
