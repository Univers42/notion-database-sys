/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   MenuComponents.tsx                                 :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:36:53 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/03 16:15:43 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Trash2, MoreHorizontal, Download, Upload, Printer, ChevronDown,
} from 'lucide-react';
import {
  CopyLinkIcon, DuplicateIcon, ExternalLinkIcon, PencilIcon,
  EmojiFaceIcon, LayoutIcon, EyeSlashIcon,
} from '../ui/Icons';
import { ActionPanel, type PanelSection } from '../ui/ActionPanel';
import { useOutsideClick } from '../../hooks/useOutsideClick';

// ─── Extra actions menu (··· in top-right) ───────────────────────────────────

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
        { icon: <Download className="w-[18px] h-[18px]" />, label: 'Export', onClick: onClose },
        { icon: <Upload className="w-[18px] h-[18px]" />, label: 'Import', onClick: onClose },
        { icon: <Printer className="w-[18px] h-[18px]" />, label: 'Print', onClick: onClose },
      ],
    },
    {
      items: [
        { icon: <Trash2 className="w-[18px] h-[18px]" />, label: 'Delete database', danger: true, onClick: onClose },
      ],
    },
  ], [onClose]);

  return (
    <div className="relative" ref={ref}>
      <button onClick={onToggle}
        className={`p-2 text-ink-secondary hover:text-hover-text-strong hover:bg-hover-surface rounded-lg transition-colors ${show ? 'bg-surface-tertiary' : ''}`}
        title="More actions">
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {show && (
        <div className="absolute top-full right-0 mt-1 z-50">
          <ActionPanel sections={sections} width={220} />
        </div>
      )}
    </div>
  );
}

// ─── View dots menu (··· in view tabs row) ───────────────────────────────────

export function ViewDotsMenu({
  show, onToggle, onClose, containerRef,
  onDuplicate, onEditTitle, onEditLayout, isHoverVisible: _isHoverVisible,
}: Readonly<{
  show: boolean; onToggle: () => void; onClose: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onDuplicate: () => void; onEditTitle: () => void; onEditLayout: () => void;
  isHoverVisible: boolean;
}>) {
  const sections: PanelSection[] = useMemo(() => [
    {
      items: [
        { icon: <CopyLinkIcon />, label: 'Copy link to view', onClick: onClose },
        { icon: <DuplicateIcon />, label: 'Duplicate view', onClick: onDuplicate },
      ],
    },
    {
      items: [
        { icon: <ExternalLinkIcon />, label: 'View data source', onClick: onClose },
        { icon: <PencilIcon />, label: 'Edit title', onClick: onEditTitle },
        { icon: <EmojiFaceIcon />, label: 'Edit icon', onClick: onClose },
        { icon: <LayoutIcon />, label: 'Edit layout', onClick: onEditLayout },
      ],
    },
    {
      items: [
        { icon: <EyeSlashIcon />, label: 'Hide title', onClick: onClose },
      ],
    },
  ], [onClose, onDuplicate, onEditTitle, onEditLayout]);

  return (
    <div className="relative" ref={containerRef}>
      <button onClick={onToggle}
        className={`flex items-center px-1.5 py-1.5 text-sm rounded-lg transition-all
          ${show
            ? 'bg-surface-tertiary text-ink-body-light opacity-100'
            : 'text-ink-muted hover:text-hover-text hover:bg-hover-surface opacity-0 group-hover/header:opacity-100'
          }`}>
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {show && (
        <div className="absolute top-full left-0 mt-1 z-50">
          <ActionPanel sections={sections} width={240} />
        </div>
      )}
    </div>
  );
}

// ─── Active view context menu (portal) ──────────────────────────────────────

export function ActiveViewMenu({
  show, onClose, btnRef, menuRef, view, dbViewsLength,
  onRename, onEditView, onDuplicate, onDelete,
}: {
  show: boolean; onClose: () => void;
  btnRef: React.RefObject<HTMLButtonElement | null>;
  menuRef: React.RefObject<HTMLDivElement | null>;
  view: { id: string; name: string };
  dbViewsLength: number;
  onRename: () => void; onEditView: () => void;
  onDuplicate: () => void; onDelete: () => void;
}) {
  useOutsideClick(menuRef, show, onClose);

  if (!show || !btnRef.current) return null;
  const btnRect = btnRef.current.getBoundingClientRect();

  return createPortal(
    <>
      <button type="button" className="fixed inset-0 z-[9998] appearance-none border-0 bg-transparent p-0 cursor-default" onClick={onClose} tabIndex={-1} aria-label="Close menu" />
      <div ref={menuRef}
        className="fixed z-[9999] w-[220px] bg-surface-primary border border-line rounded-xl shadow-xl overflow-hidden"
        style={{ top: btnRect.bottom + 4, left: btnRect.left }}>
        <div className="flex flex-col">
          <div className="p-1 flex flex-col gap-px">
            <button onClick={onRename}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-ink-body hover:bg-hover-surface transition-colors">
              <PencilIcon className="w-4 h-4" /> Rename
            </button>
            <button onClick={onEditView}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-ink-body hover:bg-hover-surface transition-colors">
              <LayoutIcon className="w-4 h-4" /> Edit view
            </button>
            <button onClick={onClose}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-ink-body hover:bg-hover-surface transition-colors">
              <ExternalLinkIcon className="w-4 h-4" />
              <span className="flex-1 text-left">Source</span>
              <ChevronDown className="w-3 h-3 text-ink-muted -rotate-90" />
            </button>
          </div>
          <div className="mx-3 h-px bg-surface-tertiary" />
          <div className="p-1 flex flex-col gap-px">
            <button onClick={() => { navigator.clipboard?.writeText(globalThis.location.href + '?view=' + view.id); onClose(); }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-ink-body hover:bg-hover-surface transition-colors">
              <CopyLinkIcon className="w-4 h-4" /> Copy link to view
            </button>
            <button onClick={onClose}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-ink-body hover:bg-hover-surface transition-colors">
              <ExternalLinkIcon className="w-4 h-4" /> Open source database
            </button>
            <button onClick={onClose}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-ink-body hover:bg-hover-surface transition-colors">
              <EyeSlashIcon className="w-4 h-4" /> Hide data source titles
            </button>
          </div>
          <div className="mx-3 h-px bg-surface-tertiary" />
          <div className="p-1 flex flex-col gap-px">
            <button onClick={onDuplicate}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-ink-body hover:bg-hover-surface transition-colors">
              <DuplicateIcon className="w-4 h-4" /> Duplicate view
            </button>
            {dbViewsLength > 1 && (
              <button onClick={onDelete}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-danger-text hover:bg-hover-danger transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Delete view
              </button>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
