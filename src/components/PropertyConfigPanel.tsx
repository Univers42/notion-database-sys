/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   PropertyConfigPanel.tsx                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:39:33 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 17:33:29 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState, useRef, useEffect } from 'react';
import { useDatabaseStore } from '../store/useDatabaseStore';
import type { PropertyType, SchemaProperty } from '../types/database';
import { FormulaEditorPanel } from './FormulaEditorPanel';
import { RelationEditorPanel } from './RelationEditorPanel';
import { RollupEditorPanel } from './RollupEditorPanel';
import { ActionButton, PropertyIconButton, IdFormatConfig, TYPE_OPTIONS, getPropIcon } from './propertyConfig';
import {
  ArrowUp, ArrowDown, Filter, Group, EyeOff, PanelLeftClose,
  PanelRightClose, Trash2, ChevronRight, Sigma, GitBranch, ExternalLink
} from 'lucide-react';

interface PropertyConfigPanelProps {
  property: SchemaProperty;
  databaseId: string;
  viewId: string;
  position: { top: number; left: number };
  onClose: () => void;
}

export function PropertyConfigPanel({ property, databaseId, viewId, position, onClose }: PropertyConfigPanelProps) {
  const {
    updateProperty, deleteProperty, togglePropertyVisibility,
    addSort, addFilter, setGrouping, insertPropertyAt, views,
  } = useDatabaseStore();

  const [propName, setPropName] = useState(property.name);
  const [showTypeList, setShowTypeList] = useState(false);
  const [typeSearch, setTypeSearch] = useState('');
  const [showFormulaEditor, setShowFormulaEditor] = useState(false);
  const [showRelationEditor, setShowRelationEditor] = useState(false);
  const [showRollupEditor, setShowRollupEditor] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { nameRef.current?.select(); }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const commitName = () => {
    if (propName.trim() && propName.trim() !== property.name)
      updateProperty(databaseId, property.id, { name: propName.trim() });
  };

  const changeType = (newType: PropertyType) => {
    if (newType !== property.type) updateProperty(databaseId, property.id, { type: newType });
    setShowTypeList(false);
  };

  const isReadOnly = ['title', 'created_time', 'last_edited_time', 'created_by', 'last_edited_by', 'id'].includes(property.type);
  const filteredTypes = TYPE_OPTIONS.filter(t => t.label.toLowerCase().includes(typeSearch.toLowerCase()));

  const style: React.CSSProperties = {
    position: 'fixed',
    top: Math.min(position.top, window.innerHeight - 400),
    left: Math.min(position.left, window.innerWidth - 280),
    zIndex: 60,
  };

  return (
    <div ref={panelRef} style={style}
      className="w-[280px] bg-surface-primary rounded-xl shadow-2xl border border-line overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">

      {/* ─── Property name + clickable icon ─── */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <PropertyIconButton property={property} databaseId={databaseId} />
          <input ref={nameRef} value={propName}
            onChange={e => setPropName(e.target.value)} onBlur={commitName}
            onKeyDown={e => { if (e.key === 'Enter') { commitName(); nameRef.current?.blur(); } }}
            className="flex-1 text-sm font-medium text-ink outline-none bg-transparent border-b border-transparent focus:border-focus-border-strong px-1 py-0.5 transition-colors"
            placeholder="Property name" disabled={property.type === 'title'} />
        </div>
      </div>

      {/* ─── Type selector ─── */}
      {!isReadOnly && (
        <div className="px-3 pb-2">
          <button onClick={() => setShowTypeList(!showTypeList)}
            className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-hover-surface text-sm text-ink-body transition-colors">
            <div className="flex items-center gap-2">
              {getPropIcon(property.type, 'w-3.5 h-3.5 text-ink-muted')}
              <span>Type: <span className="font-medium">{TYPE_OPTIONS.find(t => t.type === property.type)?.label || property.type}</span></span>
            </div>
            <ChevronRight className={`w-3.5 h-3.5 text-ink-muted transition-transform ${showTypeList ? 'rotate-90' : ''}`} />
          </button>
          {showTypeList && (
            <div className="mt-1 border border-line-light rounded-lg bg-surface-secondary overflow-hidden">
              <div className="p-1.5">
                <input value={typeSearch} onChange={e => setTypeSearch(e.target.value)}
                  className="w-full text-xs px-2 py-1.5 rounded-md bg-surface-primary border border-line outline-none focus:border-focus-border placeholder:text-placeholder"
                  placeholder="Search type..." autoFocus />
              </div>
              <div className="max-h-48 overflow-y-auto px-1 pb-1">
                {filteredTypes.map(opt => (
                  <button key={opt.type} onClick={() => changeType(opt.type)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors ${opt.type === property.type
                      ? 'bg-accent-soft text-accent-text font-medium' : 'text-ink-body hover:bg-hover-surface-white'}`}>
                    <span className="text-ink-muted">{opt.icon}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="h-px bg-surface-tertiary" />

      {/* ─── Formula / Relation / Rollup / ID specific ─── */}
      {property.type === 'formula' && (
        <><div className="py-1 px-1"><ActionButton icon={<Sigma className="w-3.5 h-3.5" />} label="Edit formula" onClick={() => setShowFormulaEditor(true)} /></div><div className="h-px bg-surface-tertiary" /></>
      )}
      {property.type === 'relation' && (
        <><div className="py-1 px-1"><ActionButton icon={<ExternalLink className="w-3.5 h-3.5" />} label="Edit relation" onClick={() => setShowRelationEditor(true)} /></div><div className="h-px bg-surface-tertiary" /></>
      )}
      {property.type === 'rollup' && (
        <><div className="py-1 px-1"><ActionButton icon={<GitBranch className="w-3.5 h-3.5" />} label="Edit rollup" onClick={() => setShowRollupEditor(true)} /></div><div className="h-px bg-surface-tertiary" /></>
      )}
      {property.type === 'id' && <IdFormatConfig property={property} databaseId={databaseId} onClose={onClose} />}

      {/* ─── Quick actions ─── */}
      <div className="py-1 px-1">
        <ActionButton icon={<Filter className="w-3.5 h-3.5" />} label="Filter by this property"
          onClick={() => { addFilter(viewId, { propertyId: property.id, operator: 'is_not_empty', value: '' }); onClose(); }} />
        <ActionButton icon={<ArrowUp className="w-3.5 h-3.5" />} label="Sort ascending"
          onClick={() => { addSort(viewId, { propertyId: property.id, direction: 'asc' }); onClose(); }} />
        <ActionButton icon={<ArrowDown className="w-3.5 h-3.5" />} label="Sort descending"
          onClick={() => { addSort(viewId, { propertyId: property.id, direction: 'desc' }); onClose(); }} />
        {(property.type === 'select' || property.type === 'status' || property.type === 'multi_select' || property.type === 'checkbox' || property.type === 'person' || property.type === 'user') && (
          <ActionButton icon={<Group className="w-3.5 h-3.5" />} label="Group by this property"
            onClick={() => { setGrouping(viewId, { propertyId: property.id }); onClose(); }} />
        )}
      </div>

      <div className="h-px bg-surface-tertiary" />

      {/* ─── View actions ─── */}
      <div className="py-1 px-1">
        <ActionButton icon={<EyeOff className="w-3.5 h-3.5" />} label="Hide in view"
          onClick={() => { togglePropertyVisibility(viewId, property.id); onClose(); }} disabled={property.type === 'title'} />
        <ActionButton icon={<PanelLeftClose className="w-3.5 h-3.5" />} label="Insert left"
          onClick={() => {
            const view = views[viewId];
            const idx = view?.visibleProperties.indexOf(property.id) ?? 0;
            const prevPropId = idx > 0 ? view.visibleProperties[idx - 1] : null;
            insertPropertyAt(databaseId, 'New column', 'text', viewId, prevPropId);
            onClose();
          }} />
        <ActionButton icon={<PanelRightClose className="w-3.5 h-3.5" />} label="Insert right"
          onClick={() => { insertPropertyAt(databaseId, 'New column', 'text', viewId, property.id); onClose(); }} />
      </div>

      {/* ─── Delete ─── */}
      {property.type !== 'title' && !isReadOnly && (
        <><div className="h-px bg-surface-tertiary" /><div className="py-1 px-1">
          <ActionButton icon={<Trash2 className="w-3.5 h-3.5" />} label="Delete property"
            onClick={() => { deleteProperty(databaseId, property.id); onClose(); }} danger />
        </div></>
      )}

      {/* ─── Editor Portals ─── */}
      {showFormulaEditor && <FormulaEditorPanel databaseId={databaseId} propertyId={property.id} onClose={() => setShowFormulaEditor(false)} />}
      {showRelationEditor && <RelationEditorPanel databaseId={databaseId} propertyId={property.id} onClose={() => setShowRelationEditor(false)} position={position} />}
      {showRollupEditor && <RollupEditorPanel databaseId={databaseId} propertyId={property.id} onClose={() => setShowRollupEditor(false)} position={position} />}
    </div>
  );
}
