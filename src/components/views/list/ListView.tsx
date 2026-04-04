/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ListView.tsx                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:38:41 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/03 00:12:11 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { useDatabaseStore } from '../../../store/dbms/hardcoded/useDatabaseStore';
import { useActiveViewId } from '../../../hooks/useDatabaseScope';
import { FileText, MoreHorizontal, ChevronDown, Plus } from 'lucide-react';
import type { Page } from '../../../types/database';
import { format } from 'date-fns';
import { cn } from '../../../utils/cn';

export function ListView() {
  const activeViewId = useActiveViewId();
  const { views, databases, getPagesForView, openPage, getPageTitle, addPage, getGroupedPages } = useDatabaseStore();
  const view = activeViewId ? views[activeViewId] : null;
  const database = view ? databases[view.databaseId] : null;

  if (!view || !database) return null;

  const settings = view.settings || {};
  const showPageIcon = settings.showPageIcon !== false;
  const loadLimit = settings.loadLimit || 50;
  const hasGrouping = !!view.grouping;

  const renderPageRow = (page: Page) => {
    const title = getPageTitle(page);
    const visibleProps = view.visibleProperties.map(id => database.properties[id]).filter(Boolean);

    return (
      <button type="button" key={page.id} onClick={() => openPage(page.id)}
        className={cn("flex items-center justify-between py-2 px-3 hover:bg-hover-surface rounded-lg cursor-pointer group transition-colors text-left w-full")}>
        <div className={cn("flex items-center gap-2.5 overflow-hidden min-w-0")}>
          {showPageIcon && (
            page.icon
              ? <span className={cn("text-base shrink-0")}>{page.icon}</span>
              : <FileText className={cn("w-4 h-4 text-ink-muted shrink-0")} />
          )}
          <span className={cn("font-medium text-ink truncate")}>{title || <span className={cn("text-ink-muted")}>Untitled</span>}</span>
        </div>

        <div className={cn("flex items-center gap-3 shrink-0 ml-4")}>
          {visibleProps.filter(p => p.id !== database.titlePropertyId).map(prop => {
            const val = page.properties[prop.id];
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
              return <span key={prop.id} className={cn("text-xs text-ink-secondary")}>{format(new Date(val), 'MMM d')}</span>;
            }
            if (prop.type === 'user' || prop.type === 'person') {
              return (
                <div key={prop.id} className={cn("flex items-center gap-1")}>
                  <div className={cn("w-5 h-5 rounded-full bg-gradient-to-br from-gradient-accent-from to-gradient-accent-to text-ink-inverse flex items-center justify-center text-[10px] font-bold")}>
                    {String(val).charAt(0).toUpperCase()}
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
          })}

          <button className={cn("p-1 text-ink-muted hover:text-hover-text opacity-0 group-hover:opacity-100 transition-opacity rounded hover:bg-hover-surface2")}>
            <MoreHorizontal className={cn("w-4 h-4")} />
          </button>
        </div>
      </button>
    );
  };

  // Grouped rendering
  if (hasGrouping) {
    const groups = getGroupedPages(view.id);
    return (
      <div className={cn("flex-1 overflow-auto p-4 bg-surface-primary")}>
        <div className={cn("max-w-4xl mx-auto flex flex-col gap-4")}>
          {groups.map(group => (
            <div key={group.groupId}>
              <div className={cn("flex items-center gap-2 px-3 py-2 mb-1")}>
                <ChevronDown className={cn("w-3.5 h-3.5 text-ink-muted")} />
                <span className={cn(`px-2 py-0.5 rounded text-xs font-semibold ${group.groupColor}`)}>{group.groupLabel}</span>
                <span className={cn("text-xs text-ink-muted tabular-nums")}>{group.pages.length}</span>
              </div>
              <div className={cn("flex flex-col")}>
                {group.pages.slice(0, loadLimit).map(renderPageRow)}
              </div>
              <button onClick={() => {
                const groupPropId = view.grouping!.propertyId;
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

  // Ungrouped rendering
  const pages = getPagesForView(view.id).slice(0, loadLimit);
  return (
    <div className={cn("flex-1 overflow-auto p-4 bg-surface-primary")}>
      <div className={cn("max-w-4xl mx-auto flex flex-col gap-0.5")}>
        {pages.map(renderPageRow)}
        {pages.length === 0 && (
          <div className={cn("text-center py-16 text-ink-muted")}>
            <FileText className={cn("w-8 h-8 mx-auto mb-2 text-ink-disabled")} />
            No pages found
          </div>
        )}
        <button onClick={() => addPage(database.id)}
          className={cn("flex items-center gap-2 px-3 py-2 text-sm text-ink-muted hover:text-hover-text hover:bg-hover-surface rounded-lg transition-colors")}>
          <Plus className={cn("w-4 h-4")} /> New page
        </button>
      </div>
    </div>
  );
}
