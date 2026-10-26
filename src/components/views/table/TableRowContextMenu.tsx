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
import { createPortal } from 'react-dom';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ExternalLink, Copy, Trash2 } from 'lucide-react';
import { cn } from '../../../utils/cn';

interface TableRowContextMenuProps {
  rowMenu: { pageId: string; x: number; y: number };
  onClose: () => void;
  openPage: (pageId: string) => void;
  duplicatePage: (pageId: string) => void;
  deletePage: (pageId: string) => void;
  /** Where focus goes when the menu closes (the grid, so arrows keep working). */
  returnFocusRef: React.RefObject<HTMLElement | null>;
}

const ITEM = 'flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer w-full text-left outline-none';

/** Row actions (open, duplicate, delete) at a point: the row-options button or
 *  the selected cell for Shift+F10. Radix gives it menu roles, arrow/typeahead
 *  focus, Escape, and keeps it inside the viewport. */
export function TableRowContextMenu({
  rowMenu, onClose, openPage, duplicatePage, deletePage, returnFocusRef,
}: Readonly<TableRowContextMenuProps>) {
  return (
    <DropdownMenu.Root open modal={false} onOpenChange={open => { if (!open) onClose(); }}>
      {/* Anchor and menu are portaled: host pages size-contain, trapping
          position:fixed descendants. */}
      {createPortal(
        <DropdownMenu.Trigger asChild>
          <span aria-hidden className={cn('fixed w-0 h-0')} style={{ left: rowMenu.x, top: rowMenu.y }} />
        </DropdownMenu.Trigger>,
        document.body,
      )}
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="start" sideOffset={2} collisionPadding={8}
          onCloseAutoFocus={e => { e.preventDefault(); returnFocusRef.current?.focus({ preventScroll: true }); }}
          className={cn('z-50 min-w-[160px] bg-surface-primary rounded-lg p-1 shadow-xl border border-line text-sm')}>
          <DropdownMenu.Item onSelect={() => openPage(rowMenu.pageId)}
            className={cn(`${ITEM} data-[highlighted]:bg-hover-surface`)}>
            <ExternalLink className={cn('w-4 h-4 text-ink-muted')} /> Open page
          </DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => duplicatePage(rowMenu.pageId)}
            className={cn(`${ITEM} data-[highlighted]:bg-hover-surface`)}>
            <Copy className={cn('w-4 h-4 text-ink-muted')} /> Duplicate
          </DropdownMenu.Item>
          <DropdownMenu.Separator className={cn('h-px bg-surface-tertiary my-1')} />
          <DropdownMenu.Item onSelect={() => deletePage(rowMenu.pageId)}
            className={cn(`${ITEM} text-danger-text data-[highlighted]:bg-hover-danger`)}>
            <Trash2 className={cn('w-4 h-4')} /> Delete
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
