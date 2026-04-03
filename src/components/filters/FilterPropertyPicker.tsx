/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   FilterPropertyPicker.tsx                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:39:20 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/03 16:50:27 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import type { SchemaProperty } from '../../types/database';
import { PropertyTypeIcon } from './PropertyTypeIcon';
import { cn } from '../../utils/cn';

export type FilterPropertyPickerSlots = {
  root?: string;
  header?: string;
  headerTitle?: string;
  closeButton?: string;
  searchWrap?: string;
  searchInner?: string;
  searchInput?: string;
  list?: string;
  listInner?: string;
  item?: string;
  itemIcon?: string;
  itemLabel?: string;
  empty?: string;
  footer?: string;
  footerButton?: string;
};

export function FilterPropertyPicker({ properties, onSelect, onClose, onAdvancedFilter, title = 'Add filter', slots = {} }: Readonly<{
  properties: SchemaProperty[];
  onSelect: (propId: string) => void;
  onClose: () => void;
  onAdvancedFilter?: () => void;
  title?: string;
  slots?: Partial<FilterPropertyPickerSlots>;
}>) {
  const [search, setSearch] = useState('');
  const filtered = properties.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={cn('flex flex-col', slots.root)} style={{ minWidth: 290, maxWidth: 290, maxHeight: '80vh' }}>
      {title && (
        <div className={cn('flex items-center px-3 pt-3.5 pb-1.5 h-[42px] shrink-0', slots.header)}>
          <span className={cn('flex-1 font-semibold text-sm truncate', slots.headerTitle)}>{title}</span>
          <button onClick={onClose}
            className={cn('w-6 h-6 flex items-center justify-center rounded-full hover:bg-hover-surface2 text-ink-muted transition-colors', slots.closeButton)}>
            <X className={cn("w-4 h-4")} />
          </button>
        </div>
      )}
      <div className={cn('px-2 pt-2 pb-1', slots.searchWrap)}>
        <div className={cn('flex items-center rounded-md border border-line bg-surface-secondary h-7 px-1.5', slots.searchInner)}>
          <input type="text" placeholder="Filter by…" value={search}
            onChange={e => setSearch(e.target.value)}
            className={cn('flex-1 bg-transparent text-sm outline-none placeholder-placeholder', slots.searchInput)} autoFocus />
        </div>
      </div>
      <div className={cn('overflow-y-auto flex-1 min-h-0 p-1', slots.list)}>
        <div className={cn('flex flex-col gap-px', slots.listInner)}>
          {filtered.map(prop => (
            <button key={prop.id} onClick={() => onSelect(prop.id)}
              className={cn('w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-ink-body hover:bg-hover-surface transition-colors', slots.item)}>
              <PropertyTypeIcon type={prop.type} className={cn('w-4 h-4 text-ink-secondary shrink-0', slots.itemIcon)} />
              <span className={cn('truncate', slots.itemLabel)}>{prop.name}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className={cn('px-2 py-3 text-sm text-ink-muted text-center', slots.empty)}>No properties found</div>
          )}
        </div>
      </div>
      {onAdvancedFilter && (
        <div className={cn('border-t border-line-light p-1 shrink-0', slots.footer)}>
          <button onClick={onAdvancedFilter}
            className={cn('w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-ink-secondary hover:bg-hover-surface transition-colors', slots.footerButton)}>
            <Plus className={cn("w-4 h-4")} /><span>Add advanced filter</span>
          </button>
        </div>
      )}
    </div>
  );
}
