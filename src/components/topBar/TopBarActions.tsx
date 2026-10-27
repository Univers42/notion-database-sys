/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   TopBarActions.tsx                                  :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/05 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/10/26 14:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import {
  Plus, Search, Filter, ArrowUpDown, Settings2,
  Maximize2, Zap, ChevronDown,
} from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';
import { ExtraActionsMenu } from './MenuComponents';
import { DbSourceDropdown } from '../DbSourceDropdown';
import { TemplatesDropdown } from './TemplatesDropdown';
import { useTemplatesController } from './templatesContext';
import { useCanCreateRecords } from '../../hooks/useHostAdapters';
import { cn } from '../../utils/cn';
import type { Filter as FilterType, Sort } from '../../types/database';

/** Props for {@link TopBarActions}. */
export interface TopBarActionsProps {
  /** Embedded chromes ('inline' | 'single-view') hide the developer chrome
   *  (data-source switcher, theme toggle) — the HOST owns those concerns. */
  variant?: 'full' | 'inline' | 'single-view';
  /** Navigate to the database's origin surface ("Open as full page"). */
  onOpenFullPage?: () => void;
  filterBtnRef: React.RefObject<HTMLButtonElement | null>;
  /** The popover with the view settings pins itself to this button. */
  settingsBtnRef: React.RefObject<HTMLButtonElement | null>;
  sortBtnRef: React.RefObject<HTMLButtonElement | null>;
  filters: FilterType[];
  sorts: Sort[];
  showFilterPropertyPicker: boolean;
  setShowFilterPropertyPicker: (v: boolean) => void;
  showFilterPanel: boolean;
  setShowFilterPanel: (v: boolean) => void;
  setShowAdvancedFilter: (v: boolean) => void;
  showSortPanel: boolean;
  setShowSortPanel: (v: boolean) => void;
  /** The search row under the view tabs; focus returns here when it closes. */
  searchBtnRef: React.RefObject<HTMLButtonElement | null>;
  showSearch: boolean;
  setShowSearch: (v: boolean) => void;
  isFullSize: boolean;
  setIsFullSize: (v: boolean) => void;
  showViewSettings: boolean;
  setShowViewSettings: (v: boolean) => void;
  /** Open View settings pre-navigated to the Automations screen. */
  onOpenAutomations: () => void;
  /** Ref for the ⚡ button, used by the automations sheet to return focus. */
  automationsBtnRef?: React.RefObject<HTMLButtonElement | null>;
  /** Local-rule count for the ⚡ pill (live mounts manage rules server-side → 0). */
  automationsCount: number;
  showExtraActions: boolean;
  setShowExtraActions: (v: boolean) => void;
  showTemplates: boolean;
  setShowTemplates: (v: boolean) => void;
  databaseName: string;
  onNewPage: () => void;
}

