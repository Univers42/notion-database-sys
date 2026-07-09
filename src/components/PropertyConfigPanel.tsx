/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   PropertyConfigPanel.tsx                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:39:33 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 20:16:45 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDatabaseStore } from '../store/dbms/hardcoded/useDatabaseStore';
import type { PropertyType, SchemaProperty } from '../types/database';
import { FormulaEditorPanel } from './FormulaEditorPanel';
import { ButtonEditorPanel } from './ButtonEditorPanel';
import { RelationEditorPanel } from './RelationEditorPanel';
import { RollupEditorPanel } from './RollupEditorPanel';
import { ActionButton, PropertyIconButton, IdFormatConfig, TYPE_OPTIONS, getPropIcon } from './propertyConfig/index';
import {
  ArrowUp, ArrowDown, Filter, Group, EyeOff, PanelLeftClose,
  PanelRightClose, Trash2, ChevronRight, Sigma, GitBranch, ExternalLink,
  Copy, WrapText,
  MousePointerClick,
} from 'lucide-react';
import { cn } from '../utils/cn';

interface PropertyConfigPanelProps {
  property: SchemaProperty;
  databaseId: string;
  viewId: string;
  position: { top: number; left: number };
  onClose: () => void;
}

/** Floating panel for configuring a database property (rename, change type, sort, filter, etc.). */
export function PropertyConfigPanel({ property: propertySnapshot, databaseId, viewId, position, onClose }: Readonly<PropertyConfigPanelProps>) {
  const {
    updateProperty, deleteProperty, togglePropertyVisibility,
    addSort, addFilter, setGrouping, insertPropertyAt, duplicateProperty,
    updateViewSettings, views, databases,
  } = useDatabaseStore();

  // The click handler captures a snapshot; read live so a type change (or any
  // schema edit) reflects immediately in the open panel.
  const property = databases[databaseId]?.properties[propertySnapshot.id] ?? propertySnapshot;
  const viewSettings = views[viewId]?.settings ?? {};

  const [propName, setPropName] = useState(property.name);
  const [showTypeList, setShowTypeList] = useState(false);
  const [typeSearch, setTypeSearch] = useState('');
  const [showFormulaEditor, setShowFormulaEditor] = useState(false);
  const [showButtonEditor, setShowButtonEditor] = useState(false);
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

  // Notion parity: every property is renamable (including the mandatory title);
  // type is changeable everywhere except the title and id columns.
  const isTitle = property.type === 'title';
  const canChangeType = !isTitle && property.type !== 'id';
  const filteredTypes = TYPE_OPTIONS.filter(t => t.label.toLowerCase().includes(typeSearch.toLowerCase()));

  // Anchor stays glued below the header — never pulled up over it. If the
  // viewport lacks room the panel caps its height and scrolls internally.
  const style: React.CSSProperties = {
    position: 'fixed',
    top: position.top,
    left: Math.min(position.left, window.innerWidth - 292),
    maxHeight: Math.max(160, window.innerHeight - position.top - 12),
    zIndex: 60,
  };

  // Portaled to body: host pages size-contain (`container-type: size`), which
  // makes them the containing block for position:fixed — rendering in place
  // would shift the panel by the page container's offset.
  return createPortal(
    <div ref={panelRef} style={style} data-testid="property-config-panel"
      className={cn("w-[280px] bg-surface-primary rounded-xl shadow-2xl border border-line overflow-y-auto overflow-x-hidden animate-in fade-in slide-in-from-top-2 duration-150")}>

      {/* ─── Property name + clickable icon ─── */}
      <div className={cn("px-3 pt-3 pb-2")}>
        <div className={cn("flex items-center gap-2")}>
          <PropertyIconButton property={property} databaseId={databaseId} />
          <input ref={nameRef} value={propName}
            onChange={e => setPropName(e.target.value)} onBlur={commitName}
            onKeyDown={e => { if (e.key === 'Enter') { commitName(); nameRef.current?.blur(); } }}
            className={cn("flex-1 text-sm font-medium text-ink outline-none bg-transparent border-b border-transparent focus:border-focus-border-strong px-1 py-0.5 transition-colors")}
            placeholder="Property name" />
        </div>
      </div>

      {/* ─── Show page icon (title column only, Notion parity) ─── */}
      {isTitle && (
        <div className={cn("px-3 pb-2")}>
          <button
            type="button"
            role="switch"
            aria-checked={viewSettings.showPageIcon !== false}
            aria-label="Show page icon"
            onClick={() => updateViewSettings(viewId, { showPageIcon: viewSettings.showPageIcon === false })}
            className={cn("w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-hover-surface text-sm text-ink-body transition-colors")}
          >
            <span>Show page icon</span>
            <span className={cn(`relative inline-flex h-4 w-7 shrink-0 rounded-full p-0.5 transition-colors ${viewSettings.showPageIcon !== false ? 'bg-accent' : 'bg-surface-muted'}`)}>
              <span className={cn(`h-3 w-3 rounded-full bg-surface-primary transition-transform ${viewSettings.showPageIcon !== false ? 'translate-x-3' : ''}`)} />
            </span>
          </button>
        </div>
      )}

      {/* ─── Type selector ─── */}
      {canChangeType && (
        <div className={cn("px-3 pb-2")}>
          <button onClick={() => setShowTypeList(!showTypeList)}
            className={cn("w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-hover-surface text-sm text-ink-body transition-colors")}>
            <div className={cn("flex items-center gap-2")}>
              {getPropIcon(property.type, 'w-3.5 h-3.5 text-ink-muted')}
              <span>Type: <span className={cn("font-medium")}>{TYPE_OPTIONS.find(t => t.type === property.type)?.label || property.type}</span></span>
            </div>
            <ChevronRight className={cn(`w-3.5 h-3.5 text-ink-muted transition-transform ${showTypeList ? 'rotate-90' : ''}`)} />
          </button>
          {showTypeList && (
            <div className={cn("mt-1 border border-line-light rounded-lg bg-surface-secondary overflow-hidden")}>
              <div className={cn("p-1.5")}>
                <input value={typeSearch} onChange={e => setTypeSearch(e.target.value)}
                  className={cn("w-full text-xs px-2 py-1.5 rounded-md bg-surface-primary border border-line outline-none focus:border-focus-border placeholder:text-placeholder")}
                  placeholder="Search type..." autoFocus />
              </div>
              <div className={cn("max-h-48 overflow-y-auto px-1 pb-1")}>
                {filteredTypes.map(opt => (
                  <button key={opt.type} onClick={() => changeType(opt.type)}
                    className={cn(`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors ${opt.type === property.type
                      ? 'bg-accent-soft text-accent-text font-medium' : 'text-ink-body hover:bg-hover-surface-white'}`)}>
                    <span className={cn("text-ink-muted")}>{opt.icon}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className={cn("h-px bg-surface-tertiary")} />

      {/* ─── Formula / Relation / Rollup / ID specific ─── */}
      {property.type === 'formula' && (
        <><div className={cn("py-1 px-1")}><ActionButton icon={<Sigma className={cn("w-3.5 h-3.5")} />} label="Edit formula" onClick={() => setShowFormulaEditor(true)} /></div><div className={cn("h-px bg-surface-tertiary")} /></>
      )}
      {property.type === 'button' && (
        <><div className={cn("py-1 px-1")}><ActionButton icon={<MousePointerClick className={cn("w-3.5 h-3.5")} />} label="Edit button" onClick={() => setShowButtonEditor(true)} /></div><div className={cn("h-px bg-surface-tertiary")} /></>
      )}
      {property.type === 'relation' && (
        <><div className={cn("py-1 px-1")}><ActionButton icon={<ExternalLink className={cn("w-3.5 h-3.5")} />} label="Edit relation" onClick={() => setShowRelationEditor(true)} /></div><div className={cn("h-px bg-surface-tertiary")} /></>
      )}
      {property.type === 'rollup' && (
        <><div className={cn("py-1 px-1")}><ActionButton icon={<GitBranch className={cn("w-3.5 h-3.5")} />} label="Edit rollup" onClick={() => setShowRollupEditor(true)} /></div><div className={cn("h-px bg-surface-tertiary")} /></>
      )}
      {property.type === 'id' && <IdFormatConfig property={property} databaseId={databaseId} onClose={onClose} />}

      {/* ─── Quick actions ─── */}
      <div className={cn("py-1 px-1")}>
        <ActionButton icon={<Filter className={cn("w-3.5 h-3.5")} />} label="Filter by this property"
          onClick={() => { addFilter(viewId, { propertyId: property.id, operator: 'is_not_empty', value: '' }); onClose(); }} />
        <ActionButton icon={<ArrowUp className={cn("w-3.5 h-3.5")} />} label="Sort ascending"
          onClick={() => { addSort(viewId, { propertyId: property.id, direction: 'asc' }); onClose(); }} />
        <ActionButton icon={<ArrowDown className={cn("w-3.5 h-3.5")} />} label="Sort descending"
          onClick={() => { addSort(viewId, { propertyId: property.id, direction: 'desc' }); onClose(); }} />
        <ActionButton icon={<Group className={cn("w-3.5 h-3.5")} />} label="Group by this property"
          onClick={() => { setGrouping(viewId, { propertyId: property.id }); onClose(); }} />
        <ActionButton icon={<EyeOff className={cn("w-3.5 h-3.5")} />} label="Hide in view"
          onClick={() => { togglePropertyVisibility(viewId, property.id); onClose(); }} disabled={isTitle} />
        <ActionButton icon={<WrapText className={cn("w-3.5 h-3.5")} />}
          label={viewSettings.wrapContent ? 'Unwrap content' : 'Wrap content'}
          onClick={() => { updateViewSettings(viewId, { wrapContent: !viewSettings.wrapContent }); onClose(); }} />
      </div>

      <div className={cn("h-px bg-surface-tertiary")} />

      {/* ─── Structure actions (Notion order: insert / duplicate / delete) ─── */}
      <div className={cn("py-1 px-1")}>
        <ActionButton icon={<PanelLeftClose className={cn("w-3.5 h-3.5")} />} label="Insert left"
          onClick={() => {
            const view = views[viewId];
            const idx = view?.visibleProperties.indexOf(property.id) ?? 0;
            const prevPropId = idx > 0 ? view.visibleProperties[idx - 1] : null;
            insertPropertyAt(databaseId, 'New column', 'text', viewId, prevPropId);
            onClose();
          }} />
        <ActionButton icon={<PanelRightClose className={cn("w-3.5 h-3.5")} />} label="Insert right"
          onClick={() => { insertPropertyAt(databaseId, 'New column', 'text', viewId, property.id); onClose(); }} />
        <ActionButton icon={<Copy className={cn("w-3.5 h-3.5")} />} label="Duplicate property"
          onClick={() => { duplicateProperty(databaseId, property.id, viewId); onClose(); }} disabled={isTitle} />
        <ActionButton icon={<Trash2 className={cn("w-3.5 h-3.5")} />} label="Delete property"
          onClick={() => { deleteProperty(databaseId, property.id); onClose(); }} danger disabled={isTitle} />
      </div>

      {/* ─── Editor Portals ─── */}
      {showFormulaEditor && <FormulaEditorPanel databaseId={databaseId} propertyId={property.id} onClose={() => setShowFormulaEditor(false)} />}
      {showButtonEditor && <ButtonEditorPanel databaseId={databaseId} propertyId={property.id} onClose={() => setShowButtonEditor(false)} position={position} />}
      {showRelationEditor && <RelationEditorPanel databaseId={databaseId} propertyId={property.id} onClose={() => setShowRelationEditor(false)} position={position} />}
      {showRollupEditor && <RollupEditorPanel databaseId={databaseId} propertyId={property.id} onClose={() => setShowRollupEditor(false)} position={position} />}
    </div>,
    document.body,
  );
}
