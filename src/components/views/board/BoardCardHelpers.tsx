/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   BoardCardHelpers.tsx                               :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:38:02 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 10:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { Image, ArrowUpRight } from 'lucide-react';
import { CURSORS } from '../../ui/cursors';
import { PropIcon } from '../../../constants/propertyIcons';
import type { Page, SchemaProperty } from '../../../types/database';
import { CARD_COVER_GRADIENTS as COVER_COLORS } from '../../../utils/color';
import { cn } from '../../../utils/cn';
import { CardPropertyValue, hasCardValue } from '../shared/CardPropertyValue';

/** Card-size axis: column width + cover height + body density scale together. */
const CARD_SIZES = {
  small: { col: 'w-56', cover: 'h-16', pad: 'p-2.5', title: 'text-[13px]', icon: 'text-2xl' },
  medium: { col: 'w-72', cover: 'h-24', pad: 'p-3', title: 'text-sm', icon: 'text-3xl' },
  large: { col: 'w-80', cover: 'h-32', pad: 'p-3.5', title: 'text-sm', icon: 'text-4xl' },
  xl: { col: 'w-96', cover: 'h-40', pad: 'p-4', title: 'text-[15px]', icon: 'text-5xl' },
} as const;
type CardSizeKey = keyof typeof CARD_SIZES;

function sizeCfg(cardSize: string) {
  return CARD_SIZES[(cardSize in CARD_SIZES ? cardSize : 'medium') as CardSizeKey];
}

/** Returns the Tailwind width class for a board column based on card size. */
export function getColumnWidth(cardSize: string) {
  return sizeCfg(cardSize).col;
}

/** Cover strip: real cover (image url OR css gradient string), else the page
 *  icon, else a deterministic placeholder tint. Sits ABOVE the card padding. */
function BoardCardCover({ page, coverColor, heightCls, iconCls }: Readonly<{
  page: Page; coverColor: string; heightCls: string; iconCls: string;
}>) {
  const cover = typeof page.cover === 'string' ? page.cover : '';
  if (cover.includes('gradient(')) {
    return <div className={cn(`${heightCls} w-full shrink-0`)} style={{ backgroundImage: cover }} />;
  }
  if (cover) {
    return <img src={cover} alt="" className={cn(`${heightCls} w-full object-cover shrink-0`)} />;
  }
  return (
    <div className={cn(`${heightCls} w-full shrink-0 ${coverColor} flex items-center justify-center`)}>
      {page.icon
        ? <span className={cn(iconCls)}>{page.icon}</span>
        : <Image className={cn('w-6 h-6 text-ink-disabled/60')} aria-hidden="true" />}
    </div>
  );
}

/** Optional preview header above the card body (page cover or content). */
export function BoardCardPreview({ cardPreview, coverColor, page, size }: Readonly<{
  cardPreview: string;
  coverColor: string;
  page: Page;
  size: ReturnType<typeof sizeCfg>;
}>) {
  if (cardPreview === 'page_cover') {
    return <BoardCardCover page={page} coverColor={coverColor} heightCls={size.cover} iconCls={size.icon} />;
  }
  if (cardPreview === 'page_content') {
    const textContent = page.content?.map(b => b.content).filter(Boolean).join(' ') || '';
    return (
      <div className={cn('shrink-0 bg-surface-secondary border-b border-line-light px-3 py-2')}>
        <p className={cn('text-[11px] text-ink-secondary leading-relaxed line-clamp-3')}>
          {textContent || <span className={cn('text-ink-muted italic')}>Empty page</span>}
        </p>
      </div>
    );
  }
  // 'none' and the legacy 'page_properties' (properties now always live in
  // the body — no duplicated gray block).
  return null;
}

interface BoardCardProps {
  page: Page;
  pageIdx: number;
  cardPreview: string;
  cardSize: string;
  wrapContent: boolean;
  databaseId: string;
  nonTitleGroupProps: SchemaProperty[];
  openPage: (id: string) => void;
  getPageTitle: (page: Page) => string;
  onDragStart: (e: React.DragEvent, pageId: string) => void;
  /** Conditional-color edge accent, if a rule matched. */
  accent?: string | null;
}

/** Draggable board card: optional cover/preview strip, title row, then one
 *  labeled row per visible property — every type renders, none throw. */
export function BoardCard({
  page, pageIdx, cardPreview, cardSize, wrapContent, databaseId,
  nonTitleGroupProps, openPage, getPageTitle, onDragStart, accent,
}: Readonly<BoardCardProps>) {
  const title = getPageTitle(page);
  const size = sizeCfg(cardSize);
  const coverColor = COVER_COLORS[pageIdx % COVER_COLORS.length];
  const shownProps = nonTitleGroupProps.filter(p => hasCardValue(p, page.properties[p.id]));

  return (
    <button type="button" draggable
      onDragStart={e => onDragStart(e, page.id)}
      onClick={() => openPage(page.id)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPage(page.id); } }}
      style={{ cursor: CURSORS.grab, ...(accent ? { boxShadow: `inset 3px 0 0 0 ${accent}` } : {}) }}
      className={cn('bg-surface-primary rounded-xl shadow-sm border border-line overflow-hidden flex flex-col active:cursor-grabbing hover:shadow-md hover:border-hover-border focus-visible:ring-2 focus-visible:ring-ring-accent-muted transition-all group/card text-left')}>
      <BoardCardPreview cardPreview={cardPreview} coverColor={coverColor} page={page} size={size} />
      <div className={cn(`${size.pad} flex flex-col gap-1.5 min-w-0`)}>
        <div className={cn('flex items-start gap-1')}>
          <div className={cn(`font-medium ${size.title} text-ink flex-1 min-w-0 leading-snug ${wrapContent ? 'break-words' : 'truncate'}`)}>
            {page.icon && <span className={cn('mr-1')}>{page.icon}</span>}
            {title || <span className={cn('text-ink-muted')}>Untitled</span>}
          </div>
          <span
            className={cn('shrink-0 flex items-center gap-0.5 text-[10px] font-medium text-accent-text-soft bg-accent-soft px-1 py-0.5 rounded opacity-0 group-hover/card:opacity-100 transition-opacity')}
            aria-hidden="true">
            <ArrowUpRight className={cn('w-2.5 h-2.5')} /> Open
          </span>
        </div>
        {shownProps.length > 0 && (
          <div className={cn('flex flex-col gap-1 min-w-0')} data-testid="board-card-props">
            {shownProps.map(prop => (
              <div key={prop.id} title={prop.name} className={cn('flex items-center gap-1.5 min-w-0')}>
                <PropIcon type={prop.type} className={cn('w-3 h-3 shrink-0 text-ink-disabled')} />
                <CardPropertyValue prop={prop} val={page.properties[prop.id]} page={page}
                  databaseId={databaseId} wrap={wrapContent} />
              </div>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}
