/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   BoardView.tsx                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:38:02 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/03 00:11:20 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState } from 'react';
import { useDatabaseStore } from '../../../store/dbms/hardcoded/useDatabaseStore';
import { useActiveViewId } from '../../../hooks/useDatabaseScope';
import { Plus } from 'lucide-react';
import { getColumnWidth, BoardCard } from './BoardCardHelpers';

export function BoardView() {
  const activeViewId = useActiveViewId();
  const { views, databases, updatePageProperty, addPage, getPageTitle, openPage, getGroupedPages } = useDatabaseStore();
  const view = activeViewId ? views[activeViewId] : null;
  const database = view ? databases[view.databaseId] : null;
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [_dragPageId, setDragPageId] = useState<string | null>(null);

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
            className={`flex flex-col shrink-0 ${getColumnWidth(cardSize)} rounded-xl transition-colors ${
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
              {displayPages.map((page, pageIdx) => (
                <BoardCard key={page.id} page={page} pageIdx={pageIdx}
                  cardPreview={cardPreview} wrapContent={wrapContent}
                  nonTitleGroupProps={nonTitleGroupProps} openPage={openPage}
                  getPageTitle={getPageTitle} onDragStart={handleDragStart} />
              ))}

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
