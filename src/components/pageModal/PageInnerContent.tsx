/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   PageInnerContent.tsx                               :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:39:30 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 16:30:13 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState, useCallback } from 'react';
import { X, Copy, Trash2, ChevronRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useStoreApi } from '../../store/dbms/hardcoded/useDatabaseStore';
import { PropertyRow } from '../PropertyRow';
import { PageContentEditor } from '../PageContentEditor';
import type { Page, DatabaseSchema, SchemaProperty } from '../../types/database';
import { cn } from '../../utils/cn';

/** Renders duplicate, delete, and close action buttons for the page modal header. */
export function ActionButtons({ pageId, onClose, deletePage, duplicatePage }: Readonly<{
  pageId: string;
  onClose: () => void;
  deletePage: (id: string) => void;
  duplicatePage: (id: string) => void;
}>) {
  return (
    <div className={cn("flex items-center gap-1")}>
      <button onClick={() => duplicatePage(pageId)}
        className={cn("p-2 text-ink-muted hover:text-hover-text rounded-lg hover:bg-hover-surface2 transition-colors")} title="Duplicate">
        <Copy className={cn("w-4 h-4")} />
      </button>
      <button onClick={() => { deletePage(pageId); onClose(); }}
        className={cn("p-2 text-ink-muted hover:text-hover-danger-text rounded-lg hover:bg-hover-surface2 transition-colors")} title="Delete">
        <Trash2 className={cn("w-4 h-4")} />
      </button>
      <button onClick={onClose}
        className={cn("p-2 text-ink-muted hover:text-hover-text rounded-lg hover:bg-hover-surface2 transition-colors")}>
        <X className={cn("w-4 h-4")} />
      </button>
    </div>
  );
}

/** Renders the top header bar shared across page modal modes (breadcrumb + actions). */
export function ModalHeaderBar({ database, title, pageId, onClose }: Readonly<{
  database: { icon?: string; name: string };
  title: string;
  pageId: string;
  onClose: () => void;
}>) {
  const { deletePage, duplicatePage } = useStoreApi().getState();
  return (
    <div className={cn("flex items-center justify-between px-6 py-4 border-b border-line shrink-0")}>
      <div className={cn("flex items-center gap-2 text-sm text-ink-muted")}>
        {database.icon && <span>{database.icon}</span>}
        <span>{database.name}</span>
        <ChevronRight className={cn("w-3.5 h-3.5")} />
        <span className={cn("text-ink-body font-medium truncate max-w-[200px]")}>{title || 'Untitled'}</span>
      </div>
      <ActionButtons pageId={pageId} onClose={onClose} deletePage={deletePage} duplicatePage={duplicatePage} />
    </div>
  );
}

/** Renders the page body: icon, editable title, properties, content editor, and metadata footer. */
export function PageInnerContent({ page, database, pageId, hPad }: Readonly<{
  page: { icon?: string; properties: Record<string, unknown>; createdAt: string; updatedAt: string };
  database: { titlePropertyId: string; properties: Record<string, SchemaProperty>; icon?: string; name: string };
  pageId: string;
  hPad: string;
}>) {
  const { updatePageProperty } = useStoreApi().getState();
  const titleValue = (page.properties[database.titlePropertyId] as string) || '';
  const [localTitle, setLocalTitle] = useState(titleValue);
  const commitTitle = useCallback(() => {
    if (localTitle !== titleValue) {
      updatePageProperty(pageId, database.titlePropertyId, localTitle);
    }
  }, [localTitle, titleValue, pageId, database.titlePropertyId, updatePageProperty]);
  const nonTitleProps = Object.values(database.properties).filter(p => p.id !== database.titlePropertyId);

  return (
    <div className={cn("flex-1 overflow-auto")}>
      {/* Icon + Title */}
      <div className={cn(`${hPad} pt-8 pb-4`)}>
        <div className={cn("flex items-center gap-3 mb-2")}>
          {page.icon && <span className={cn("text-4xl")}>{page.icon}</span>}
        </div>
        <input
          type="text"
          value={localTitle}
          onChange={e => setLocalTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={e => { if (e.key === 'Enter') commitTitle(); }}
          className={cn("w-full text-3xl font-bold text-ink placeholder:text-ink-disabled outline-none border-none")}
          placeholder="Untitled"
        />
      </div>

      {/* Properties */}
      <div className={cn(`${hPad} pb-6`)}>
        <div className={cn("flex flex-col gap-2")}>
          {nonTitleProps.map(prop => (
            <PropertyRow key={prop.id} prop={prop} page={page as Page} pageId={pageId} database={database as DatabaseSchema} />
          ))}
        </div>
      </div>

      <div className={hPad}><div className={cn("border-t border-line")} /></div>

      <div className={cn(`${hPad} py-6`)}>
        <PageContentEditor pageId={pageId} />
      </div>

      <div className={cn(`${hPad} pb-8`)}>
        <div className={cn("text-xs text-ink-muted flex flex-col gap-1")}>
          <span>Created: {format(parseISO(page.createdAt), 'MMM d, yyyy h:mm a')}</span>
          <span>Updated: {format(parseISO(page.updatedAt), 'MMM d, yyyy h:mm a')}</span>
        </div>
      </div>
    </div>
  );
}
