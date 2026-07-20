/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ListView.tsx                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:38:41 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/08 04:43:11 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { useDatabaseStore, useStoreApi } from '../../../store/dbms/hardcoded/useDatabaseStore';
import { useDefaultTemplateCreate } from '../useDefaultTemplateCreate';
import { useActiveViewId } from '../../../hooks/useDatabaseScope';
import { FileText, MoreHorizontal, Plus } from 'lucide-react';
import type { Page, SchemaProperty } from '../../../types/database';
import { safeDateFormat } from '../../../utils/format';
import { cn } from '../../../utils/cn';
import { safeString } from '../../../utils/safeString';
import { useViewPages } from '../../../hooks/useViewPages';
import { useViewPager, resolvePageSize } from '../../../hooks/useViewPager';
import { ViewPaginationBar } from '../shared/ViewPaginationBar';
import { useStackedGroups } from '../../../hooks/useViewGrouping';
import { GroupSectionHeader } from '../shared/GroupSectionHeader';

/** Renders a compact property tag for the list view row. */
function renderListPropertyTag(prop: SchemaProperty, val: unknown): React.ReactNode {
  if (val === undefined || val === null || val === '') return null;

  if (prop.type === 'select' || prop.type === 'status') {
    const opt = prop.options?.find(o => o.id === val);
    return opt ? (
      <span key={prop.id} className={cn(`px-2 py-0.5 rounded text-xs font-medium ${opt.color}`)}>{opt.value}</span>
    ) : null;
  }
  if (prop.type === 'multi_select') {
    const ids: string[] = Array.isArray(val) ? val : [];
    return (
      <div key={prop.id} className={cn("flex gap-1")}>
        {ids.slice(0, 2).map(id => {
          const opt = prop.options?.find(o => o.id === id);
          return opt ? <span key={id} className={cn(`px-1.5 py-0.5 rounded text-xs font-medium ${opt.color}`)}>{opt.value}</span> : null;
        })}
        {ids.length > 2 && <span className={cn("text-xs text-ink-muted")}>+{ids.length - 2}</span>}
      </div>
    );
  }
  if (prop.type === 'date') {
    return <span key={prop.id} className={cn("text-xs text-ink-secondary")}>{safeDateFormat(val, 'MMM d') ?? ''}</span>;
  }
  if (prop.type === 'user' || prop.type === 'person') {
    return (
      <div key={prop.id} className={cn("flex items-center gap-1")}>
        <div className={cn("w-5 h-5 rounded-full bg-gradient-to-br from-gradient-accent-from to-gradient-accent-to text-ink-inverse flex items-center justify-center text-[10px] font-bold")}>
          {safeString(val).charAt(0).toUpperCase()}
        </div>
      </div>
    );
  }
  if (prop.type === 'checkbox') {
    return (
      <div key={prop.id} className={cn(`w-4 h-4 rounded border-2 flex items-center justify-center ${val ? 'bg-accent border-accent-border' : 'border-line-medium'}`)}>
        {val && <span className={cn("text-ink-inverse text-[10px]")}>✓</span>}
      </div>
    );
  }
  if (prop.type === 'number') {
    return <span key={prop.id} className={cn("text-xs text-ink-secondary tabular-nums")}>{Number(val).toLocaleString()}</span>;
  }
  return null;
}

