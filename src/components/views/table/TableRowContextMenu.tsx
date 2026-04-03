/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   TableRowContextMenu.tsx                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:38:48 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 13:36:40 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { ExternalLink, Copy, Trash2 } from 'lucide-react';
import { cn } from '../../../utils/cn';

interface TableRowContextMenuProps {
  rowMenu: { pageId: string; x: number; y: number };
  onClose: () => void;
  openPage: (pageId: string) => void;
  duplicatePage: (pageId: string) => void;
  deletePage: (pageId: string) => void;
}

/** Renders a fixed-position context menu for table row actions (open, duplicate, delete). */
export function TableRowContextMenu({
  rowMenu, onClose, openPage, duplicatePage, deletePage,
}: Readonly<TableRowContextMenuProps>) {
  return (
    <>
      <button type="button" className={cn("fixed inset-0 z-40 appearance-none border-0 bg-transparent p-0 cursor-default")} onClick={onClose} tabIndex={-1} aria-label="Close" />
      <div
        className={cn("fixed z-50 min-w-[160px] bg-surface-primary rounded-lg p-1 shadow-xl border border-line text-sm")}
        style={{ left: rowMenu.x, top: rowMenu.y }}
      >
        <button onClick={() => { openPage(rowMenu.pageId); onClose(); }}
          className={cn("flex items-center gap-2 px-2 py-1.5 hover:bg-hover-surface rounded cursor-pointer w-full text-left")}>
          <ExternalLink className={cn("w-4 h-4 text-ink-muted")} /> Open page
        </button>
        <button onClick={() => { duplicatePage(rowMenu.pageId); onClose(); }}
          className={cn("flex items-center gap-2 px-2 py-1.5 hover:bg-hover-surface rounded cursor-pointer w-full text-left")}>
          <Copy className={cn("w-4 h-4 text-ink-muted")} /> Duplicate
        </button>
        <div className={cn("h-px bg-surface-tertiary my-1")} />
        <button onClick={() => { deletePage(rowMenu.pageId); onClose(); }}
          className={cn("flex items-center gap-2 px-2 py-1.5 hover:bg-hover-danger rounded cursor-pointer w-full text-left text-danger-text")}>
          <Trash2 className={cn("w-4 h-4")} /> Delete
        </button>
      </div>
    </>
  );
}

