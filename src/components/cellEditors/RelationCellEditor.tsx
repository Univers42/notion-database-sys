/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   RelationCellEditor.tsx                             :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:36:03 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 16:36:04 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState, useMemo } from 'react';
import { useDatabaseStore } from '../../store/useDatabaseStore';
import type { SchemaProperty } from '../../types/database';
import { X, Search, ArrowUpRight, ExternalLink, CheckCircle2 } from 'lucide-react';
import { CellPortal } from './CellPortal';

interface RelationCellEditorProps {
  property: SchemaProperty;
  value: any;
  pageId: string;
  databaseId: string;
  onUpdate: (v: any) => void;
  onClose: () => void;
}

export function RelationCellEditor({ property, value, pageId, databaseId, onUpdate, onClose }: RelationCellEditorProps) {
  const [search, setSearch] = useState('');
  const databases = useDatabaseStore(s => s.databases);
  const pages = useDatabaseStore(s => s.pages);

  const targetDbId = property.relationConfig?.databaseId;
  const targetDb = targetDbId ? databases[targetDbId] : null;
  const titlePropId = targetDb?.titlePropertyId;
  const selectedIds: string[] = Array.isArray(value) ? value : [];

  const targetPages = useMemo(() => {
    if (!targetDbId) return [];
    return Object.values(pages)
      .filter(p => p.databaseId === targetDbId && p.id !== pageId)
      .map(p => ({
        id: p.id,
        title: titlePropId ? (p.properties[titlePropId] || 'Untitled') : p.id,
      }));
  }, [targetDbId, pages, pageId, titlePropId]);

  const filteredPages = useMemo(() => {
    const q = search.toLowerCase();
    return targetPages.filter(p => p.title.toLowerCase().includes(q));
  }, [targetPages, search]);

  const toggleRelation = (rid: string) => {
    const next = selectedIds.includes(rid)
      ? selectedIds.filter(id => id !== rid)
      : [...selectedIds, rid];
    onUpdate(next);
  };

  if (!targetDb) {
    return (
      <CellPortal onClose={onClose}>
        <UnconfiguredRelation />
      </CellPortal>
    );
  }

  return (
    <CellPortal onClose={onClose} minWidth={340} maxWidth={560}>
      <SearchBar search={search} setSearch={setSearch} onClose={onClose} targetDb={targetDb} />
      <SelectedChips selectedIds={selectedIds} targetPages={targetPages} onRemove={rid => onUpdate(selectedIds.filter(id => id !== rid))} />
      <PageList filteredPages={filteredPages} selectedIds={selectedIds} search={search} onToggle={toggleRelation} />
    </CellPortal>
  );
}

function UnconfiguredRelation() {
  return (
    <div className="p-4 text-center">
      <ExternalLink className="w-8 h-8 text-ink-disabled mx-auto mb-2" />
      <p className="text-sm text-ink-secondary">Relation not configured yet.</p>
      <p className="text-xs text-ink-muted mt-1">Click the column header → "Edit relation" to set it up.</p>
    </div>
  );
}

function SearchBar({ search, setSearch, onClose, targetDb }: {
  search: string; setSearch: (s: string) => void; onClose: () => void; targetDb: { icon?: string; name: string };
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-line-light bg-surface-secondary-soft">
      <Search className="w-4 h-4 text-ink-muted shrink-0" />
      <input autoFocus type="text" value={search} onChange={e => setSearch(e.target.value)}
        onKeyDown={e => { if (e.key === 'Escape') onClose(); }}
        className="flex-1 text-sm bg-transparent outline-none placeholder:text-placeholder" placeholder="Link or create a page…" />
      <div className="flex items-center gap-1 text-xs text-ink-muted shrink-0">
        <span>In</span>
        <span className="flex items-center gap-1 px-1.5 py-0.5 bg-surface-tertiary rounded text-ink-body-light font-medium">
          {targetDb.icon && <span>{targetDb.icon}</span>}
          <span className="max-w-[100px] truncate">{targetDb.name}</span>
        </span>
      </div>
    </div>
  );
}

function SelectedChips({ selectedIds, targetPages, onRemove }: {
  selectedIds: string[]; targetPages: { id: string; title: string }[]; onRemove: (rid: string) => void;
}) {
  if (selectedIds.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-line-light">
      {selectedIds.map(rid => {
        const tp = targetPages.find(p => p.id === rid);
        return (
          <span key={rid} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent-soft text-accent-text text-xs font-medium">
            <ArrowUpRight className="w-2.5 h-2.5" />
            <span className="max-w-[120px] truncate">{tp?.title || 'Untitled'}</span>
            <button onClick={() => onRemove(rid)} className="hover:text-hover-accent-text-bolder ml-0.5"><X className="w-3 h-3" /></button>
          </span>
        );
      })}
    </div>
  );
}

function PageList({ filteredPages, selectedIds, search, onToggle }: {
  filteredPages: { id: string; title: string }[]; selectedIds: string[]; search: string; onToggle: (id: string) => void;
}) {
  return (
    <div className="max-h-[300px] overflow-y-auto">
      {filteredPages.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-ink-muted">
          {search ? 'No matching pages' : 'No pages in this database'}
        </div>
      ) : filteredPages.map(p => {
        const isSelected = selectedIds.includes(p.id);
        return (
          <button key={p.id} onClick={() => onToggle(p.id)}
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-hover-surface transition-colors ${isSelected ? 'bg-accent-soft2' : ''}`}>
            <ArrowUpRight className="w-3.5 h-3.5 text-ink-muted shrink-0" />
            <span className="flex-1 truncate text-ink-body">{p.title}</span>
            {isSelected && <CheckCircle2 className="w-4 h-4 text-accent-text-soft shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}
