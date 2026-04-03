/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   PeekViews.tsx                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:39:30 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/02 23:44:28 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { ModalHeaderBar, PageInnerContent } from './PageInnerContent';
import type { Page, DatabaseSchema } from '../../types/database';
import { cn } from '../../utils/cn';

const MIN_WIDTH = 400;
const MAX_WIDTH_RATIO = 0.92;

// ─── Resize handle ──────────────────────────────────────────────────────────

function ResizeHandle({ side = 'left', isResizing, onMouseDown }: Readonly<{
  side?: 'left' | 'right';
  isResizing: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
}>) {
  return (
    <div
      onMouseDown={onMouseDown}
      className={cn(`absolute top-0 ${side === 'left' ? '-left-1' : '-right-1'} w-2 h-full cursor-col-resize z-10 group`)}
    >
      <div className={cn(`w-0.5 h-full mx-auto transition-colors ${isResizing ? 'bg-accent-vivid' : 'bg-transparent group-hover:bg-accent-moderate'}`)} />
    </div>
  );
}

// ─── Side peek view ─────────────────────────────────────────────────────────

export function SidePeekView({ page, database, pageId, onClose, panelWidth, isResizing, startResize }: Readonly<{
  page: Page;
  database: DatabaseSchema;
  pageId: string;
  onClose: () => void;
  panelWidth: number;
  isResizing: boolean;
  startResize: (e: React.MouseEvent) => void;
}>) {
  const title = (page.properties[database.titlePropertyId] as string) || 'Untitled';
  return (
    <div className={cn("fixed inset-0 z-50 flex justify-end bg-scrim-light")}>
      <button type="button" className={cn("fixed inset-0 appearance-none border-0 bg-transparent p-0 cursor-default")} onClick={onClose} tabIndex={-1} aria-label="Close" />
      <div
        className={cn("relative z-[60] bg-surface-primary shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-200")}
        style={{ width: panelWidth, maxWidth: `${MAX_WIDTH_RATIO * 100}vw`, minWidth: MIN_WIDTH }}
        onClick={e => e.stopPropagation()}
      >
        <ResizeHandle side="left" isResizing={isResizing} onMouseDown={startResize} />
        <ModalHeaderBar database={database} title={title} pageId={pageId} onClose={onClose} />
        <PageInnerContent page={page} database={database} pageId={pageId} hPad="px-12" />
      </div>
    </div>
  );
}

// ─── Center peek view ───────────────────────────────────────────────────────

export function CenterPeekView({ page, database, pageId, onClose, panelWidth, isResizing, startResize }: Readonly<{
  page: Page;
  database: DatabaseSchema;
  pageId: string;
  onClose: () => void;
  panelWidth: number;
  isResizing: boolean;
  startResize: (e: React.MouseEvent) => void;
}>) {
  const title = (page.properties[database.titlePropertyId] as string) || 'Untitled';
  return (
    <div className={cn("fixed inset-0 z-50 flex items-center justify-center bg-scrim-medium")}>
      <button type="button" className={cn("fixed inset-0 appearance-none border-0 bg-transparent p-0 cursor-default")} onClick={onClose} tabIndex={-1} aria-label="Close" />
      <div
        className={cn("relative z-[60] bg-surface-primary rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200")}
        style={{ width: panelWidth, maxWidth: `${MAX_WIDTH_RATIO * 100}vw`, minWidth: MIN_WIDTH, maxHeight: 'calc(100vh - 80px)' }}
        onClick={e => e.stopPropagation()}
      >
        <ResizeHandle side="left" isResizing={isResizing} onMouseDown={startResize} />
        <ResizeHandle side="right" isResizing={isResizing} onMouseDown={startResize} />
        <ModalHeaderBar database={database} title={title} pageId={pageId} onClose={onClose} />
        <PageInnerContent page={page} database={database} pageId={pageId} hPad="px-12" />
      </div>
    </div>
  );
}
