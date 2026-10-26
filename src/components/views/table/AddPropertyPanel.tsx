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
import { Sparkles, Search } from 'lucide-react';
import { PropIcon } from '../../../constants/propertyIcons';
import { useHostAdapters } from '../../../hooks/useHostAdapters';
import type { PropertyType, SelectOption } from '../../../types/database';
import { cn } from '../../../utils/cn';

type TypeEntry = readonly [label: string, type: PropertyType];

/** The closed labels of the sentiment model (C148), as select options. */
export const SENTIMENT_OPTIONS: SelectOption[] = [
  { id: 'negative', value: 'negative', color: 'bg-danger-surface-muted text-danger-text-tag' },
  { id: 'neutral', value: 'neutral', color: 'bg-warning-surface-muted text-warning-text-tag' },
  { id: 'positive', value: 'positive', color: 'bg-success-surface-muted text-success-text-tag' },
];

/** Two columns of ~150px: wide enough for "Last edited time" on one line. */
export const ADD_PANEL_WIDTH = 320;

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
          className={cn('flex h-7 items-center gap-2 rounded-md px-2 text-left text-sm text-ink-body hover:bg-hover-surface focus-visible:bg-hover-surface outline-none')}>
          <PropIcon type={type} className={cn('w-4 h-4 shrink-0 text-ink-secondary')} />
          <span className={cn('truncate')}>{label}</span>
        </button>
      ))}
    </div>
  );
}

/** Notion's add-property panel: "Select type" header + searchable sectioned
 *  two-column grid of property types. */
export function AddPropertyPanel({ onPick, onPickSentiment }: Readonly<{
  onPick: (label: string, type: PropertyType) => void;
  /** Creates the configured AI-sentiment select; shown only when the host
   *  provides the autofill adapter and the caller can name the title column. */
  onPickSentiment?: () => void;
}>) {
  const hasAutofill = Boolean(useHostAdapters().autofill);
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const match = (entries: readonly TypeEntry[]) =>
    q ? entries.filter(([label]) => label.toLowerCase().includes(q)) : entries;

  const basic = match(BASIC_TYPES);
  const advanced = match(ADVANCED_TYPES);
  const system = match(SYSTEM_TYPES);
  const showSentiment = hasAutofill && Boolean(onPickSentiment) && 'ai sentiment'.includes(q);
  const empty = basic.length + advanced.length + system.length === 0 && !showSentiment;

  return (
    <div className={cn('flex max-h-[min(70vh,520px)] min-h-0 w-full flex-col')}>
      <label className={cn('flex shrink-0 items-center gap-2 border-b border-line px-3 py-2')}>
        <Search className={cn('w-4 h-4 shrink-0 text-ink-muted')} aria-hidden="true" />
        <input value={query} onChange={e => setQuery(e.target.value)} autoFocus
          placeholder="Search types…" aria-label="Search types" data-writing-surface
          className={cn('min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-placeholder')} />
      </label>
      <div className={cn('min-h-0 flex-1 overflow-y-auto p-1.5')}>
        {empty ? (
          <p className={cn('px-2 py-4 text-center text-xs text-ink-muted')}>No matching types.</p>
        ) : (
          <>
            <div className={cn('px-2 pb-1 pt-1 text-xs font-medium text-ink-muted')}>Select type</div>
            <TypeGrid entries={basic} onPick={onPick} />
            {advanced.length > 0 && <div className={cn('mx-2 my-1.5 h-px bg-line')} />}
            <TypeGrid entries={advanced} onPick={onPick} />
            {showSentiment && (
              <button type="button" onClick={onPickSentiment} data-testid="add-ai-sentiment"
                className={cn('flex h-7 items-center gap-2 rounded-md px-2 text-left text-sm text-ink-body hover:bg-hover-surface focus-visible:bg-hover-surface outline-none')}>
                <Sparkles className={cn('w-4 h-4 shrink-0 text-ink-secondary')} />
                <span className={cn('truncate')}>AI sentiment</span>
              </button>
            )}
            {system.length > 0 && <div className={cn('mx-2 my-1.5 h-px bg-line')} />}
            <TypeGrid entries={system} onPick={onPick} />
          </>
        )}
      </div>
    </div>
  );
}
