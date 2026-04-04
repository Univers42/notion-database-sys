/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   PlaygroundPageEditor.tsx                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/03 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 15:06:16 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useMemo, useCallback, useState } from 'react';
import { Plus, ChevronRight } from 'lucide-react';

import { EditableContent }   from '@src/components/blocks/EditableContent';
import { SlashCommandMenu }  from '@src/components/blocks/SlashCommandMenu';
import type { Block, BlockType } from '@src/types/database';

import { usePageStore }              from '../store/usePageStore';
import { usePlaygroundBlockEditor }  from '../hooks/usePlaygroundBlockEditor';


const CALLOUT_COLORS: Record<string, { bg: string; border: string }> = {
  '💡': { bg: 'bg-amber-50',  border: 'border-amber-200' },
  '⚠️': { bg: 'bg-amber-50',  border: 'border-amber-300' },
  '❗': { bg: 'bg-red-50',    border: 'border-red-200' },
  '📌': { bg: 'bg-blue-50',   border: 'border-blue-200' },
  '✅': { bg: 'bg-green-50',  border: 'border-green-200' },
  '❌': { bg: 'bg-red-50',    border: 'border-red-200' },
  'ℹ️': { bg: 'bg-blue-50',   border: 'border-blue-200' },
  '🔥': { bg: 'bg-orange-50', border: 'border-orange-200' },
  '💬': { bg: 'bg-gray-50',   border: 'border-gray-200' },
  '📝': { bg: 'bg-purple-50', border: 'border-purple-200' },
  '🎯': { bg: 'bg-indigo-50', border: 'border-indigo-200' },
  '⭐': { bg: 'bg-amber-50',  border: 'border-amber-200' },
};

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
      <div
        className="flex-1 min-h-[200px] cursor-text"
        onClick={() => handleInitBlock(blocks)}
      >
        <p className="text-sm text-[var(--color-ink-faint)] italic select-none pt-1">
          Click here to start writing…
        </p>
      </div>
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


interface BlockEditorProps {
  block: Block;
  numberedIndex: number;
  onChange: (text: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

const BlockEditor: React.FC<BlockEditorProps> = ({ block, numberedIndex, onChange, onKeyDown }) => {
  switch (block.type) {
    case 'heading_1':
      return (
        <EditableContent
          content={block.content}
          className="text-2xl font-bold text-[var(--color-ink)] mt-6 mb-1 leading-tight"
          placeholder="Heading 1"
          onChange={onChange}
          onKeyDown={onKeyDown}
        />
      );
    case 'heading_2':
      return (
        <EditableContent
          content={block.content}
          className="text-xl font-semibold text-[var(--color-ink)] mt-5 mb-1 leading-tight"
          placeholder="Heading 2"
          onChange={onChange}
          onKeyDown={onKeyDown}
        />
      );
    case 'heading_3':
      return (
        <EditableContent
          content={block.content}
          className="text-lg font-semibold text-[var(--color-ink)] mt-4 mb-0.5 leading-snug"
          placeholder="Heading 3"
          onChange={onChange}
          onKeyDown={onKeyDown}
        />
      );

    case 'paragraph':
      return (
        <EditableContent
          content={block.content}
          className="text-sm text-[var(--color-ink)] leading-relaxed py-0.5 min-h-[1.5em]"
          placeholder="Type '/' for commands…"
          onChange={onChange}
          onKeyDown={onKeyDown}
        />
      );


    case 'bulleted_list':
      return (
        <div className="flex items-start gap-2 pl-1">
          <span className="text-sm leading-relaxed py-0.5 select-none shrink-0 w-5 text-center">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-ink-faint)] mt-[7px]" />
          </span>
          <div className="flex-1">
            <EditableContent
              content={block.content}
              className="text-sm text-[var(--color-ink)] leading-relaxed py-0.5"
              placeholder="List item"
              onChange={onChange}
              onKeyDown={onKeyDown}
            />
          </div>
        </div>
      );

    case 'numbered_list':
      return (
        <div className="flex items-start gap-2 pl-1">
          <span className="text-sm leading-relaxed py-0.5 text-[var(--color-ink-muted)] select-none shrink-0 w-5 text-center font-medium">
            {numberedIndex}.
          </span>
          <div className="flex-1">
            <EditableContent
              content={block.content}
              className="text-sm text-[var(--color-ink)] leading-relaxed py-0.5"
              placeholder="List item"
              onChange={onChange}
              onKeyDown={onKeyDown}
            />
          </div>
        </div>
      );


    case 'to_do':
      return <TodoBlockEditor block={block} onChange={onChange} onKeyDown={onKeyDown} />;


    case 'toggle':
      return <ToggleBlockEditor block={block} onChange={onChange} onKeyDown={onKeyDown} />;


    case 'code':
      return (
        <div className="my-1 rounded-lg overflow-hidden border border-[var(--color-line)]">
          <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--color-surface-secondary)] border-b border-[var(--color-line)]">
            <span className="text-[11px] font-mono text-[var(--color-ink-muted)]">
              {block.language || 'plaintext'}
            </span>
          </div>
          <div className="p-3 bg-[var(--color-surface-primary)]">
            <EditableContent
              content={block.content}
              className="text-[13px] leading-relaxed font-mono text-[var(--color-ink)] whitespace-pre"
              placeholder="Code…"
              onChange={onChange}
              onKeyDown={onKeyDown}
            />
          </div>
        </div>
      );


    case 'quote':
      return (
        <div className="flex my-0.5">
          <div className="w-1 bg-[var(--color-ink)] rounded-full shrink-0 mr-3" />
          <div className="flex-1">
            <EditableContent
              content={block.content}
              className="text-sm text-[var(--color-ink-muted)] leading-relaxed py-0.5 italic"
              placeholder="Quote…"
              onChange={onChange}
              onKeyDown={onKeyDown}
            />
          </div>
        </div>
      );


    case 'callout': {
      const icon = block.color || '💡';
      const colors = CALLOUT_COLORS[icon] || { bg: 'bg-[var(--color-surface-secondary)]', border: 'border-[var(--color-line)]' };
      return (
        <div className={`flex items-start gap-3 p-3 rounded-lg border my-0.5 ${colors.bg} ${colors.border}`}>
          <span className="text-lg shrink-0">{icon}</span>
          <div className="flex-1">
            <EditableContent
              content={block.content}
              className="text-sm text-[var(--color-ink)] leading-relaxed py-0.5"
              placeholder="Callout text…"
              onChange={onChange}
              onKeyDown={onKeyDown}
            />
          </div>
        </div>
      );
    }


    case 'divider':
      return (
        <div className="py-2">
          <hr className="border-[var(--color-line)]" />
        </div>
      );

    default:
      return (
        <EditableContent
          content={block.content}
          className="text-sm text-[var(--color-ink)] leading-relaxed py-0.5"
          placeholder="Type something…"
          onChange={onChange}
          onKeyDown={onKeyDown}
        />
      );
  }
};


