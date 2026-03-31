/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   FilterPropertyPicker.tsx                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:39:20 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 17:43:16 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import type { SchemaProperty } from '../../types/database';
import { PropertyTypeIcon } from './PropertyTypeIcon';

export function FilterPropertyPicker({ properties, onSelect, onClose, onAdvancedFilter, title = 'Add filter' }: {
  properties: SchemaProperty[];
  onSelect: (propId: string) => void;
  onClose: () => void;
  onAdvancedFilter?: () => void;
  title?: string;
}) {
  const [search, setSearch] = useState('');
  const filtered = properties.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col" style={{ minWidth: 290, maxWidth: 290, maxHeight: '80vh' }}>
      {title && (
        <div className="flex items-center px-3 pt-3.5 pb-1.5 h-[42px] shrink-0">
          <span className="flex-1 font-semibold text-sm truncate">{title}</span>
          <button onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-hover-surface2 text-ink-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <div className="px-2 pt-2 pb-1">
        <div className="flex items-center rounded-md border border-line bg-surface-secondary h-7 px-1.5">
          <input type="text" placeholder="Filter by…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none placeholder-placeholder" autoFocus />
        </div>
      </div>
      <div className="overflow-y-auto flex-1 min-h-0 p-1">
        <div className="flex flex-col gap-px">
          {filtered.map(prop => (
            <button key={prop.id} onClick={() => onSelect(prop.id)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-ink-body hover:bg-hover-surface transition-colors">
              <PropertyTypeIcon type={prop.type} className="w-4 h-4 text-ink-secondary shrink-0" />
              <span className="truncate">{prop.name}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-2 py-3 text-sm text-ink-muted text-center">No properties found</div>
          )}
        </div>
      </div>
      {onAdvancedFilter && (
        <div className="border-t border-line-light p-1 shrink-0">
          <button onClick={onAdvancedFilter}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-ink-secondary hover:bg-hover-surface transition-colors">
            <Plus className="w-4 h-4" /><span>Add advanced filter</span>
          </button>
        </div>
      )}
    </div>
  );
}
