/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ViewTabMenu.tsx                                     :+:      :+:    :+:  */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── ViewTabMenu — the Notion per-view panel behind a view tab ──────────────
// One panel, three triggers (ViewTabsRow): click the ACTIVE tab, second click
// after selecting, or RIGHT-click any tab directly. Every action binds to the
// clicked view — not the active one.

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronRight, Paintbrush, Trash2 } from 'lucide-react';
import { PencilIcon, LayoutIcon, CopyLinkIcon, ExternalLinkIcon, EyeSlashIcon, DuplicateIcon } from '../ui/Icons';
import type { ViewConfig } from '../../types/views';
import { cn } from '../../utils/cn';

export type TabDisplayMode = 'text_icon' | 'text' | 'icon';

const DISPLAY_OPTIONS: readonly { id: TabDisplayMode; label: string }[] = [
  { id: 'text_icon', label: 'Text and icon' },
  { id: 'text', label: 'Text only' },
  { id: 'icon', label: 'Icon only' },
];

const ROW = 'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-ink-body hover:bg-hover-surface transition-colors';
const MENU_WIDTH = 230;

interface ViewTabMenuProps {
  view: ViewConfig;
  position: { top: number; left: number };
  canDelete: boolean;
  /** Data source line on the Source row (database icon + name). */
  sourceName: string;
  sourceIcon?: string;
  onClose: () => void;
  onRename: () => void;
  onEditView: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onViewSource?: () => void;
  onToggleSourceTitle: () => void;
  onDisplayAs: (mode: TabDisplayMode) => void;
}

/** Notion view-tab panel: Rename · Display as ▸ · Edit view · Source |
 *  Copy link · Open source database · Hide data source titles |
 *  Duplicate · Delete. */
export function ViewTabMenu({
  view, position, canDelete, sourceName, sourceIcon,
  onClose, onRename, onEditView, onDuplicate, onDelete,
  onViewSource, onToggleSourceTitle, onDisplayAs,
}: Readonly<ViewTabMenuProps>) {
  const [showDisplayAs, setShowDisplayAs] = useState(false);
  const current: TabDisplayMode = view.settings?.tabDisplay ?? 'text_icon';
  const left = Math.min(Math.max(8, position.left), window.innerWidth - MENU_WIDTH - 12);

  // Document-level Escape: focus usually still sits on the tab button that
  // opened the menu, so an onKeyDown on the panel alone never hears it.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return createPortal(
    <>
      <button type="button" className={cn('fixed inset-0 z-[9998] appearance-none border-0 bg-transparent p-0 cursor-default')}
        onClick={e => { e.stopPropagation(); onClose(); }}
        onMouseDown={e => e.stopPropagation()}
        onContextMenu={e => { e.preventDefault(); e.stopPropagation(); onClose(); }}
        tabIndex={-1} aria-label="Close menu" />
      {/* Propagation control (CellPortal rule): the host editor's document
          handlers must never see clicks inside a portaled panel. */}
      <div role="dialog" aria-label={`View options for ${view.name}`} data-testid="view-tab-menu" // NOSONAR - propagation control
        className={cn('fixed z-[9999] w-[230px] bg-surface-primary border border-line rounded-xl shadow-xl overflow-y-auto')}
        style={{ top: position.top, left, maxHeight: '70vh' }}
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
        onContextMenu={e => { e.preventDefault(); e.stopPropagation(); }}
        onKeyDown={e => { if (e.key === 'Escape') onClose(); }}>
        <div className={cn('p-1 flex flex-col gap-px')}>
          <button onClick={onRename} className={cn(ROW)}>
            <PencilIcon className={cn('w-4 h-4')} /> Rename
          </button>
          <button onClick={() => setShowDisplayAs(s => !s)} aria-expanded={showDisplayAs} className={cn(ROW)}>
            <Paintbrush className={cn('w-4 h-4')} />
            <span className={cn('flex-1 text-left')}>Display as</span>
            <ChevronRight className={cn(`w-3.5 h-3.5 text-ink-muted transition-transform ${showDisplayAs ? 'rotate-90' : ''}`)} />
          </button>
          {showDisplayAs && (
            <div className={cn('ml-4 pl-1.5 border-l border-line-light flex flex-col gap-px py-0.5')}>
              {DISPLAY_OPTIONS.map(opt => (
                <button key={opt.id} onClick={() => onDisplayAs(opt.id)} className={cn(ROW)}>
                  <span className={cn('flex-1 text-left')}>{opt.label}</span>
                  {current === opt.id && <Check className={cn('w-3.5 h-3.5 text-accent-text-soft')} />}
                </button>
              ))}
              <div className={cn('px-2.5 py-1 text-xs text-ink-muted select-none')}>Only applies to you</div>
            </div>
          )}
          <button onClick={onEditView} className={cn(ROW)}>
            <LayoutIcon className={cn('w-4 h-4')} /> Edit view
          </button>
          <button onClick={() => { onViewSource?.(); onClose(); }} className={cn(ROW)}>
            <ExternalLinkIcon className={cn('w-4 h-4')} />
            <span className={cn('flex-1 text-left')}>Source</span>
            <span className={cn('text-xs text-ink-muted truncate max-w-[86px]')}>{sourceIcon ? `${sourceIcon} ` : ''}{sourceName}</span>
            <ChevronRight className={cn('w-3 h-3 text-ink-muted shrink-0')} />
          </button>
        </div>
        <div className={cn('mx-3 h-px bg-surface-tertiary')} />
        <div className={cn('p-1 flex flex-col gap-px')}>
          <button onClick={() => { navigator.clipboard?.writeText(`${globalThis.location.href}?view=${view.id}`); onClose(); }} className={cn(ROW)}>
            <CopyLinkIcon className={cn('w-4 h-4')} /> Copy link to view
          </button>
          <button onClick={() => { onViewSource?.(); onClose(); }} className={cn(ROW)}>
            <ExternalLinkIcon className={cn('w-4 h-4')} /> Open source database
          </button>
          <button onClick={() => { onToggleSourceTitle(); onClose(); }} className={cn(ROW)}>
            <EyeSlashIcon className={cn('w-4 h-4')} />
            <span className={cn('flex-1 text-left')}>
              {view.settings?.showTitle === false ? 'Show data source titles' : 'Hide data source titles'}
            </span>
          </button>
        </div>
        <div className={cn('mx-3 h-px bg-surface-tertiary')} />
        <div className={cn('p-1 flex flex-col gap-px')}>
          <button onClick={onDuplicate} className={cn(ROW)}>
            <DuplicateIcon className={cn('w-4 h-4')} /> Duplicate view
          </button>
          {canDelete && (
            <button onClick={onDelete} className={cn('w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-danger-text hover:bg-hover-danger transition-colors')}>
              <Trash2 className={cn('w-4 h-4')} /> Delete view
            </button>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}
