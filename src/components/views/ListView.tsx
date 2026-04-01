import React from 'react';
import { useDatabaseStore } from '../../store/useDatabaseStore';
import { useActiveViewId } from '../../hooks/useDatabaseScope';
import { FileText, MoreHorizontal, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { format } from 'date-fns';

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

  const renderPageRow = (page: any) => {
    const title = getPageTitle(page);
    const visibleProps = view.visibleProperties.map(id => database.properties[id]).filter(Boolean);

    return (
      <div key={page.id} onClick={() => openPage(page.id)}
        className="flex items-center justify-between py-2 px-3 hover:bg-hover-surface rounded-lg cursor-pointer group transition-colors">
        <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
          {showPageIcon && (
            page.icon
              ? <span className="text-base shrink-0">{page.icon}</span>
              : <FileText className="w-4 h-4 text-ink-muted shrink-0" />
          )}
          <span className="font-medium text-ink truncate">{title || <span className="text-ink-muted">Untitled</span>}</span>
        </div>

        <div className="flex items-center gap-3 shrink-0 ml-4">
          {visibleProps.filter(p => p.id !== database.titlePropertyId).map(prop => {
            const val = page.properties[prop.id];
            if (val === undefined || val === null || val === '') return null;

            if (prop.type === 'select' || prop.type === 'status') {
              const opt = prop.options?.find(o => o.id === val);
              return opt ? (
                <span key={prop.id} className={`px-2 py-0.5 rounded text-xs font-medium ${opt.color}`}>{opt.value}</span>
              ) : null;
            }
            if (prop.type === 'multi_select') {
              const ids: string[] = Array.isArray(val) ? val : [];
              return (
                <div key={prop.id} className="flex gap-1">
                  {ids.slice(0, 2).map(id => {
                    const opt = prop.options?.find(o => o.id === id);
                    return opt ? <span key={id} className={`px-1.5 py-0.5 rounded text-xs font-medium ${opt.color}`}>{opt.value}</span> : null;
                  })}
                  {ids.length > 2 && <span className="text-xs text-ink-muted">+{ids.length - 2}</span>}
                </div>
              );
            }
            if (prop.type === 'date') {
              return <span key={prop.id} className="text-xs text-ink-secondary">{format(new Date(val), 'MMM d')}</span>;
            }
            if (prop.type === 'user' || prop.type === 'person') {
              return (
                <div key={prop.id} className="flex items-center gap-1">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-gradient-accent-from to-gradient-accent-to text-ink-inverse flex items-center justify-center text-[10px] font-bold">
                    {String(val).charAt(0).toUpperCase()}
                  </div>
                </div>
              );
            }
            if (prop.type === 'checkbox') {
              return (
                <div key={prop.id} className={`w-4 h-4 rounded border-2 flex items-center justify-center ${val ? 'bg-accent border-accent-border' : 'border-line-medium'}`}>
                  {val && <span className="text-ink-inverse text-[10px]">✓</span>}
                </div>
              );
            }
            if (prop.type === 'number') {
              return <span key={prop.id} className="text-xs text-ink-secondary tabular-nums">{Number(val).toLocaleString()}</span>;
            }
            return null;
          })}

          <button className="p-1 text-ink-muted hover:text-hover-text opacity-0 group-hover:opacity-100 transition-opacity rounded hover:bg-hover-surface2">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  // Grouped rendering
  if (hasGrouping) {
    const groups = getGroupedPages(view.id);
    return (
      <div className="flex-1 overflow-auto p-4 bg-surface-primary">
        <div className="max-w-4xl mx-auto flex flex-col gap-4">
          {groups.map(group => (
            <div key={group.groupId}>
              <div className="flex items-center gap-2 px-3 py-2 mb-1">
                <ChevronDown className="w-3.5 h-3.5 text-ink-muted" />
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${group.groupColor}`}>{group.groupLabel}</span>
                <span className="text-xs text-ink-muted tabular-nums">{group.pages.length}</span>
              </div>
              <div className="flex flex-col">
                {group.pages.slice(0, loadLimit).map(renderPageRow)}
              </div>
              <button onClick={() => {
                const groupPropId = view.grouping!.propertyId;
                const val = group.groupId === '__unassigned__' ? null : group.groupId;
                addPage(database.id, { [groupPropId]: val });
              }}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-ink-muted hover:text-hover-text hover:bg-hover-surface rounded-lg transition-colors ml-3">
                <Plus className="w-3.5 h-3.5" /> New in {group.groupLabel}
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
    <div className="flex-1 overflow-auto p-4 bg-surface-primary">
      <div className="max-w-4xl mx-auto flex flex-col gap-0.5">
        {pages.map(renderPageRow)}
        {pages.length === 0 && (
          <div className="text-center py-16 text-ink-muted">
            <FileText className="w-8 h-8 mx-auto mb-2 text-ink-disabled" />
            No pages found
          </div>
        )}
        <button onClick={() => addPage(database.id)}
          className="flex items-center gap-2 px-3 py-2 text-sm text-ink-muted hover:text-hover-text hover:bg-hover-surface rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> New page
        </button>
      </div>
    </div>
  );
}
