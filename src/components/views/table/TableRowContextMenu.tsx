/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   TableRowContextMenu.tsx                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:38:48 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 17:37:08 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { ExternalLink, Copy, Trash2 } from 'lucide-react';

interface TableRowContextMenuProps {
  rowMenu: { pageId: string; x: number; y: number };
  onClose: () => void;
  openPage: (pageId: string) => void;
  duplicatePage: (pageId: string) => void;
  deletePage: (pageId: string) => void;
}

export function TableRowContextMenu({
  rowMenu, onClose, openPage, duplicatePage, deletePage,
}: TableRowContextMenuProps) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 min-w-[160px] bg-surface-primary rounded-lg p-1 shadow-xl border border-line text-sm"
        style={{ left: rowMenu.x, top: rowMenu.y }}
      >
        <button onClick={() => { openPage(rowMenu.pageId); onClose(); }}
          className="flex items-center gap-2 px-2 py-1.5 hover:bg-hover-surface rounded cursor-pointer w-full text-left">
          <ExternalLink className="w-4 h-4 text-ink-muted" /> Open page
        </button>
        <button onClick={() => { duplicatePage(rowMenu.pageId); onClose(); }}
          className="flex items-center gap-2 px-2 py-1.5 hover:bg-hover-surface rounded cursor-pointer w-full text-left">
          <Copy className="w-4 h-4 text-ink-muted" /> Duplicate
        </button>
        <div className="h-px bg-surface-tertiary my-1" />
        <button onClick={() => { deletePage(rowMenu.pageId); onClose(); }}
          className="flex items-center gap-2 px-2 py-1.5 hover:bg-hover-danger rounded cursor-pointer w-full text-left text-danger-text">
          <Trash2 className="w-4 h-4" /> Delete
        </button>
      </div>
    </>
  );
}

