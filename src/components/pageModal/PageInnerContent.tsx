/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   PageInnerContent.tsx                               :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:39:30 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 18:35:36 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { X, Copy, Trash2, ChevronRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useDatabaseStore } from '../../store/useDatabaseStore';
import { PropertyRow } from '../PropertyRow';
import { PageContentEditor } from '../PageContentEditor';
import type { Page, DatabaseSchema, SchemaProperty } from '../../types/database';

// ─── Action buttons (duplicate / delete / close) ────────────────────────────

export function ActionButtons({ pageId, onClose, deletePage, duplicatePage }: {
  pageId: string;
  onClose: () => void;
  deletePage: (id: string) => void;
  duplicatePage: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <button onClick={() => duplicatePage(pageId)}
        className="p-2 text-ink-muted hover:text-hover-text rounded-lg hover:bg-hover-surface2 transition-colors" title="Duplicate">
        <Copy className="w-4 h-4" />
      </button>
      <button onClick={() => { deletePage(pageId); onClose(); }}
        className="p-2 text-ink-muted hover:text-hover-danger-text rounded-lg hover:bg-hover-surface2 transition-colors" title="Delete">
        <Trash2 className="w-4 h-4" />
      </button>
      <button onClick={onClose}
        className="p-2 text-ink-muted hover:text-hover-text rounded-lg hover:bg-hover-surface2 transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Header bar (shared across modes) ───────────────────────────────────────

export function ModalHeaderBar({ database, title, pageId, onClose }: {
  database: { icon?: string; name: string };
  title: string;
  pageId: string;
  onClose: () => void;
}) {
  const { deletePage, duplicatePage } = useDatabaseStore.getState();
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-line shrink-0">
      <div className="flex items-center gap-2 text-sm text-ink-muted">
        {database.icon && <span>{database.icon}</span>}
        <span>{database.name}</span>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-ink-body font-medium truncate max-w-[200px]">{title || 'Untitled'}</span>
      </div>
      <ActionButtons pageId={pageId} onClose={onClose} deletePage={deletePage} duplicatePage={duplicatePage} />
    </div>
  );
}

// ─── Page inner content (icon + title + props + blocks + meta) ──────────────

export function PageInnerContent({ page, database, pageId, hPad }: {
  page: { icon?: string; properties: Record<string, unknown>; createdAt: string; updatedAt: string };
  database: { titlePropertyId: string; properties: Record<string, SchemaProperty>; icon?: string; name: string };
  pageId: string;
  hPad: string;
}) {
  const { updatePageProperty } = useDatabaseStore.getState();
  const title = (page.properties[database.titlePropertyId] as string) || '';
  const nonTitleProps = Object.values(database.properties).filter(p => p.id !== database.titlePropertyId);

  return (
    <div className="flex-1 overflow-auto">
      {/* Icon + Title */}
      <div className={`${hPad} pt-8 pb-4`}>
        <div className="flex items-center gap-3 mb-2">
          {page.icon && <span className="text-4xl">{page.icon}</span>}
        </div>
        <input
          type="text"
          value={title}
          onChange={e => updatePageProperty(pageId, database.titlePropertyId, e.target.value)}
          className="w-full text-3xl font-bold text-ink placeholder:text-ink-disabled outline-none border-none"
          placeholder="Untitled"
        />
      </div>

      {/* Properties */}
      <div className={`${hPad} pb-6`}>
        <div className="flex flex-col gap-2">
          {nonTitleProps.map(prop => (
            <PropertyRow key={prop.id} prop={prop} page={page as Page} pageId={pageId} database={database as DatabaseSchema} />
          ))}
        </div>
      </div>

      <div className={hPad}><div className="border-t border-line" /></div>

      <div className={`${hPad} py-6`}>
        <PageContentEditor pageId={pageId} />
      </div>

      <div className={`${hPad} pb-8`}>
        <div className="text-xs text-ink-muted flex flex-col gap-1">
          <span>Created: {format(parseISO(page.createdAt), 'MMM d, yyyy h:mm a')}</span>
          <span>Updated: {format(parseISO(page.updatedAt), 'MMM d, yyyy h:mm a')}</span>
        </div>
      </div>
    </div>
  );
}