/** Right-side action buttons: filter, sort, search, settings, new page. */
export function TopBarActions({
  variant = 'full',
  onOpenFullPage,
  filterBtnRef, settingsBtnRef, sortBtnRef, filters, sorts,
  showFilterPropertyPicker, setShowFilterPropertyPicker,
  showFilterPanel, setShowFilterPanel, setShowAdvancedFilter,
  showSortPanel, setShowSortPanel,
  searchBtnRef, showSearch, setShowSearch,
  isFullSize, setIsFullSize,
  showViewSettings, setShowViewSettings,
  onOpenAutomations, automationsBtnRef, automationsCount,
  showExtraActions, setShowExtraActions,
  showTemplates, setShowTemplates, databaseName,
  onNewPage,
}: Readonly<TopBarActionsProps>) {
  const templates = useTemplatesController();
  const canCreate = useCanCreateRecords();
  const defaultTemplateId = templates?.list.find((t) => t.isDefault)?.id;
  const handlePrimaryNew = () => {
    if (templates && defaultTemplateId) templates.onCreateFrom(defaultTemplateId);
    else onNewPage();
  };
  return (
    <div className={cn("odb-topbar-actions flex items-center gap-0.5 shrink-0")}>
      <button ref={filterBtnRef} aria-label="Filter" title="Filter"
        onClick={() => {
          if (filters.length === 0) { setShowFilterPropertyPicker(!showFilterPropertyPicker); setShowFilterPanel(false); setShowAdvancedFilter(false); }
          else { setShowFilterPanel(!showFilterPanel); setShowFilterPropertyPicker(false); }
          setShowSortPanel(false);
        }}
        className={cn(`flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-lg transition-colors ${filters.length > 0
          ? 'bg-accent-soft text-accent-text-light font-medium' : 'text-ink-secondary hover:text-hover-text-strong hover:bg-hover-surface'}`)}>
        <Filter className={cn("w-3.5 h-3.5")} /><span className={cn("odb-action-label hidden sm:inline")}>Filter</span>
        {filters.length > 0 && <span className={cn("text-xs bg-accent-muted text-accent-text px-1.5 rounded-full tabular-nums")}>{filters.length}</span>}
      </button>
      <button ref={sortBtnRef} aria-label="Sort" title="Sort" onClick={() => { setShowSortPanel(!showSortPanel); setShowFilterPanel(false); }}
        className={cn(`flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-lg transition-colors ${sorts.length > 0
          ? 'bg-purple-surface text-purple-text font-medium' : 'text-ink-secondary hover:text-hover-text-strong hover:bg-hover-surface'}`)}>
        <ArrowUpDown className={cn("w-3.5 h-3.5")} /><span className={cn("odb-action-label hidden sm:inline")}>Sort</span>
        {sorts.length > 0 && <span className={cn("text-xs bg-purple-surface-muted text-purple-text-bold px-1.5 rounded-full tabular-nums")}>{sorts.length}</span>}
      </button>
      <button ref={automationsBtnRef} aria-label="Automations" title="Automations" onClick={onOpenAutomations}
        className={cn(`flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-lg transition-colors ${automationsCount > 0
          ? 'bg-accent-soft text-accent-text-light font-medium' : 'text-ink-secondary hover:text-hover-text-strong hover:bg-hover-surface'}`)}>
        <Zap className={cn("w-3.5 h-3.5")} /><span className={cn("odb-action-label hidden sm:inline")}>Automations</span>
        {automationsCount > 0 && <span className={cn("text-xs bg-accent-muted text-accent-text px-1.5 rounded-full tabular-nums")}>{automationsCount}</span>}
      </button>

      <button ref={searchBtnRef} onClick={() => setShowSearch(!showSearch)} aria-label="Search" aria-pressed={showSearch} title="Search"
        className={cn(`p-2 rounded-lg transition-colors ${showSearch
          ? 'bg-accent-soft text-accent-text-light' : 'text-ink-secondary hover:text-hover-text-strong hover:bg-hover-surface'}`)}>
        <Search className={cn("w-4 h-4")} />
      </button>

      <button
        onClick={onOpenFullPage ?? (() => setIsFullSize(!isFullSize))}
        aria-label={onOpenFullPage ? 'Open as full page' : 'Full-size'}
        title={onOpenFullPage ? 'Open as full page' : 'Full-size'}
        className={cn(`p-2 rounded-lg transition-colors ${!onOpenFullPage && isFullSize ? 'bg-surface-tertiary text-ink-body' : 'text-ink-secondary hover:text-hover-text-strong hover:bg-hover-surface'}`)}>
        <Maximize2 className={cn("w-4 h-4")} />
      </button>
      <button ref={settingsBtnRef} onClick={() => setShowViewSettings(!showViewSettings)} aria-label="View settings"
        aria-haspopup="dialog" aria-expanded={showViewSettings}
        className={cn(`p-2 text-ink-secondary hover:text-hover-text-strong hover:bg-hover-surface rounded-lg transition-colors ${showViewSettings ? 'bg-surface-tertiary' : ''}`)}>
        <Settings2 className={cn("w-4 h-4")} />
      </button>
      <ExtraActionsMenu show={showExtraActions} onToggle={() => setShowExtraActions(!showExtraActions)} onClose={() => setShowExtraActions(false)} />
      {variant === 'full' && (
        <>
          <DbSourceDropdown />
          <ThemeToggle />
        </>
      )}
      {canCreate && <div className={cn("odb-topbar-divider w-px h-5 bg-surface-muted mx-1")} />}
      {canCreate && (templates ? (
        <div className={cn("odb-topbar-new relative")}>
          {/* One seamless split control: shared rounded surface, equal-height
              segments (items-stretch), inset divider — no see-through gap. */}
          <div className={cn("flex items-stretch rounded-lg overflow-hidden shadow-sm")}>
            <button onClick={handlePrimaryNew}
              className={cn("flex items-center gap-1.5 pl-3 pr-2.5 py-1.5 bg-accent text-ink-inverse text-sm font-medium hover:bg-hover-accent transition-colors")}>
              <Plus className={cn("w-3.5 h-3.5")} /> New
            </button>
            <button aria-label="New from template" aria-expanded={showTemplates} onClick={() => setShowTemplates(!showTemplates)}
              className={cn("flex w-6 items-center justify-center self-stretch bg-accent text-ink-inverse border-l border-ink-inverse/25 hover:bg-hover-accent transition-colors")}>
              <ChevronDown className={cn("w-3.5 h-3.5")} />
            </button>
          </div>
          {showTemplates && (
            <TemplatesDropdown databaseName={databaseName} templates={templates}
              onCreateBlank={onNewPage} onClose={() => setShowTemplates(false)} />
          )}
        </div>
      ) : (
        <button onClick={onNewPage}
          className={cn("odb-topbar-new flex items-center gap-1.5 px-3 py-1.5 bg-accent text-ink-inverse text-sm font-medium rounded-lg hover:bg-hover-accent transition-colors shadow-sm")}>
          <Plus className={cn("w-3.5 h-3.5")} /> New
        </button>
      ))}
    </div>
  );
}
