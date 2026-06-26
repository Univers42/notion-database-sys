/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   TemplatesDropdown.tsx                              :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/25 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/25 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState } from 'react';
import { Plus, FileText, MoreHorizontal, Flag, Pencil, Copy, Trash2, HelpCircle } from 'lucide-react';
import { Dropdown } from './Dropdown';
import { cn } from '../../utils/cn';
import type { ObjectDatabaseTemplatesController } from '../../component/types';

interface RowMenuProps {
  onSetDefault: () => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
}

/** The per-row `···` menu (Set as default / Edit / Duplicate / Delete). */
function RowMenu({ onSetDefault, onEdit, onDuplicate, onDelete }: Readonly<RowMenuProps>) {
  const [open, setOpen] = useState(false);
  const item = (icon: React.ReactNode, label: string, run: () => void, danger = false) => (
    <button onClick={(e) => { e.stopPropagation(); setOpen(false); run(); }}
      className={cn(`flex w-full items-center gap-2 px-3 py-1.5 text-sm transition-colors ${danger ? 'text-danger-text hover:bg-hover-danger' : 'text-ink-body hover:bg-hover-surface'}`)}>
      {icon}<span>{label}</span>
    </button>
  );
  return (
    <span className={cn('relative')}>
      <button aria-label="Template actions" onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className={cn('rounded p-1 text-ink-muted hover:bg-hover-surface3 hover:text-ink-body transition-colors')}>
        <MoreHorizontal className={cn('h-3.5 w-3.5')} />
      </button>
      {open && (
        <Dropdown onClose={() => setOpen(false)} className={cn('left-auto right-0 w-44 py-1')}>
          {item(<Flag className={cn('h-3.5 w-3.5')} />, 'Set as default', onSetDefault)}
          {onEdit && item(<Pencil className={cn('h-3.5 w-3.5')} />, 'Edit', onEdit)}
          {onDuplicate && item(<Copy className={cn('h-3.5 w-3.5')} />, 'Duplicate', onDuplicate)}
          {onDelete && item(<Trash2 className={cn('h-3.5 w-3.5')} />, 'Delete', onDelete, true)}
        </Dropdown>
      )}
    </span>
  );
}

interface Props {
  databaseName: string;
  templates: ObjectDatabaseTemplatesController;
  onCreateBlank: () => void;
  onClose: () => void;
}

/** The "Templates for <db>" panel under the split New button's chevron. */
export function TemplatesDropdown({ databaseName, templates, onCreateBlank, onClose }: Readonly<Props>) {
  const run = (fn: () => void) => { onClose(); fn(); };
  const hasDefault = templates.list.some((t) => t.isDefault);
  const rowWrap = cn('flex items-center gap-1 pr-2 hover:bg-hover-surface');
  const rowBtn = cn('flex flex-1 items-center gap-2 px-3 py-2 text-left text-sm text-ink-body');
  const badge = <span className={cn('rounded bg-surface-tertiary px-1.5 py-0.5 text-[10px] font-medium text-ink-muted')}>Default</span>;

  return (
    <Dropdown onClose={onClose} className={cn('left-auto right-0 w-72')}>
      <div className={cn('flex items-center justify-between px-3 pb-1 pt-2')}>
        <span className={cn('text-xs text-ink-muted')}>Templates for {databaseName}</span>
        <HelpCircle className={cn('h-3.5 w-3.5 text-ink-muted')} />
      </div>

      <div className={rowWrap}>
        <button onClick={() => run(onCreateBlank)} className={rowBtn}>
          <FileText className={cn('h-4 w-4 text-ink-muted')} /><span>Empty</span>
        </button>
        {!hasDefault && badge}
        <RowMenu onSetDefault={() => templates.onSetDefault('')} />
      </div>

      {templates.list.map((t) => (
        <div key={t.id} className={rowWrap}>
          <button onClick={() => run(() => templates.onCreateFrom(t.id))} className={rowBtn}>
            {t.icon ? <span className={cn('text-base leading-none')}>{t.icon}</span> : <FileText className={cn('h-4 w-4 text-ink-muted')} />}
            <span className={cn('truncate')}>{t.title || 'Untitled'}</span>
          </button>
          {t.isDefault && badge}
          <RowMenu
            onSetDefault={() => templates.onSetDefault(t.id)}
            onEdit={() => run(() => templates.onOpen(t.id))}
            onDuplicate={() => templates.onDuplicate(t.id)}
            onDelete={() => templates.onDelete(t.id)}
          />
        </div>
      ))}

      <div className={cn('mt-1 border-t border-line')} />
      <button onClick={() => run(templates.onNew)} className={cn('flex w-full items-center gap-2 px-3 py-2 text-sm text-ink-muted hover:bg-hover-surface hover:text-ink-body transition-colors')}>
        <Plus className={cn('h-4 w-4')} /><span>New template</span>
      </button>
    </Dropdown>
  );
}
