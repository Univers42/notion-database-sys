/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   BlockEditor.tsx                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/05 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/05 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';

import { EditableContent }   from '@src/components/blocks/EditableContent';
import type { Block } from '@src/types/database';

import { CALLOUT_COLORS }    from './PlaygroundPageEditorConstants';
import { TodoBlockEditor }   from './TodoBlockEditor';
import { ToggleBlockEditor } from './ToggleBlockEditor';

interface BlockEditorProps {
  block: Block;
  numberedIndex: number;
  onChange: (text: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export const BlockEditor: React.FC<BlockEditorProps> = ({ block, numberedIndex, onChange, onKeyDown }) => {
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
