/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   BoardCardHelpers.tsx                               :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:38:02 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/02 01:19:23 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { Image, ArrowUpRight } from 'lucide-react';
import { format } from 'date-fns';
import { CURSORS } from '../ui/cursors';
import type { Page, SchemaProperty, PropertyValue } from '../../types/database';

export const COVER_COLORS = [
  'bg-gradient-to-br from-gradient-blue-from to-gradient-blue-to',
  'bg-gradient-to-br from-gradient-purple-card-from to-gradient-purple-card-to',
  'bg-gradient-to-br from-gradient-green-from to-gradient-green-to',
  'bg-gradient-to-br from-gradient-orange-from to-gradient-orange-to',
  'bg-gradient-to-br from-gradient-pink-from to-gradient-pink-to',
  'bg-gradient-to-br from-gradient-cyan-from to-gradient-cyan-to',
];

export function getColumnWidth(cardSize: string) {
  switch (cardSize) {
    case 'small': return 'w-56';
    case 'large': return 'w-80';
    case 'xl': return 'w-96';
    default: return 'w-72';
  }
}

export function renderBoardPropertyValue(prop: SchemaProperty, val: PropertyValue, wrapContent: boolean) {
  if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) return null;
  if (prop.type === 'select' || prop.type === 'status') {
    const opt = prop.options?.find(o => o.id === val);
    return opt ? <span className={`inline-block w-fit px-2 py-0.5 rounded text-xs font-medium ${opt.color}`}>{opt.value}</span> : null;
  }
  if (prop.type === 'multi_select') {
    const ids: string[] = Array.isArray(val) ? val : [];
    return (
      <div className={`flex gap-1 ${wrapContent ? 'flex-wrap' : 'flex-nowrap overflow-hidden'}`}>
        {ids.map(id => {
          const opt = prop.options?.find(o => o.id === id);
          return opt ? <span key={id} className={`px-1.5 py-0.5 rounded text-xs font-medium ${opt.color}`}>{opt.value}</span> : null;
        })}
      </div>
    );
  }
  if (prop.type === 'date') return <div className="text-xs text-ink-secondary">{format(new Date(val), 'MMM d')}</div>;
  if (prop.type === 'user' || prop.type === 'person') {
    return (
      <div className="flex items-center gap-1">
        <div className="w-4 h-4 rounded-full bg-gradient-to-br from-gradient-accent-from to-gradient-accent-to text-ink-inverse flex items-center justify-center text-[8px] font-bold">{String(val).charAt(0).toUpperCase()}</div>
        <span className="text-xs text-ink-body-light">{val}</span>
      </div>
    );
  }
  if (prop.type === 'number') return <div className="text-xs text-ink-secondary tabular-nums">{prop.name}: {Number(val).toLocaleString()}</div>;
  if (prop.type === 'checkbox') {
    return (
      <div className="flex items-center gap-1">
        <div className={`w-3.5 h-3.5 rounded border ${val ? 'bg-accent border-accent-border' : 'border-line-medium'} flex items-center justify-center`}>
          {val && <span className="text-ink-inverse text-[8px]">✓</span>}
        </div>
        <span className="text-xs text-ink-secondary">{prop.name}</span>
      </div>
    );
  }
  return null;
}

export function BoardCardPreview({ cardPreview, coverColor, page, nonTitleGroupProps, wrapContent }: Readonly<{
  cardPreview: string;
  coverColor: string;
  page: Page;
  nonTitleGroupProps: SchemaProperty[];
  wrapContent: boolean;
}>) {
  if (cardPreview === 'none') return null;

  if (cardPreview === 'page_cover') {
    return (
      <div className={`h-24 ${coverColor} flex items-center justify-center rounded-t-lg -mx-3 -mt-3 mb-2 overflow-hidden`}>
        {page.cover ? (
          <img src={page.cover} alt="" className="w-full h-full object-cover" />
        ) : page.icon ? (
          <span className="text-3xl">{page.icon}</span>
        ) : (
          <Image className="w-6 h-6 text-ink-disabled" />
        )}
      </div>
    );
  }

  if (cardPreview === 'page_content') {
    const textContent = page.content?.map(b => b.content).filter(Boolean).join(' ') || '';
    return (
      <div className={`h-16 ${coverColor} rounded -mx-3 -mt-3 mb-2 p-2 overflow-hidden relative`}>
        <p className="text-[10px] text-ink-secondary leading-relaxed line-clamp-3">{textContent || 'No content'}</p>
        <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-gradient-fade-from to-transparent" />
      </div>
    );
  }

  if (cardPreview === 'page_properties') {
    return (
      <div className="bg-surface-secondary rounded -mx-3 -mt-3 mb-2 p-2 overflow-hidden">
        {nonTitleGroupProps.slice(0, 3).map(prop => {
          const val = page.properties[prop.id];
          const rendered = renderBoardPropertyValue(prop, val, wrapContent);
          if (!rendered) return null;
          return (
            <div key={prop.id} className="flex items-center gap-1.5 mb-1">
              <span className="text-[9px] uppercase text-ink-muted tracking-wide shrink-0 w-12 truncate">{prop.name}</span>
              {rendered}
            </div>
          );
        })}
      </div>
    );
  }

  return null;
}

interface BoardCardProps {
  page: Page;
  pageIdx: number;
  cardPreview: string;
  wrapContent: boolean;
  nonTitleGroupProps: SchemaProperty[];
  openPage: (id: string) => void;
  getPageTitle: (page: Page) => string;
  onDragStart: (e: React.DragEvent, pageId: string) => void;
}

export function BoardCard({ page, pageIdx, cardPreview, wrapContent, nonTitleGroupProps, openPage, getPageTitle, onDragStart }: Readonly<BoardCardProps>) {
  const title = getPageTitle(page);
  const coverColor = COVER_COLORS[pageIdx % COVER_COLORS.length];

  return (
    <div draggable
      onDragStart={e => onDragStart(e, page.id)}
      onClick={() => openPage(page.id)}
      style={{ cursor: CURSORS.grab }}
      className="bg-surface-primary p-3 rounded-lg shadow-sm border border-line active:cursor-grabbing hover:shadow-md hover:border-hover-border transition-all group/card">
      <BoardCardPreview cardPreview={cardPreview} coverColor={coverColor} page={page} nonTitleGroupProps={nonTitleGroupProps} wrapContent={wrapContent} />
      <div className="flex items-center gap-1 mb-1">
        <div className={`font-medium text-sm text-ink flex-1 min-w-0 ${wrapContent ? 'break-words' : 'truncate'}`}>
          {page.icon && <span className="mr-1">{page.icon}</span>}
          {title || <span className="text-ink-muted">Untitled</span>}
        </div>
        <button
          className="shrink-0 flex items-center gap-0.5 text-[9px] font-medium text-accent-text-soft bg-accent-soft hover:bg-hover-accent-muted px-1 py-0.5 rounded opacity-0 group-hover/card:opacity-100 transition-opacity"
          onClick={(e) => { e.stopPropagation(); openPage(page.id); }}>
          <ArrowUpRight className="w-2.5 h-2.5" /> Open
        </button>
      </div>
      {cardPreview !== 'page_properties' && (
        <div className="flex flex-col gap-1.5 mt-2">
          {nonTitleGroupProps.map(prop => {
            const val = page.properties[prop.id];
            const rendered = renderBoardPropertyValue(prop, val, wrapContent);
            if (!rendered) return null;
            return <React.Fragment key={prop.id}>{rendered}</React.Fragment>;
          })}
        </div>
      )}
    </div>
  );
}
