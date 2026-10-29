/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   MenuComponents.tsx                                 :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:36:53 by dlesieur          #+#    #+#             */
/*   Updated: 2026/10/29 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useRef, useMemo, useState } from 'react';
import {
  Trash2, MoreHorizontal, Download, Upload, Printer,
} from 'lucide-react';
import {
  CopyLinkIcon, DuplicateIcon, ExternalLinkIcon, PencilIcon,
  EmojiFaceIcon, LayoutIcon, EyeSlashIcon,
} from '../ui/Icons';
import { ActionPanel, type PanelItem, type PanelSection } from '../ui/ActionPanel';
import { LOCKED_VIEW_NOTE, type ViewTabLocks } from './ViewTabMenu';
import { useOutsideClick } from '../../hooks/useOutsideClick';
import { cn } from '../../utils/cn';

/** Renders the "more actions" dropdown menu (duplicate, export, import, print, delete). */
export function ExtraActionsMenu({ show, onToggle, onClose }: Readonly<{
  show: boolean; onToggle: () => void; onClose: () => void;
}>) {
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClick(ref, show, onClose);

  const sections: PanelSection[] = useMemo(() => [
    {
      items: [
        { icon: <DuplicateIcon />, label: 'Duplicate database', onClick: onClose },
        { icon: <CopyLinkIcon />, label: 'Copy link', onClick: onClose },
        { icon: <Download className={cn("w-[18px] h-[18px]")} />, label: 'Export', onClick: onClose },
        { icon: <Upload className={cn("w-[18px] h-[18px]")} />, label: 'Import', onClick: onClose },
        { icon: <Printer className={cn("w-[18px] h-[18px]")} />, label: 'Print', onClick: onClose },
      ],
    },
    {
      items: [
        { icon: <Trash2 className={cn("w-[18px] h-[18px]")} />, label: 'Delete database', danger: true, onClick: onClose },
      ],
    },
  ], [onClose]);

  return (
    <div className={cn("relative")} ref={ref}>
      <button onClick={onToggle}
        className={cn(`p-2 text-ink-secondary hover:text-hover-text-strong hover:bg-hover-surface rounded-lg transition-colors ${show ? 'bg-surface-tertiary' : ''}`)}
        title="More actions">
        <MoreHorizontal className={cn("w-4 h-4")} />
      </button>
      {show && (
        <div className={cn("absolute top-full right-0 mt-1 z-50")}>
          <ActionPanel sections={sections} width={220} />
        </div>
      )}
    </div>
  );
}

const ICON_CHOICES = [
  '📊', '📋', '🗂️', '📁', '🗃️', '📈', '🧮', '📅', '✅', '📝', '🎯', '🏷️',
  '👥', '💼', '🛒', '📦', '💡', '🧪', '🚀', '⭐', '🔥', '🧭', '🗺️', '🎨',
];

/** Compact emoji grid for the database icon (opens from "Edit icon"). */
function IconGrid({ onPick }: Readonly<{ onPick: (icon: string) => void }>) {
  return (
    <div className={cn("grid grid-cols-6 gap-0.5 p-2")}>
      {ICON_CHOICES.map((emoji) => (
        <button key={emoji} type="button" onClick={() => onPick(emoji)} aria-label={`Set icon ${emoji}`}
          className={cn("flex h-8 w-8 items-center justify-center rounded-lg text-lg hover:bg-hover-surface transition-colors")}>
          {emoji}
        </button>
      ))}
    </div>
  );
}

const UNLOCKED: ViewTabLocks = { view: false, settings: false, database: false };
const unless = (locked: boolean, ...items: PanelItem[]): PanelItem[] => locked ? [] : items;

/** Renders the per-view context menu in the view tabs row (rename, duplicate, delete).
 *  A lock drops the entries it refuses and says so. */
export function ViewDotsMenu({
  show, onToggle, onClose, containerRef,
  onDuplicate, onEditTitle, onEditLayout, isHoverVisible: _isHoverVisible,
  viewId, onViewSource, onSetIcon, onToggleTitle, titleHidden, locks = UNLOCKED,
}: Readonly<{
  show: boolean; onToggle: () => void; onClose: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onDuplicate: () => void; onEditTitle: () => void; onEditLayout: () => void;
  isHoverVisible: boolean;
  /** Active view id — enables "Copy link to view". */
  viewId?: string;
  /** Open the database's origin surface ("View data source"). */
  onViewSource?: () => void;
  /** Set the database icon (emoji) — enables "Edit icon". */
  onSetIcon?: (icon: string) => void;
  /** Toggle the inline title visibility ("Hide title"/"Show title"). */
  onToggleTitle?: () => void;
  titleHidden?: boolean;
  locks?: ViewTabLocks;
}>) {
  const [showIconGrid, setShowIconGrid] = useState(false);

  const sections: PanelSection[] = useMemo(() => [
    {
      items: [
        {
          icon: <CopyLinkIcon />, label: 'Copy link to view',
          onClick: () => {
            if (viewId) navigator.clipboard?.writeText(globalThis.location.href + '?view=' + viewId);
            onClose();
          },
        },
        ...unless(locks.database, { icon: <DuplicateIcon />, label: 'Duplicate view', onClick: onDuplicate }),
      ],
    },
    {
      items: [
        {
          icon: <ExternalLinkIcon />, label: 'View data source',
          onClick: () => { onViewSource?.(); onClose(); },
        },
        ...unless(locks.database,
          { icon: <PencilIcon />, label: 'Edit title', onClick: onEditTitle },
          { icon: <EmojiFaceIcon />, label: 'Edit icon', onClick: onSetIcon ? () => setShowIconGrid(true) : onClose },
        ),
        ...unless(locks.settings, { icon: <LayoutIcon />, label: 'Edit layout', onClick: onEditLayout }),
      ],
    },
    {
      items: locks.view ? [{ type: 'info', lines: [LOCKED_VIEW_NOTE] }] : [{
        icon: <EyeSlashIcon />, label: titleHidden ? 'Show title' : 'Hide title',
        onClick: () => { onToggleTitle?.(); onClose(); },
      }],
    },
  ], [onClose, onDuplicate, onEditTitle, onEditLayout, viewId, onViewSource, onSetIcon, onToggleTitle, titleHidden,
    locks.view, locks.settings, locks.database]);

  return (
    <div className={cn("relative")} ref={containerRef}>
      <button onClick={() => { setShowIconGrid(false); onToggle(); }} aria-label="More options"
        className={cn(`flex items-center px-1.5 py-1.5 text-sm rounded-lg transition-all
          ${show
            ? 'bg-surface-tertiary text-ink-body-light opacity-100'
            : 'text-ink-muted hover:text-hover-text hover:bg-hover-surface opacity-0 group-hover/header:opacity-100'
          }`)}>
        <MoreHorizontal className={cn("w-4 h-4")} />
      </button>
      {show && (
        <div className={cn("absolute top-full left-0 mt-1 z-50")}>
          {showIconGrid && onSetIcon ? (
            <div className={cn("bg-surface-primary border border-line rounded-xl shadow-lg overflow-hidden")}>
              <IconGrid onPick={(icon) => { onSetIcon(icon); setShowIconGrid(false); onClose(); }} />
            </div>
          ) : (
            <ActionPanel sections={sections} width={240} />
          )}
        </div>
      )}
    </div>
  );
}
