import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { SchemaProperty } from '../../types/database';
import { PropertyTypeIcon } from '../filters/PropertyTypeIcon';
import { cn } from '../../utils/cn';

/** CSS class overrides for SortPropertyPicker sub-elements. */
export type SortPropertyPickerSlots = {
  root: string;
  header: string;
  backButton: string;
  title: string;
  closeButton: string;
  searchWrap: string;
  searchInner: string;
  searchInput: string;
  list: string;
  listInner: string;
  item: string;
  itemIcon: string;
  itemName: string;
  empty: string;
};

/** Renders a searchable property list for adding a new sort rule. */
export function SortPropertyPicker({ properties, onSelect, onClose, slots }: Readonly<{
  properties: SchemaProperty[];
  onSelect: (propId: string) => void;
  onClose: () => void;
  slots?: Partial<SortPropertyPickerSlots>;
}>) {
  const [search, setSearch] = useState('');
  const filtered = properties.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={cn("flex flex-col", slots?.root)} style={{ minWidth: 290, maxWidth: 290, maxHeight: 300 }}>
      <div className={cn("flex items-center px-3 pt-3.5 pb-1.5 h-[42px] shrink-0", slots?.header)}>
        <button onClick={onClose}
          className={cn("w-5 h-5 flex items-center justify-center rounded hover:bg-hover-surface2 mr-2 text-ink-secondary transition-colors", slots?.backButton)}>
          <svg viewBox="0 0 16 16" width="16" height="16" fill="none">
            <path d="M2.16 8.206q.046.13.148.236l4.32 4.32a.625.625 0 0 0 .884-.884L4.259 8.625h8.991a.625.625 0 1 0 0-1.25H4.259l3.253-3.253a.625.625 0 1 0-.884-.884l-4.32 4.32a.62.62 0 0 0-.148.648" fill="currentColor" />
          </svg>
        </button>
        <span className={cn("flex-1 font-semibold text-sm truncate", slots?.title)}>New sort</span>
        <button onClick={onClose}
          className={cn("w-6 h-6 flex items-center justify-center rounded-full bg-surface-tertiary hover:bg-hover-surface3 text-ink-muted transition-colors", slots?.closeButton)}>
          <X className={cn("w-3.5 h-3.5")} />
        </button>
      </div>
      <div className={cn("px-2 pt-2 pb-1", slots?.searchWrap)}>
        <div className={cn("flex items-center rounded-md border border-line bg-surface-secondary h-7 px-1.5", slots?.searchInner)}>
          <input type="text" placeholder="Sort by…" value={search}
            onChange={e => setSearch(e.target.value)}
            className={cn("flex-1 bg-transparent text-sm outline-none placeholder-placeholder", slots?.searchInput)} autoFocus />
        </div>
      </div>
      <div className={cn("overflow-y-auto flex-1 min-h-0 p-1", slots?.list)}>
        <div className={cn("flex flex-col gap-px", slots?.listInner)}>
          {filtered.map(prop => (
            <button key={prop.id} onClick={() => onSelect(prop.id)}
              className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-ink-body hover:bg-hover-surface transition-colors", slots?.item)}>
              <PropertyTypeIcon type={prop.type} className={cn("w-4 h-4 text-ink-secondary shrink-0", slots?.itemIcon)} />
              <span className={cn("truncate", slots?.itemName)}>{prop.name}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className={cn("px-2 py-3 text-sm text-ink-muted text-center", slots?.empty)}>No properties found</div>
          )}
        </div>
      </div>
    </div>
  );
}
