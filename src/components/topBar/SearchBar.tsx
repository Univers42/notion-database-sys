/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   SearchBar.tsx                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/10/26 23:30:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/10/26 23:30:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useDatabaseStore, useStoreApi } from '../../store/dbms/hardcoded/useDatabaseStore';
import { cn } from '../../utils/cn';

const SEARCH_DEBOUNCE_MS = 200;

function matchLabel(count: number): string {
  if (count === 0) return 'No matches';
  return count === 1 ? '1 match' : `${count} matches`;
}

/**
 * Find bar under the view tabs. It lives in its own row so opening it never
 * widens the toolbar over the database title. Escape clears the query first
 * and closes on the second press, so one key never throws away a query.
 */
export function SearchBar({ viewId, onClose }: Readonly<{ viewId: string; onClose: () => void }>) {
  const storeApi = useStoreApi();
  const [value, setValue] = useState(() => storeApi.getState().searchQuery);
  const matches = useDatabaseStore(s => (s.searchQuery ? s.getPagesForView(viewId).length : null));
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(debounce.current), []);

  const apply = (next: string, delay: number) => {
    setValue(next);
    clearTimeout(debounce.current);
    if (delay === 0) storeApi.getState().setSearchQuery(next);
    else debounce.current = setTimeout(() => storeApi.getState().setSearchQuery(next), delay);
  };
  const close = () => { apply('', 0); onClose(); };

  return (
    <div role="search" aria-label="Search this database"
      className={cn("odb-search-bar mx-4 my-1.5 flex items-center gap-2 rounded-lg border border-line bg-surface-secondary px-2.5 py-1 focus-within:border-focus-border focus-within:ring-1 focus-within:ring-focus-ring transition-colors")}>
      <Search aria-hidden className={cn("w-3.5 h-3.5 shrink-0 text-ink-muted")} />
      {/* The row shows focus; the field opts out of the host's own focus frame. */}
      <input autoFocus type="search" value={value} placeholder="Search this database…" aria-label="Search database"
        data-writing-surface
        onChange={e => apply(e.target.value, SEARCH_DEBOUNCE_MS)}
        onKeyDown={e => {
          if (e.key !== 'Escape') return;
          e.preventDefault();
          e.stopPropagation();
          if (value) apply('', 0);
          else onClose();
        }}
        className={cn("min-w-0 flex-1 bg-transparent py-0.5 text-sm text-ink outline-none placeholder:text-placeholder [&::-webkit-search-cancel-button]:hidden")} />
      <span role="status" aria-live="polite" className={cn("shrink-0 text-xs tabular-nums text-ink-muted")}>
        {matches === null ? '' : matchLabel(matches)}
      </span>
      <button type="button" aria-label="Close search" title="Close search (Esc)" onClick={close}
        className={cn("shrink-0 rounded p-0.5 text-ink-muted hover:bg-hover-surface3 hover:text-hover-text")}>
        <X className={cn("w-3.5 h-3.5")} />
      </button>
    </div>
  );
}
