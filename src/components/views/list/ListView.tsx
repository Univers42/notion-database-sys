/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ListView.tsx                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:38:41 by dlesieur          #+#    #+#             */
/*   Updated: 2026/10/26 18:40:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { useDatabaseStore, useStoreApi } from '../../../store/dbms/hardcoded/useDatabaseStore';
import { useDefaultTemplateCreate } from '../useDefaultTemplateCreate';
import { useCanCreateRecords } from '../../../hooks/useHostAdapters';
import { useActiveViewId } from '../../../hooks/useDatabaseScope';
import { FileText, Plus } from 'lucide-react';
import type { Page } from '../../../types/database';
import { cn } from '../../../utils/cn';
import { useViewPages } from '../../../hooks/useViewPages';
import { useViewPager, resolvePageSize } from '../../../hooks/useViewPager';
import { ViewPaginationBar } from '../shared/ViewPaginationBar';
import { useStackedGroups } from '../../../hooks/useViewGrouping';
import { GroupSectionHeader } from '../shared/GroupSectionHeader';
import { CardPropertyValue, hasCardValue } from '../shared/CardPropertyValue';

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
  const canCreate = useCanCreateRecords();

  if (!view || !database) return null;

  const settings = view.settings || {};
  const showPageIcon = settings.showPageIcon !== false;
  const pageSize = resolvePageSize(settings.loadLimit);
  const hasGrouping = !!groups;

  const listedProps = view.visibleProperties
    .map(id => database.properties[id])
    .filter(prop => prop && prop.id !== database.titlePropertyId);

  // Notion's row: icon and title on the left, the page's set properties
  // right-aligned in one line; the whole row opens the page.
  const renderPageRow = (page: Page) => {
    const title = getPageTitle(page);
    return (
      <button
        key={page.id}
        type="button"
        onClick={() => openPage(page.id)}
        className={cn("flex items-center gap-3 h-[34px] px-2 w-full rounded text-left text-sm hover:bg-hover-surface transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring-accent-muted")}
      >
        {showPageIcon && (
          page.icon
            ? <span className={cn("w-5 text-center text-base leading-none shrink-0")}>{page.icon}</span>
            : <FileText className={cn("w-4 h-4 text-ink-muted shrink-0")} />
        )}
        <span className={cn("flex-1 min-w-0 truncate font-medium text-ink")}>
          {title || <span className={cn("text-ink-muted")}>Untitled</span>}
        </span>
        <span className={cn("flex items-center justify-end gap-3 min-w-0 max-w-[60%] overflow-hidden")}>
          {listedProps.filter(prop => hasCardValue(prop, page.properties[prop.id])).map(prop => (
            <span key={prop.id} className={cn("flex min-w-0 max-w-40 shrink-0")}>
              <CardPropertyValue prop={prop} val={page.properties[prop.id]} page={page} databaseId={database.id} wrap={false} />
            </span>
          ))}
        </span>
      </button>
    );
  };

  // Grouped rendering
  if (hasGrouping && groups) {
    return (
      <div className={cn("flex-1 overflow-auto px-4 py-2 bg-surface-primary")}>
        <div className={cn("flex flex-col gap-4")}>
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
              {canCreate && <button onClick={() => {
                if (!view.grouping) return;
                const groupPropId = view.grouping.propertyId;
                const val = group.groupId === '__unassigned__' ? null : group.groupId;
                addPage(database.id, { [groupPropId]: val });
              }}
                className={cn("flex items-center gap-2 h-[34px] px-2 w-full text-sm text-ink-muted hover:text-hover-text hover:bg-hover-surface rounded transition-colors")}>
                <Plus className={cn("w-3.5 h-3.5")} /> New in {group.groupLabel}
              </button>}
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
      <div className={cn("flex-1 overflow-auto px-4 py-2 bg-surface-primary")}>
        <div className={cn("flex flex-col")}>
          {pager.items.map(renderPageRow)}
          {pager.items.length === 0 && (
            <div className={cn("text-center py-16 text-ink-muted")}>
              <FileText className={cn("w-8 h-8 mx-auto mb-2 text-ink-disabled")} />
              No pages found
            </div>
          )}
          {canCreate && <button onClick={createRecord}
            className={cn("flex items-center gap-2 h-[34px] px-2 w-full text-sm text-ink-muted hover:text-hover-text hover:bg-hover-surface rounded transition-colors")}>
            <Plus className={cn("w-4 h-4")} /> New page
          </button>}
        </div>
      </div>
    </div>
  );
}
