import React, { useState } from 'react';
import { useDatabaseStore } from '../../store/useDatabaseStore';
import { useActiveViewId } from '../../hooks/useDatabaseScope';
import { Plus, Image, ArrowUpRight } from 'lucide-react';
import { CURSORS } from '../ui/cursors';
import { format } from 'date-fns';

export function BoardView() {
  const activeViewId = useActiveViewId();
  const { views, databases, updatePageProperty, addPage, getPageTitle, openPage, getGroupedPages } = useDatabaseStore();
  const view = activeViewId ? views[activeViewId] : null;
  const database = view ? databases[view.databaseId] : null;
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [, setDragPageId] = useState<string | null>(null);

  if (!view || !database || !view.grouping) {
    return (
      <div className="flex-1 flex items-center justify-center text-ink-secondary bg-surface-secondary">
        <div className="text-center">
          <p className="text-lg font-medium mb-2">Board view requires grouping</p>
          <p className="text-sm text-ink-muted">Configure a grouping property in view settings</p>
        </div>
      </div>
    );
  }

  const groupProperty = database.properties[view.grouping.propertyId];
  if (!groupProperty || (groupProperty.type !== 'select' && groupProperty.type !== 'status')) {
    return <div className="flex-1 flex items-center justify-center text-ink-secondary bg-surface-secondary">Board view requires a select or status property for grouping.</div>;
  }

  const groups = getGroupedPages(view.id);
  const settings = view.settings || {};
  const cardSize = settings.cardSize || 'medium';
  const loadLimit = settings.loadLimit || 50;
  const wrapContent = settings.wrapContent === true;
  const cardPreview = settings.cardPreview || 'none';

  const visibleProps = view.visibleProperties.map(id => database.properties[id]).filter(Boolean);
  const nonTitleGroupProps = visibleProps.filter(p => p.id !== groupProperty.id && p.id !== database.titlePropertyId);

  const coverColors = [
    'bg-gradient-to-br from-gradient-blue-from to-gradient-blue-to',
    'bg-gradient-to-br from-gradient-purple-card-from to-gradient-purple-card-to',
    'bg-gradient-to-br from-gradient-green-from to-gradient-green-to',
    'bg-gradient-to-br from-gradient-orange-from to-gradient-orange-to',
    'bg-gradient-to-br from-gradient-pink-from to-gradient-pink-to',
    'bg-gradient-to-br from-gradient-cyan-from to-gradient-cyan-to',
  ];

  const renderBoardPropertyValue = (prop: any, val: any) => {
    if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) return null;
    if (prop.type === 'select' || prop.type === 'status') {
      const opt = prop.options?.find((o: any) => o.id === val);
      return opt ? <span className={`inline-block w-fit px-2 py-0.5 rounded text-xs font-medium ${opt.color}`}>{opt.value}</span> : null;
    }
    if (prop.type === 'multi_select') {
      const ids: string[] = Array.isArray(val) ? val : [];
      return (
        <div className={`flex gap-1 ${wrapContent ? 'flex-wrap' : 'flex-nowrap overflow-hidden'}`}>
          {ids.map(id => {
            const opt = prop.options?.find((o: any) => o.id === id);
            return opt ? <span key={id} className={`px-1.5 py-0.5 rounded text-xs font-medium ${opt.color}`}>{opt.value}</span> : null;
          })}
        </div>
      );
    }
    if (prop.type === 'date') return <div className="text-xs text-ink-secondary">{format(new Date(val), 'MMM d')}</div>;
    if (prop.type === 'user' || prop.type === 'person') {
      return (
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-gradient-accent-from to-gradient-accent-to text-ink-inverse flex items-center justify-center text-[8px] font-bold">{String(val).charAt(0).toUpperCase()}</div>
          <span className="text-xs text-ink-body-light">{val}</span>
        </div>
      );
    }
    if (prop.type === 'number') return <div className="text-xs text-ink-secondary tabular-nums">{prop.name}: {Number(val).toLocaleString()}</div>;
    if (prop.type === 'checkbox') {
      return (
        <div className="flex items-center gap-1">
          <div className={`w-3.5 h-3.5 rounded border ${val ? 'bg-accent border-accent-border' : 'border-line-medium'} flex items-center justify-center`}>
            {val && <span className="text-ink-inverse text-[8px]">✓</span>}
          </div>
          <span className="text-xs text-ink-secondary">{prop.name}</span>
        </div>
      );
    }
    return null;
  };

  const getColumnWidth = () => {
    switch (cardSize) {
      case 'small': return 'w-56';
      case 'large': return 'w-80';
      case 'xl': return 'w-96';
      default: return 'w-72';
    }
  };

  const handleDragStart = (e: React.DragEvent, pageId: string) => {
    setDragPageId(pageId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', pageId);
    // Add drag image styling
    const el = e.currentTarget as HTMLElement;
    el.style.opacity = '0.5';
    setTimeout(() => { el.style.opacity = '1'; }, 0);
  };

  const handleDrop = (e: React.DragEvent, groupId: string) => {
    e.preventDefault();
    setDragOverCol(null);
    setDragPageId(null);
    const pageId = e.dataTransfer.getData('text/plain');
    if (pageId && groupProperty) {
      const newValue = groupId === '__unassigned__' ? null : groupId;
      updatePageProperty(pageId, groupProperty.id, newValue);
    }
  };

  const handleDragOver = (e: React.DragEvent, groupId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol(groupId);
  };

  const handleDragLeave = () => {
    setDragOverCol(null);
  };

  return (
    <div className="flex-1 overflow-x-auto p-4 bg-surface-secondary flex gap-4 h-full">
      {groups.map(group => {
        const isDragOver = dragOverCol === group.groupId;
        const displayPages = group.pages.slice(0, loadLimit);

        return (
          <div key={group.groupId}
            className={`flex flex-col shrink-0 ${getColumnWidth()} rounded-xl transition-colors ${
              isDragOver ? 'bg-accent-soft ring-2 ring-ring-accent-muted ring-inset' : ''
            }`}
            onDrop={e => handleDrop(e, group.groupId)}
            onDragOver={e => handleDragOver(e, group.groupId)}
            onDragLeave={handleDragLeave}>

            {/* Column Header */}
            <div className="flex items-center justify-between mb-3 px-2">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${group.groupColor}`}>
                  {group.groupLabel}
                </span>
                <span className="text-xs text-ink-muted font-medium tabular-nums">{displayPages.length}</span>
              </div>
              <button
                onClick={() => addPage(database.id, { [groupProperty.id]: group.groupId === '__unassigned__' ? null : group.groupId })}
                className="p-1 hover:bg-hover-surface-white-soft rounded text-ink-muted hover:text-hover-text transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Cards */}
            <div className={`flex flex-col gap-2 min-h-[120px] pb-10 px-1`}>
              {displayPages.map((page, pageIdx) => {
                const title = getPageTitle(page);
                const coverColor = coverColors[pageIdx % coverColors.length];

                const renderCardPreview = () => {
                  if (cardPreview === 'none') return null;

                  if (cardPreview === 'page_cover') {
                    return (
                      <div className={`h-24 ${coverColor} flex items-center justify-center rounded-t-lg -mx-3 -mt-3 mb-2 overflow-hidden`}>
                        {page.cover ? (
                          <img src={page.cover} alt="" className="w-full h-full object-cover" />
                        ) : page.icon ? (
                          <span className="text-3xl">{page.icon}</span>
                        ) : (
                          <Image className="w-6 h-6 text-ink-disabled" />
                        )}
                      </div>
                    );
                  }

                  if (cardPreview === 'page_content') {
                    const textContent = page.content?.map((b: any) => b.content).filter(Boolean).join(' ') || '';
                    return (
                      <div className={`h-16 ${coverColor} rounded -mx-3 -mt-3 mb-2 p-2 overflow-hidden relative`}>
                        <p className="text-[10px] text-ink-secondary leading-relaxed line-clamp-3">{textContent || 'No content'}</p>
                        <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-gradient-fade-from to-transparent" />
                      </div>
                    );
                  }

                  if (cardPreview === 'page_properties') {
                    return (
                      <div className="bg-surface-secondary rounded -mx-3 -mt-3 mb-2 p-2 overflow-hidden">
                        {nonTitleGroupProps.slice(0, 3).map(prop => {
                          const val = page.properties[prop.id];
                          const rendered = renderBoardPropertyValue(prop, val);
                          if (!rendered) return null;
                          return (
                            <div key={prop.id} className="flex items-center gap-1.5 mb-1">
                              <span className="text-[9px] uppercase text-ink-muted tracking-wide shrink-0 w-12 truncate">{prop.name}</span>
                              {rendered}
                            </div>
                          );
                        })}
                      </div>
                    );
                  }

                  return null;
                };

                return (
                  <div key={page.id} draggable
                    onDragStart={e => handleDragStart(e, page.id)}
                    onClick={() => openPage(page.id)}
                    style={{ cursor: CURSORS.grab }}
                    className="bg-surface-primary p-3 rounded-lg shadow-sm border border-line active:cursor-grabbing hover:shadow-md hover:border-hover-border transition-all group/card">

                    {/* Card Preview */}
                    {renderCardPreview()}

                    {/* Title */}
                    <div className="flex items-center gap-1 mb-1">
                      <div className={`font-medium text-sm text-ink flex-1 min-w-0 ${wrapContent ? 'break-words' : 'truncate'}`}>
                        {page.icon && <span className="mr-1">{page.icon}</span>}
                        {title || <span className="text-ink-muted">Untitled</span>}
                      </div>
                      <button
                        className="shrink-0 flex items-center gap-0.5 text-[9px] font-medium text-accent-text-soft bg-accent-soft hover:bg-hover-accent-muted px-1 py-0.5 rounded opacity-0 group-hover/card:opacity-100 transition-opacity"
                        onClick={(e) => { e.stopPropagation(); openPage(page.id); }}>
                        <ArrowUpRight className="w-2.5 h-2.5" /> Open
                      </button>
                    </div>

                    {/* Properties (skip when page_properties preview shown) */}
                    {cardPreview !== 'page_properties' && (
                      <div className="flex flex-col gap-1.5 mt-2">
                        {nonTitleGroupProps.map(prop => {
                          const val = page.properties[prop.id];
                          const rendered = renderBoardPropertyValue(prop, val);
                          if (!rendered) return null;
                          return <React.Fragment key={prop.id}>{rendered}</React.Fragment>;
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Add card button */}
              <button
                onClick={() => addPage(database.id, { [groupProperty.id]: group.groupId === '__unassigned__' ? null : group.groupId })}
                className="flex items-center gap-2 text-sm text-ink-muted hover:text-hover-text hover:bg-hover-surface-white-soft2 p-2 rounded-lg transition-colors w-full">
                <Plus className="w-4 h-4" /> New
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
