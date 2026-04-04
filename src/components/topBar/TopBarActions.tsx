/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   TopBarActions.tsx                                  :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/05 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/05 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import {
  Plus, Search, Filter, ArrowUpDown, Settings2,
  X, Maximize2, Zap,
} from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';
import { ExtraActionsMenu } from './MenuComponents';
import { DbSourceDropdown } from '../DbSourceDropdown';
import { cn } from '../../utils/cn';
import type { Filter as FilterType, Sort } from '../../types/database';

/** Props for {@link TopBarActions}. */
export interface TopBarActionsProps {
  filterBtnRef: React.RefObject<HTMLButtonElement | null>;
  filters: FilterType[];
  sorts: Sort[];
  showFilterPropertyPicker: boolean;
  setShowFilterPropertyPicker: (v: boolean) => void;
  showFilterPanel: boolean;
  setShowFilterPanel: (v: boolean) => void;
  setShowAdvancedFilter: (v: boolean) => void;
  showSortPanel: boolean;
  setShowSortPanel: (v: boolean) => void;
  showSearch: boolean;
  setShowSearch: (v: boolean) => void;
  localSearchValue: string;
  setLocalSearchValue: (v: string) => void;
  searchRef: React.RefObject<HTMLInputElement | null>;
  searchDebounceRef: React.RefObject<ReturnType<typeof setTimeout> | undefined>;
  onSearchQueryChange: (query: string) => void;
  isFullSize: boolean;
  setIsFullSize: (v: boolean) => void;
  showViewSettings: boolean;
  setShowViewSettings: (v: boolean) => void;
  showExtraActions: boolean;
  setShowExtraActions: (v: boolean) => void;
  onNewPage: () => void;
}

/** Right-side action buttons: filter, sort, search, settings, new page. */
export function TopBarActions({
  filterBtnRef, filters, sorts,
  showFilterPropertyPicker, setShowFilterPropertyPicker,
  showFilterPanel, setShowFilterPanel, setShowAdvancedFilter,
  showSortPanel, setShowSortPanel,
  showSearch, setShowSearch, localSearchValue, setLocalSearchValue,
  searchRef, searchDebounceRef, onSearchQueryChange,
  isFullSize, setIsFullSize,
  showViewSettings, setShowViewSettings,
  showExtraActions, setShowExtraActions,
  onNewPage,
}: Readonly<TopBarActionsProps>) {
  return (
    <div className={cn("flex items-center gap-0.5 shrink-0")}>
      <button ref={filterBtnRef}
        onClick={() => {
          if (filters.length === 0) { setShowFilterPropertyPicker(!showFilterPropertyPicker); setShowFilterPanel(false); setShowAdvancedFilter(false); }
          else { setShowFilterPanel(!showFilterPanel); setShowFilterPropertyPicker(false); }
          setShowSortPanel(false);
        }}
        className={cn(`flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-lg transition-colors ${filters.length > 0
          ? 'bg-accent-soft text-accent-text-light font-medium' : 'text-ink-secondary hover:text-hover-text-strong hover:bg-hover-surface'}`)}>
        <Filter className={cn("w-3.5 h-3.5")} /><span className={cn("hidden sm:inline")}>Filter</span>
        {filters.length > 0 && <span className={cn("text-xs bg-accent-muted text-accent-text px-1.5 rounded-full tabular-nums")}>{filters.length}</span>}
      </button>
      <button onClick={() => { setShowSortPanel(!showSortPanel); setShowFilterPanel(false); }}
        className={cn(`flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-lg transition-colors ${sorts.length > 0
          ? 'bg-purple-surface text-purple-text font-medium' : 'text-ink-secondary hover:text-hover-text-strong hover:bg-hover-surface'}`)}>
        <ArrowUpDown className={cn("w-3.5 h-3.5")} /><span className={cn("hidden sm:inline")}>Sort</span>
        {sorts.length > 0 && <span className={cn("text-xs bg-purple-surface-muted text-purple-text-bold px-1.5 rounded-full tabular-nums")}>{sorts.length}</span>}
      </button>
      <button className={cn("flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-lg text-ink-secondary hover:text-hover-text-strong hover:bg-hover-surface transition-colors")}>
        <Zap className={cn("w-3.5 h-3.5")} /><span className={cn("hidden sm:inline")}>Automations</span>
      </button>

      {showSearch ? (
        <div className={cn("flex items-center gap-1 bg-surface-tertiary rounded-lg px-2 py-1")}>
          <Search className={cn("w-3.5 h-3.5 text-ink-muted")} />
          <input ref={searchRef} type="text" placeholder="Search..." value={localSearchValue}
            onChange={e => { const v = e.target.value; setLocalSearchValue(v); clearTimeout(searchDebounceRef.current); searchDebounceRef.current = setTimeout(() => onSearchQueryChange(v), 200); }}
            onKeyDown={e => { if (e.key === 'Escape') { clearTimeout(searchDebounceRef.current); setLocalSearchValue(''); onSearchQueryChange(''); setShowSearch(false); } }}
            className={cn("bg-transparent text-sm w-40 outline-none placeholder:text-placeholder")} />
          <button onClick={() => { clearTimeout(searchDebounceRef.current); setLocalSearchValue(''); onSearchQueryChange(''); setShowSearch(false); }} className={cn("p-0.5 hover:bg-hover-surface3 rounded")}>
            <X className={cn("w-3 h-3 text-ink-muted")} />
          </button>
        </div>
      ) : (
        <button onClick={() => setShowSearch(true)} className={cn("p-2 text-ink-secondary hover:text-hover-text-strong hover:bg-hover-surface rounded-lg transition-colors")} title="Search">
          <Search className={cn("w-4 h-4")} />
        </button>
      )}

      <button onClick={() => setIsFullSize(!isFullSize)}
        className={cn(`p-2 rounded-lg transition-colors ${isFullSize ? 'bg-surface-tertiary text-ink-body' : 'text-ink-secondary hover:text-hover-text-strong hover:bg-hover-surface'}`)} title="Full-size">
        <Maximize2 className={cn("w-4 h-4")} />
      </button>
      <button onClick={() => setShowViewSettings(!showViewSettings)}
        className={cn(`p-2 text-ink-secondary hover:text-hover-text-strong hover:bg-hover-surface rounded-lg transition-colors ${showViewSettings ? 'bg-surface-tertiary' : ''}`)}>
        <Settings2 className={cn("w-4 h-4")} />
      </button>
      <ExtraActionsMenu show={showExtraActions} onToggle={() => setShowExtraActions(!showExtraActions)} onClose={() => setShowExtraActions(false)} />
      <DbSourceDropdown />
      <ThemeToggle />
      <div className={cn("w-px h-5 bg-surface-muted mx-1")} />
      <button onClick={onNewPage}
        className={cn("flex items-center gap-1.5 px-3 py-1.5 bg-accent text-ink-inverse text-sm font-medium rounded-lg hover:bg-hover-accent transition-colors shadow-sm")}>
        <Plus className={cn("w-3.5 h-3.5")} /> New
      </button>
    </div>
  );
}
