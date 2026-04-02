/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   TableOfContentsBlock.tsx                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:35:42 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/02 01:19:23 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ═══════════════════════════════════════════════════════════════════════════════
// TableOfContentsBlock — auto-generated TOC from page headings
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useMemo } from 'react';
import { useDatabaseStore } from '../../store/useDatabaseStore';
import { List } from 'lucide-react';

const INDENT: Record<string, string> = {
  heading_1: 'pl-0',
  heading_2: 'pl-4',
  heading_3: 'pl-8',
  heading_4: 'pl-12',
};

const TEXT_SIZE: Record<string, string> = {
  heading_1: 'text-sm font-medium',
  heading_2: 'text-sm',
  heading_3: 'text-xs',
  heading_4: 'text-xs text-ink-muted',
};

export function TableOfContentsBlock({ pageId }: Readonly<{ pageId: string }>) {
  const pages = useDatabaseStore(s => s.pages);
  const page = pages[pageId];

  const headings = useMemo(() => {
    if (!page?.content) return [];
    return page.content.filter(
      b => b.type === 'heading_1' || b.type === 'heading_2' ||
           b.type === 'heading_3' || b.type === 'heading_4'
    );
  }, [page?.content]);

  if (headings.length === 0) {
    return (
      <div className="my-2 p-3 rounded-lg border border-line-light bg-surface-secondary-soft">
        <div className="flex items-center gap-2 text-xs text-ink-muted">
          <List className="w-3.5 h-3.5" />
          <span>Add headings to create a table of contents</span>
        </div>
      </div>
    );
  }

  return (
    <div className="my-2 p-3 rounded-lg border border-line-light bg-surface-secondary-soft">
      <div className="flex items-center gap-2 mb-2 text-xs font-medium text-ink-secondary uppercase tracking-wider">
        <List className="w-3.5 h-3.5" />
        Table of Contents
      </div>
      <div className="flex flex-col gap-0.5">
        {headings.map(h => (
          <button
            key={h.id}
            onClick={() => {
              const el = document.querySelector(`[data-block-id="${h.id}"]`);
              el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className={`text-left py-0.5 text-ink-body hover:text-accent-text-light transition-colors ${
              INDENT[h.type] || ''
            } ${TEXT_SIZE[h.type] || 'text-sm'}`}
          >
            {h.content || 'Untitled'}
          </button>
        ))}
      </div>
    </div>
  );
}
