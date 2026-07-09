/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   AddPropertyPanel.tsx                               :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/07 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/07 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { PropIcon } from '../../../constants/propertyIcons';
import type { PropertyType } from '../../../types/database';
import { cn } from '../../../utils/cn';

type TypeEntry = readonly [label: string, type: PropertyType];

/** Preferred panel width — the anchor shrinks it to fit the page margin. */
export const ADD_PANEL_WIDTH = 400;

/** Notion's "Select type" sections: basic / advanced / system. */
const BASIC_TYPES: readonly TypeEntry[] = [
  ['Text', 'text'], ['Number', 'number'],
  ['Select', 'select'], ['Multi-select', 'multi_select'],
  ['Status', 'status'], ['Date', 'date'],
  ['Person', 'person'], ['Files & media', 'files_media'],
  ['Checkbox', 'checkbox'], ['URL', 'url'],
  ['Phone', 'phone'], ['Email', 'email'],
];
const ADVANCED_TYPES: readonly TypeEntry[] = [
  ['Relation', 'relation'], ['Rollup', 'rollup'],
  ['Formula', 'formula'], ['Button', 'button'],
  ['ID', 'id'], ['Place', 'place'],
];
const SYSTEM_TYPES: readonly TypeEntry[] = [
  ['Created time', 'created_time'], ['Last edited time', 'last_edited_time'],
  ['Created by', 'created_by'], ['Last edited by', 'last_edited_by'],
];

function TypeGrid({ entries, onPick }: Readonly<{ entries: readonly TypeEntry[]; onPick: (label: string, type: PropertyType) => void }>) {
  if (entries.length === 0) return null;
  return (
    <div className={cn('grid grid-cols-2 gap-0.5')}>
      {entries.map(([label, type]) => (
        <button key={type} type="button" onClick={() => onPick(label, type)}
          className={cn('flex min-h-8 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-ink-body hover:bg-hover-surface transition-colors')}>
          <PropIcon type={type} className={cn('w-4 h-4 shrink-0 text-ink-muted')} />
          <span className={cn('truncate')}>{label}</span>
        </button>
      ))}
    </div>
  );
}

/** Notion's add-property panel: "Select type" header + searchable sectioned
 *  two-column grid of property types. */
export function AddPropertyPanel({ onPick }: Readonly<{ onPick: (label: string, type: PropertyType) => void }>) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const match = (entries: readonly TypeEntry[]) =>
    q ? entries.filter(([label]) => label.toLowerCase().includes(q)) : entries;

  const basic = match(BASIC_TYPES);
  const advanced = match(ADVANCED_TYPES);
  const system = match(SYSTEM_TYPES);
  const empty = basic.length + advanced.length + system.length === 0;

  return (
    <div className={cn('flex max-h-[50vh] w-full flex-col overflow-y-auto p-2')}>
      <div className={cn('mb-1 flex items-center justify-between px-1 pt-0.5')}>
        <span className={cn('text-xs font-medium text-ink-muted')}>Select type</span>
        <Search className={cn('w-3.5 h-3.5 text-ink-muted')} />
      </div>
      <input value={query} onChange={e => setQuery(e.target.value)} autoFocus
        placeholder="Search types…" aria-label="Search types"
        className={cn('mb-2 w-full rounded-md border border-line bg-surface-secondary px-2 py-1.5 text-sm outline-none focus:border-focus-border placeholder:text-placeholder')} />

      {empty ? (
        <p className={cn('px-2 py-4 text-center text-xs text-ink-muted')}>No matching types.</p>
      ) : (
        <>
          <TypeGrid entries={basic} onPick={onPick} />
          {advanced.length > 0 && <div className={cn('my-1.5 h-px bg-surface-tertiary')} />}
          <TypeGrid entries={advanced} onPick={onPick} />
          {system.length > 0 && <div className={cn('my-1.5 h-px bg-surface-tertiary')} />}
          <TypeGrid entries={system} onPick={onPick} />
        </>
      )}
    </div>
  );
}
