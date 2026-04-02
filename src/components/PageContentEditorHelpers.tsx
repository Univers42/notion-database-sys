/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   PageContentEditorHelpers.tsx                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:39:26 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 19:40:54 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { useDatabaseStore } from '../store/useDatabaseStore';
import type { Block } from '../types/database';

export const DND_TYPE = 'application/x-block-id';

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
    <div className="absolute -left-8 top-1 opacity-0 group-hover/block:opacity-100 transition-opacity flex items-center gap-0.5">
      <button
        onClick={handleInsertBefore}
        className="p-0.5 text-ink-disabled hover:text-hover-text-muted rounded hover:bg-hover-surface2 transition-colors"
        title="Add block"
      >
        <Plus className="w-4 h-4" />
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
    <div
      draggable
      onDragStart={handleDragStart}
      className="p-0.5 text-ink-disabled hover:text-hover-text-muted rounded hover:bg-hover-surface2 transition-colors cursor-grab active:cursor-grabbing"
    >
      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
        <circle cx="5.5" cy="3.5" r="1.5" />
        <circle cx="10.5" cy="3.5" r="1.5" />
        <circle cx="5.5" cy="8" r="1.5" />
        <circle cx="10.5" cy="8" r="1.5" />
        <circle cx="5.5" cy="12.5" r="1.5" />
        <circle cx="10.5" cy="12.5" r="1.5" />
      </svg>
    </div>
  );
}

export type DropPosition = 'above' | 'below' | null;

export function DropIndicator({ position }: Readonly<{ position: DropPosition }>) {
  if (!position) return null;
  return (
    <div
      className={`absolute left-0 right-0 h-0.5 bg-accent-text-light rounded-full pointer-events-none z-10 ${
        position === 'above' ? '-top-px' : '-bottom-px'
      }`}
    />
  );
}

export function DraggableBlockWrapper({
  block, content, pageId, focusBlock, draggedBlockId, onDraggedChange, children,
}: Readonly<{
  block: Block;
  content: Block[];
  pageId: string;
  focusBlock: (id: string) => void;
  draggedBlockId: string | null;
  onDraggedChange: (id: string | null) => void;
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
    <div
      data-block-id={block.id}
      className={`group/block relative transition-opacity ${isDragged ? 'opacity-30' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onDragEnd={handleDragEnd}
    >
      <DropIndicator position={dropPosition} />
      <BlockHoverControls block={block} content={content} pageId={pageId} focusBlock={focusBlock} />
      {children}
    </div>
  );
}

export function EmptyBlockPlaceholder({ onFocus }: Readonly<{ onFocus: () => void }>) {
  return (
    <div
      contentEditable
      data-block-editor
      className="text-sm text-ink-muted outline-none py-1 focus:text-focus-text"
      onFocus={onFocus}
      suppressContentEditableWarning
    >
      Type &apos;/&apos; for commands, or just start writing...
    </div>
  );
}
