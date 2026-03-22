import React from 'react';
import { useDatabaseStore } from '../store/useDatabaseStore';
import {
  Database, ChevronDown, ChevronRight, Plus,
  Table, Kanban, Calendar, Clock, List, LayoutGrid, BarChart3, Rss, Map, LayoutDashboard
} from 'lucide-react';
import type { ViewType } from '../types/database';

const VIEW_ICONS: Record<ViewType, React.ReactNode> = {
  table: <Table className="w-3.5 h-3.5" />,
  board: <Kanban className="w-3.5 h-3.5" />,
  calendar: <Calendar className="w-3.5 h-3.5" />,
  timeline: <Clock className="w-3.5 h-3.5" />,
  list: <List className="w-3.5 h-3.5" />,
  gallery: <LayoutGrid className="w-3.5 h-3.5" />,
  chart: <BarChart3 className="w-3.5 h-3.5" />,
  feed: <Rss className="w-3.5 h-3.5" />,
  map: <Map className="w-3.5 h-3.5" />,
  dashboard: <LayoutDashboard className="w-3.5 h-3.5" />,
};

export function Sidebar() {
  const databases = useDatabaseStore(s => s.databases);
  const views = useDatabaseStore(s => s.views);
  const activeViewId = useDatabaseStore(s => s.activeViewId);
  const { setActiveView, addView } = useDatabaseStore.getState();
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});

  const dbList = Object.values(databases);

  return (
    <div className="w-60 bg-gray-50 border-r border-gray-200 flex flex-col h-full select-none">
      {/* Workspace header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">N</div>
          <span className="text-sm font-semibold text-gray-900">Workspace</span>
        </div>
      </div>

      {/* Database tree */}
      <div className="flex-1 overflow-auto py-2">
        <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Databases</div>
        {dbList.map(db => {
          const isCollapsed = collapsed[db.id];
          const dbViews = Object.values(views).filter(v => v.databaseId === db.id);
          const isActiveDb = dbViews.some(v => v.id === activeViewId);

          return (
            <div key={db.id} className="mb-0.5">
              <button onClick={() => setCollapsed(c => ({ ...c, [db.id]: !c[db.id] }))}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors group ${isActiveDb ? 'text-gray-900' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}>
                {isCollapsed
                  ? <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  : <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                }
                {db.icon ? <span className="text-base">{db.icon}</span> : <Database className="w-4 h-4 text-gray-400" />}
                <span className="font-medium truncate">{db.name}</span>
                <span className="text-xs text-gray-400 ml-auto tabular-nums opacity-0 group-hover:opacity-100 transition-opacity">{dbViews.length}</span>
              </button>

              {!isCollapsed && (
                <div className="ml-5 flex flex-col gap-px py-0.5">
                  {dbViews.map(v => (
                    <button key={v.id} onClick={() => setActiveView(v.id)}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${v.id === activeViewId
                        ? 'bg-white text-gray-900 font-medium shadow-sm border border-gray-200'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                        }`}>
                      <span className="text-gray-400">{VIEW_ICONS[v.type]}</span>
                      <span className="truncate">{v.name}</span>
                    </button>
                  ))}
                  <button onClick={() => addView(db.id, 'table', 'New View')}
                    className="flex items-center gap-2 px-3 py-1 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                    <Plus className="w-3 h-3" /> Add view
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 px-4 py-3">
        <div className="text-xs text-gray-400">
          {dbList.length} databases &middot; {Object.keys(views).length} views
        </div>
      </div>
    </div>
  );
}