/** Renders a list view of database pages with optional grouping and inline property tags. */
export function ListView() {
  const activeViewId = useActiveViewId();
  // Narrow selectors (MapView's fixed idiom): a bare useDatabaseStore() re-
  // rendered the list on EVERY store write in this database. useViewPages
  // subscribes pages; searchQuery is subscribed here because getPagesForView
  // filters by it — actions come off the store api (stable, no subscription).
  const views = useDatabaseStore(s => s.views);
  const databases = useDatabaseStore(s => s.databases);
  useDatabaseStore(s => s.searchQuery);
  const storeApi = useStoreApi();
  const { openPage, getPageTitle, addPage } = storeApi.getState();
  const view = activeViewId ? views[activeViewId] : null;
  const database = view ? databases[view.databaseId] : null;

  const viewPages = useViewPages(view?.id);
  const pager = useViewPager(viewPages, view?.settings?.loadLimit, view?.id);
  // Notion-mode grouping only — sidebar mode renders flat + sliced instead.
  const { groups, collapsed, toggleCollapse } = useStackedGroups(view?.id);
  const createRecord = useDefaultTemplateCreate(() => { if (database) addPage(database.id); });

  if (!view || !database) return null;

  const settings = view.settings || {};
  const showPageIcon = settings.showPageIcon !== false;
  const pageSize = resolvePageSize(settings.loadLimit);
  const hasGrouping = !!groups;

  const renderPageRow = (page: Page) => {
    const title = getPageTitle(page);
    const visibleProps = view.visibleProperties.map(id => database.properties[id]).filter(Boolean);
    const openThisPage = () => openPage(page.id);

    return (
      <div
        key={page.id}
        className={cn("flex items-center justify-between rounded-lg hover:bg-hover-surface group transition-colors text-left w-full")}
      >
        <button
          type="button"
          onClick={openThisPage}
          className={cn("flex min-w-0 flex-1 items-center justify-between py-2 pl-3 pr-2 text-left focus:outline-none focus:ring-2 focus:ring-accent/30")}
        >
          <span className={cn("flex items-center gap-2.5 overflow-hidden min-w-0")}>
            {showPageIcon && (
              page.icon
                ? <span className={cn("text-base shrink-0")}>{page.icon}</span>
                : <FileText className={cn("w-4 h-4 text-ink-muted shrink-0")} />
            )}
            <span className={cn("font-medium text-ink truncate")}>{title || <span className={cn("text-ink-muted")}>Untitled</span>}</span>
          </span>

          <span className={cn("flex items-center gap-3 shrink-0 ml-4")}>
            {visibleProps.filter(p => p.id !== database.titlePropertyId).map(prop =>
              renderListPropertyTag(prop, page.properties[prop.id])
            )}
          </span>
        </button>

        <button
          type="button"
          className={cn("mr-2 p-1 text-ink-muted hover:text-hover-text opacity-0 group-hover:opacity-100 transition-opacity rounded hover:bg-hover-surface2")}
          onClick={(event) => event.stopPropagation()}
          aria-label={`Open actions for ${title || 'Untitled'}`}
        >
          <MoreHorizontal className={cn("w-4 h-4")} />
        </button>
      </div>
    );
  };

  // Grouped rendering
  if (hasGrouping && groups) {
    return (
      <div className={cn("flex-1 overflow-auto p-4 bg-surface-primary")}>
        <div className={cn("max-w-4xl mx-auto flex flex-col gap-4")}>
          {groups.map(group => (
            <div key={group.groupId} data-testid="list-group-section">
              <GroupSectionHeader label={group.groupLabel} color={group.groupColor}
                count={group.pages.length} collapsed={collapsed.has(group.groupId)}
                onToggle={() => toggleCollapse(group.groupId)} />
              {!collapsed.has(group.groupId) && (
              <div className={cn("flex flex-col")}>
                {group.pages.slice(0, pageSize).map(renderPageRow)}
              </div>
              )}
              <button onClick={() => {
                if (!view.grouping) return;
                const groupPropId = view.grouping.propertyId;
                const val = group.groupId === '__unassigned__' ? null : group.groupId;
                addPage(database.id, { [groupPropId]: val });
              }}
                className={cn("flex items-center gap-2 px-3 py-1.5 text-sm text-ink-muted hover:text-hover-text hover:bg-hover-surface rounded-lg transition-colors ml-3")}>
                <Plus className={cn("w-3.5 h-3.5")} /> New in {group.groupLabel}
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Ungrouped rendering — the pager windows the flat list; the +New row stays
  // at the bottom of the current page.
  return (
    <div className={cn("flex-1 flex flex-col min-h-0")}>
      <ViewPaginationBar pager={pager} />
      <div className={cn("flex-1 overflow-auto p-4 bg-surface-primary")}>
        <div className={cn("max-w-4xl mx-auto flex flex-col gap-0.5")}>
          {pager.items.map(renderPageRow)}
          {pager.items.length === 0 && (
            <div className={cn("text-center py-16 text-ink-muted")}>
              <FileText className={cn("w-8 h-8 mx-auto mb-2 text-ink-disabled")} />
              No pages found
            </div>
          )}
          <button onClick={createRecord}
            className={cn("flex items-center gap-2 px-3 py-2 text-sm text-ink-muted hover:text-hover-text hover:bg-hover-surface rounded-lg transition-colors")}>
            <Plus className={cn("w-4 h-4")} /> New page
          </button>
        </div>
      </div>
    </div>
  );
}