const TodoBlockEditor: React.FC<{
  block: Block;
  onChange: (text: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}> = ({ block, onChange, onKeyDown }) => {
  const updateBlock = usePageStore(s => s.updateBlock);
  const page       = usePageStore(s => s.activePage);

  const toggleChecked = useCallback(() => {
    if (!page) return;
    updateBlock(page.id, block.id, { checked: !block.checked });
  }, [page, block.id, block.checked, updateBlock]);

  return (
    <div className="flex items-start gap-2 pl-1">
      <button
        type="button"
        onClick={toggleChecked}
        className={[
          'shrink-0 mt-[3px] w-4 h-4 rounded border flex items-center justify-center cursor-pointer',
          block.checked
            ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white'
            : 'border-[var(--color-line)] bg-[var(--color-surface-primary)] hover:border-[var(--color-ink-muted)]',
        ].join(' ')}
      >
        {block.checked && (
          <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none">
            <path d="M4 8l2.5 2.5L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>
      <div className="flex-1">
        <EditableContent
          content={block.content}
          className={[
            'text-sm leading-relaxed py-0.5',
            block.checked ? 'text-[var(--color-ink-muted)] line-through' : 'text-[var(--color-ink)]',
          ].join(' ')}
          placeholder="To-do"
          onChange={onChange}
          onKeyDown={onKeyDown}
        />
      </div>
    </div>
  );
};


const ToggleBlockEditor: React.FC<{
  block: Block;
  onChange: (text: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}> = ({ block, onChange, onKeyDown }) => {
  const [expanded, setExpanded] = useState(!block.collapsed);

  return (
    <div className="pl-0.5">
      <div className="flex items-start gap-1">
        <button
          type="button"
          onClick={() => setExpanded(o => !o)}
          className="shrink-0 mt-[3px] w-5 h-5 rounded hover:bg-[var(--color-surface-hover)] flex items-center justify-center"
        >
          <ChevronRight
            size={14}
            className={[
              'text-[var(--color-ink-muted)] transition-transform duration-150',
              expanded ? 'rotate-90' : '',
            ].join(' ')}
          />
        </button>
        <div className="flex-1">
          <EditableContent
            content={block.content}
            className="text-sm text-[var(--color-ink)] leading-relaxed py-0.5"
            placeholder="Toggle"
            onChange={onChange}
            onKeyDown={onKeyDown}
          />
        </div>
      </div>
      {expanded && block.children && block.children.length > 0 && (
        <div className="ml-6 mt-0.5 pl-3 border-l-2 border-[var(--color-line)]">
          {block.children.map(child => (
            <p key={child.id} className="text-sm text-[var(--color-ink)] leading-relaxed py-0.5">
              {child.content}
            </p>
          ))}
        </div>
      )}
      {expanded && (!block.children || block.children.length === 0) && (
        <div className="ml-6 mt-0.5 pl-3 border-l-2 border-[var(--color-line)]">
          <span className="text-xs text-[var(--color-ink-faint)] py-1 italic">Empty toggle</span>
        </div>
      )}
    </div>
  );
};
