/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   FullPageView.tsx                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:39:30 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 16:30:13 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { useStoreApi } from '../../store/dbms/hardcoded/useDatabaseStore';
import { ActionButtons, PageInnerContent } from './PageInnerContent';
import type { Page, DatabaseSchema } from '../../types/database';
import { cn } from '../../utils/cn';

const CONTENT_WIDTHS = { narrow: 640, default: 896, wide: 1152, full: -1 } as const;
type ContentWidth = keyof typeof CONTENT_WIDTHS;

/** Renders a page as a full-screen view with adjustable content width. */
export function FullPageView({ page, database, pageId, onClose }: Readonly<{
  page: Page;
  database: DatabaseSchema;
  pageId: string;
  onClose: () => void;
}>) {
  const { deletePage, duplicatePage } = useStoreApi().getState();
  const title = (page.properties[database.titlePropertyId] as string) || 'Untitled';
  const [contentWidth, setContentWidth] = useState<ContentWidth>('default');
  const fullPageMaxW = contentWidth === 'full' ? 'none' : `${CONTENT_WIDTHS[contentWidth]}px`;

  return (
    <div className={cn("fixed inset-0 z-50 bg-surface-primary flex flex-col animate-in fade-in duration-150")}>
      <FullPageHeader
        database={database}
        title={title}
        pageId={pageId}
        onClose={onClose}
        contentWidth={contentWidth}
        setContentWidth={setContentWidth}
        deletePage={deletePage}
        duplicatePage={duplicatePage}
      />
      <div className={cn("flex-1 overflow-auto")}>
        <div className={cn("mx-auto transition-all duration-200")} style={{ maxWidth: fullPageMaxW }}>
          <PageInnerContent page={page} database={database} pageId={pageId} hPad="px-16" />
        </div>
      </div>
    </div>
  );
}

function FullPageHeader({ database, title, pageId, onClose, contentWidth, setContentWidth, deletePage, duplicatePage }: Readonly<{
  database: { icon?: string; name: string };
  title: string;
  pageId: string;
  onClose: () => void;
  contentWidth: ContentWidth;
  setContentWidth: (w: ContentWidth) => void;
  deletePage: (id: string) => void;
  duplicatePage: (id: string) => void;
}>) {
  return (
    <div className={cn("flex items-center justify-between px-8 py-4 border-b border-line shrink-0")}>
      <div className={cn("flex items-center gap-3 text-sm text-ink-muted")}>
        <button onClick={onClose}
          className={cn("p-1.5 text-ink-muted hover:text-hover-text rounded-lg hover:bg-hover-surface2 transition-colors")} title="Back">
          <ChevronRight className={cn("w-4 h-4 rotate-180")} />
        </button>
        {database.icon && <span className={cn("text-lg")}>{database.icon}</span>}
        <span className={cn("text-ink-secondary")}>{database.name}</span>
        <ChevronRight className={cn("w-3.5 h-3.5")} />
        <span className={cn("text-ink-strong font-medium truncate max-w-[300px]")}>{title || 'Untitled'}</span>
      </div>
      <div className={cn("flex items-center gap-1")}>
        <WidthToggle contentWidth={contentWidth} setContentWidth={setContentWidth} />
        <ActionButtons pageId={pageId} onClose={onClose} deletePage={deletePage} duplicatePage={duplicatePage} />
      </div>
    </div>
  );
}

function WidthToggle({ contentWidth, setContentWidth }: Readonly<{ contentWidth: ContentWidth; setContentWidth: (w: ContentWidth) => void }>) {
  const widths: ContentWidth[] = ['narrow', 'default', 'wide', 'full'];
  const labels: Record<ContentWidth, string> = { narrow: '▕▏', default: '▕ ▏', wide: '▕  ▏', full: '▕   ▏' };
  return (
    <div className={cn("flex items-center border border-line rounded-lg overflow-hidden mr-2")}>
      {widths.map(w => (
        <button
          key={w}
          onClick={() => setContentWidth(w)}
          className={cn(`px-2 py-1 text-xs transition-colors ${contentWidth === w ? 'bg-surface-tertiary text-ink-strong font-medium' : 'text-ink-muted hover:text-hover-text hover:bg-hover-surface'}`)}
          title={`${w.charAt(0).toUpperCase() + w.slice(1)} width`}
        >
          {labels[w]}
        </button>
      ))}
    </div>
  );
}
