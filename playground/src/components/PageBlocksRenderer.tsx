/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   PageBlocksRenderer.tsx                             :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/03 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 14:03:44 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState } from 'react';
import type { Block } from '@src/types/database';
import { ChevronRight } from 'lucide-react';

interface BlockProps {
  block: Block;
  index: number;
}

const ReadOnlyBlock: React.FC<BlockProps> = ({ block, index }) => {
  switch (block.type) {
    case 'paragraph':
      return (
        <p className="text-sm text-[var(--color-ink)] leading-relaxed py-0.5 min-h-[1.5em]">
          {block.content || <span className="text-[var(--color-ink-faint)]">&nbsp;</span>}
        </p>
      );

    case 'heading_1':
      return <h1 className="text-2xl font-bold text-[var(--color-ink)] mt-6 mb-1 leading-tight">{block.content}</h1>;
    case 'heading_2':
      return <h2 className="text-xl font-semibold text-[var(--color-ink)] mt-5 mb-1 leading-tight">{block.content}</h2>;
    case 'heading_3':
      return <h3 className="text-lg font-semibold text-[var(--color-ink)] mt-4 mb-0.5 leading-snug">{block.content}</h3>;
    case 'heading_4':
      return <h4 className="text-base font-semibold text-[var(--color-ink)] mt-3 mb-0.5 leading-snug">{block.content}</h4>;
    case 'heading_5':
      return <h5 className="text-sm font-semibold text-[var(--color-ink)] mt-2 mb-0.5 leading-snug">{block.content}</h5>;
    case 'heading_6':
      return <h6 className="text-xs font-semibold text-[var(--color-ink-muted)] mt-2 mb-0.5 leading-snug uppercase tracking-wide">{block.content}</h6>;

    case 'bulleted_list':
      return (
        <div className="flex items-start gap-2 pl-1">
          <span className="text-sm leading-relaxed py-0.5 select-none shrink-0 w-5 text-center">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-ink-faint)] mt-[7px]" />
          </span>
          <span className="text-sm text-[var(--color-ink)] leading-relaxed py-0.5 flex-1">{block.content}</span>
        </div>
      );

    case 'numbered_list':
      return (
        <div className="flex items-start gap-2 pl-1">
          <span className="text-sm leading-relaxed py-0.5 text-[var(--color-ink-muted)] select-none shrink-0 w-5 text-center font-medium">
            {index + 1}.
          </span>
          <span className="text-sm text-[var(--color-ink)] leading-relaxed py-0.5 flex-1">{block.content}</span>
        </div>
      );

    case 'to_do':
      return (
        <div className="flex items-start gap-2 pl-1">
          <span
            className={[
              'shrink-0 mt-[3px] w-4 h-4 rounded border flex items-center justify-center',
              block.checked
                ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white'
                : 'border-[var(--color-line)] bg-[var(--color-surface-primary)]',
            ].join(' ')}
          >
            {block.checked && (
              <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none">
                <path d="M4 8l2.5 2.5L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </span>
          <span className={[
            'text-sm leading-relaxed py-0.5 flex-1',
            block.checked ? 'text-[var(--color-ink-muted)] line-through' : 'text-[var(--color-ink)]',
          ].join(' ')}>
            {block.content}
          </span>
        </div>
      );

    case 'code':
      return <CodeBlockReadOnly block={block} />;

    case 'quote':
      return (
        <div className="flex my-0.5">
          <div className="w-1 bg-[var(--color-ink)] rounded-full shrink-0 mr-3" />
          <span className="text-sm text-[var(--color-ink-muted)] leading-relaxed py-0.5 italic flex-1">
            {block.content}
          </span>
        </div>
      );

    case 'callout':
      return <CalloutBlockReadOnly block={block} />;

    case 'divider':
      return (
        <div className="py-2">
          <hr className="border-[var(--color-line)]" />
        </div>
      );

    case 'toggle':
      return <ToggleBlockReadOnly block={block} />;

    default:
      // Fallback: render as paragraph
      return (
        <p className="text-sm text-[var(--color-ink)] leading-relaxed py-0.5">
          {block.content}
        </p>
      );
  }
};


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

const CalloutBlockReadOnly: React.FC<{ block: Block }> = ({ block }) => {
  const icon = block.color || '💡';
  const colors = CALLOUT_COLORS[icon] || { bg: 'bg-[var(--color-surface-secondary)]', border: 'border-[var(--color-line)]' };

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border my-0.5 ${colors.bg} ${colors.border}`}>
      <span className="text-lg shrink-0">{icon}</span>
      <span className="text-sm text-[var(--color-ink)] leading-relaxed py-0.5 flex-1">{block.content}</span>
    </div>
  );
};


const CodeBlockReadOnly: React.FC<{ block: Block }> = ({ block }) => {
  const lang = block.language || 'plaintext';

  return (
    <div className="my-1 rounded-lg overflow-hidden border border-[var(--color-line)]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--color-surface-secondary)] border-b border-[var(--color-line)]">
        <span className="text-[11px] font-mono text-[var(--color-ink-muted)]">{lang}</span>
      </div>
      <pre className="p-3 bg-[var(--color-surface-primary)] overflow-x-auto">
        <code className="text-[13px] leading-relaxed font-mono text-[var(--color-ink)] whitespace-pre">
          {block.content}
        </code>
      </pre>
    </div>
  );
};


const ToggleBlockReadOnly: React.FC<{ block: Block }> = ({ block }) => {
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
        <span className="text-sm text-[var(--color-ink)] leading-relaxed py-0.5 flex-1 cursor-pointer select-none" onClick={() => setExpanded(o => !o)}>
          {block.content}
        </span>
      </div>
      {expanded && block.children && block.children.length > 0 && (
        <div className="ml-6 mt-0.5 pl-3 border-l-2 border-[var(--color-line)]">
          {block.children.map((child, i) => (
            <ReadOnlyBlock key={child.id} block={child} index={i} />
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

interface PageBlocksRendererProps {
  blocks: Block[];
}

/**
 * Renders an array of Block objects as read-only HTML.
 * Tracks numbered list indices correctly (resets when a non-numbered block appears).
 */
export const PageBlocksRenderer: React.FC<PageBlocksRendererProps> = ({ blocks }) => {
  let numberedIndex = 0;

  return (
    <div className="flex flex-col">
      {blocks.map((block, i) => {
        // Track numbered list index (reset when type changes)
        if (block.type === 'numbered_list') {
          numberedIndex++;
        } else {
          numberedIndex = 0;
        }

        const effectiveIndex = block.type === 'numbered_list' ? numberedIndex - 1 : i;

        return (
          <ReadOnlyBlock
            key={block.id}
            block={block}
            index={effectiveIndex}
          />
        );
      })}
    </div>
  );
};
