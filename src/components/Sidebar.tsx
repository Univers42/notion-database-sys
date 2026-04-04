/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   Sidebar.tsx                                        :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:39:43 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/03 17:11:29 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { useDatabaseStore } from '../store/dbms/hardcoded/useDatabaseStore';
import {
  Database, ChevronDown, ChevronRight, Plus,
  Table, Kanban, Calendar, Clock, List, LayoutGrid, BarChart3, Rss, Map, LayoutDashboard
} from 'lucide-react';
import type { ViewType } from '../types/database';
import { cn } from '../utils/cn';

const VIEW_ICONS: Record<ViewType, React.ReactNode> = {
  table: <Table className={cn("w-3.5 h-3.5")} />,
  board: <Kanban className={cn("w-3.5 h-3.5")} />,
  calendar: <Calendar className={cn("w-3.5 h-3.5")} />,
  timeline: <Clock className={cn("w-3.5 h-3.5")} />,
  list: <List className={cn("w-3.5 h-3.5")} />,
  gallery: <LayoutGrid className={cn("w-3.5 h-3.5")} />,
  chart: <BarChart3 className={cn("w-3.5 h-3.5")} />,
  feed: <Rss className={cn("w-3.5 h-3.5")} />,
  map: <Map className={cn("w-3.5 h-3.5")} />,
  dashboard: <LayoutDashboard className={cn("w-3.5 h-3.5")} />,
};

export type SidebarSlots = {
  root?: string;
  header?: string;
  headerInner?: string;
  headerIcon?: string;
  headerTitle?: string;
  tree?: string;
  sectionLabel?: string;
  dbItem?: string;
  dbButton?: string;
  dbChevron?: string;
  dbIcon?: string;
  dbName?: string;
  dbCount?: string;
  viewList?: string;
  viewButton?: string;
  viewIcon?: string;
  viewName?: string;
  addViewButton?: string;
  footer?: string;
  footerText?: string;
};

export function Sidebar({ slots = {} }: Readonly<{ slots?: Partial<SidebarSlots> }>) {
  const databases = useDatabaseStore(s => s.databases);
  const views = useDatabaseStore(s => s.views);
  const activeViewId = useDatabaseStore(s => s.activeViewId);
  const { setActiveView, addView } = useDatabaseStore.getState();
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});

  const dbList = Object.values(databases);

  return (
    <div className={cn('w-60 bg-surface-secondary border-r border-line flex flex-col h-full select-none', slots.root)}>
      {/* Workspace header */}
      <div className={cn('px-4 py-3 border-b border-line', slots.header)}>
        <div className={cn('flex items-center gap-2', slots.headerInner)}>
          <div className={cn('w-6 h-6 rounded bg-gradient-to-br from-gradient-brand-from to-gradient-brand-to flex items-center justify-center text-ink-inverse text-xs font-bold', slots.headerIcon)}>N</div>
          <span className={cn('text-sm font-semibold text-ink', slots.headerTitle)}>Workspace</span>
        </div>
      </div>

      {/* Database tree */}
      <div className={cn('flex-1 overflow-auto py-2', slots.tree)}>
        <div className={cn('px-3 py-1.5 text-[10px] font-semibold text-ink-muted uppercase tracking-wider', slots.sectionLabel)}>Databases</div>
        {dbList.map(db => {
          const isCollapsed = collapsed[db.id];
          const dbViews = Object.values(views).filter(v => v.databaseId === db.id);
          const isActiveDb = dbViews.some(v => v.id === activeViewId);

          return (
            <div key={db.id} className={cn('mb-0.5', slots.dbItem)}>
              <button onClick={() => setCollapsed(c => ({ ...c, [db.id]: !c[db.id] }))}
                className={cn('w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors group', isActiveDb ? 'text-ink' : 'text-ink-body-light hover:text-hover-text-boldest hover:bg-hover-surface2', slots.dbButton)}>
                {isCollapsed
                  ? <ChevronRight className={cn('w-3.5 h-3.5 text-ink-muted shrink-0', slots.dbChevron)} />
                  : <ChevronDown className={cn('w-3.5 h-3.5 text-ink-muted shrink-0', slots.dbChevron)} />
                }
                {db.icon ? <span className={cn("text-base")}>{db.icon}</span> : <Database className={cn('w-4 h-4 text-ink-muted', slots.dbIcon)} />}
                <span className={cn('font-medium truncate', slots.dbName)}>{db.name}</span>
                <span className={cn('text-xs text-ink-muted ml-auto tabular-nums opacity-0 group-hover:opacity-100 transition-opacity', slots.dbCount)}>{dbViews.length}</span>
              </button>

              {!isCollapsed && (
                <div className={cn('ml-5 flex flex-col gap-px py-0.5', slots.viewList)}>
                  {dbViews.map(v => (
                    <button key={v.id} onClick={() => setActiveView(v.id)}
                      className={cn('w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors', v.id === activeViewId
                        ? 'bg-surface-primary text-ink font-medium shadow-sm border border-line'
                        : 'text-ink-secondary hover:text-hover-text-strong hover:bg-hover-surface2',
                        slots.viewButton)}>
                      <span className={cn('text-ink-muted', slots.viewIcon)}>{VIEW_ICONS[v.type]}</span>
                      <span className={cn('truncate', slots.viewName)}>{v.name}</span>
                    </button>
                  ))}
                  <button onClick={() => addView({ databaseId: db.id, type: 'table', name: 'New View', filters: [], filterConjunction: 'and', sorts: [], visibleProperties: [], settings: {} })}
                    className={cn('flex items-center gap-2 px-3 py-1 text-xs text-ink-muted hover:text-hover-text hover:bg-hover-surface2 rounded-lg transition-colors', slots.addViewButton)}>
                    <Plus className={cn("w-3 h-3")} /> Add view
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className={cn('border-t border-line px-4 py-3', slots.footer)}>
        <div className={cn('text-xs text-ink-muted', slots.footerText)}>
          {dbList.length} databases &middot; {Object.keys(views).length} views
        </div>
      </div>
    </div>
  );
}
