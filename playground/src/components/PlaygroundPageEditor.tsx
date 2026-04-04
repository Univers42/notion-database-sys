/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   PlaygroundPageEditor.tsx                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/03 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/05 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useMemo, useCallback } from 'react';
import { Plus } from 'lucide-react';

import { SlashCommandMenu }  from '@src/components/blocks/SlashCommandMenu';
import type { Block, BlockType } from '@src/types/database';

import { usePageStore }              from '../store/usePageStore';
import { usePlaygroundBlockEditor }  from '../hooks/usePlaygroundBlockEditor';
import { BlockEditor }               from './BlockEditor';


interface PlaygroundPageEditorProps {
  pageId: string;
}

/** Editable block-based page editor for the playground. */
export const PlaygroundPageEditor: React.FC<PlaygroundPageEditorProps> = ({ pageId }) => {
  const page   = usePageStore(s => s.pageById(pageId));
  const blocks = useMemo(() => page?.content ?? [], [page?.content]);

  const {
    slashMenu,
    setSlashMenu,
    handleBlockChange,
    handleKeyDown,
    handleSlashSelect,
    handleAddBlock,
    handleInitBlock,
    registerBlockRef,
  } = usePlaygroundBlockEditor(pageId);

  // Numbered list tracking — recomputed each render
  const numberedIndices = useMemo(() => {
    const map = new Map<string, number>();
    let counter = 0;
    for (const b of blocks) {
      if (b.type === 'numbered_list') {
        map.set(b.id, ++counter);
      } else {
        counter = 0;
      }
    }
    return map;
  }, [blocks]);


  if (blocks.length === 0) {
    return (
      <button
        type="button"
        className="flex-1 min-h-[200px] cursor-text text-left"
        onClick={() => handleInitBlock(blocks)}
      >
        <p className="text-sm text-[var(--color-ink-faint)] italic select-none pt-1">
          Click here to start writing…
        </p>
      </button>
    );
  }

  return (
    <div className="flex flex-col">
      {blocks.map(block => (
        <EditableBlock
          key={block.id}
          block={block}
          blocks={blocks}
          numberedIndex={numberedIndices.get(block.id) ?? 0}
          onChange={handleBlockChange}
          onKeyDown={handleKeyDown}
          registerRef={registerBlockRef}
        />
      ))}

      {/* "Add a block" button */}
      <button
        type="button"
        className="flex items-center gap-2 text-sm text-[var(--color-ink-faint)] hover:text-[var(--color-ink-muted)] py-2 px-1 mt-1 transition-colors group"
        onClick={() => handleAddBlock(blocks)}
      >
        <Plus size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
        <span className="opacity-0 group-hover:opacity-100 transition-opacity">
          Add a block
        </span>
      </button>

      {/* Slash command menu */}
      {slashMenu && (
        <SlashCommandMenu
          position={slashMenu.position}
          filter={slashMenu.filter}
          onSelect={(type: BlockType) => handleSlashSelect(type, blocks)}
          onClose={() => setSlashMenu(null)}
        />
      )}
    </div>
  );
};

interface EditableBlockProps {
  block: Block;
  blocks: Block[];
  numberedIndex: number;
  onChange: (blockId: string, text: string, blocks: Block[]) => void;
  onKeyDown: (e: React.KeyboardEvent, blockId: string, blocks: Block[]) => void;
  registerRef: (blockId: string, el: HTMLElement | null) => void;
}

const EditableBlock: React.FC<EditableBlockProps> = ({
  block, blocks, numberedIndex, onChange, onKeyDown, registerRef,
}) => {
  const handleChange = useCallback(
    (text: string) => onChange(block.id, text, blocks),
    [block.id, blocks, onChange],
  );

  const handleKey = useCallback(
    (e: React.KeyboardEvent) => onKeyDown(e, block.id, blocks),
    [block.id, blocks, onKeyDown],
  );

  const refCb = useCallback(
    (el: HTMLDivElement | null) => registerRef(block.id, el),
    [block.id, registerRef],
  );

  return (
    <div data-block-id={block.id} ref={refCb}>
      <BlockEditor
        block={block}
        numberedIndex={numberedIndex}
        onChange={handleChange}
        onKeyDown={handleKey}
      />
    </div>
  );
};
