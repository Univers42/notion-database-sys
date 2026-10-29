/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   PropertyConfigPanel.tsx                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:39:33 by dlesieur          #+#    #+#             */
/*   Updated: 2026/10/29 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDatabaseStore, useStoreApi } from '../store/dbms/hardcoded/useDatabaseStore';
import type { PropertyType, SchemaProperty } from '../types/database';
import { FormulaEditorPanel } from './FormulaEditorPanel';
import { ButtonEditorPanel } from './ButtonEditorPanel';
import { RelationEditorPanel } from './RelationEditorPanel';
import { RollupEditorPanel } from './RollupEditorPanel';
import { AutofillConfigPanel } from './AutofillConfigPanel';
import { isDatabaseLocked, isViewLocked } from '../lib/lockGuards';
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
  const storeApi = useStoreApi();
  const {
    updateProperty, deleteProperty, togglePropertyVisibility,
    addSort, addFilter, setGrouping, insertPropertyAt, duplicateProperty,
    updateViewSettings,
  } = storeApi.getState();

  // Selective: subscribing to the whole store re-rendered the open panel on
  // every page edit anywhere. The click handler captures a snapshot; read the
  // live property so a type change (or any schema edit) reflects immediately.
  const property = useDatabaseStore(s => s.databases[databaseId]?.properties[propertySnapshot.id]) ?? propertySnapshot;
  const viewSettings = useDatabaseStore(s => s.views[viewId]?.settings) ?? {};
  // A locked view keeps its sort, filter and columns; a locked database also its
  // schema. The store refuses those writes; here they read as locked, not broken.
  const viewLocked = useDatabaseStore(s => isViewLocked(s.views[viewId], s.databases[databaseId]));
  const schemaLocked = useDatabaseStore(s => isDatabaseLocked(s.databases[databaseId]));

  const [propName, setPropName] = useState(property.name);
  const [showTypeList, setShowTypeList] = useState(false);
  const [typeSearch, setTypeSearch] = useState('');
  const [showFormulaEditor, setShowFormulaEditor] = useState(false);
  const [showButtonEditor, setShowButtonEditor] = useState(false);
  const [showRelationEditor, setShowRelationEditor] = useState(false);
  const [showRollupEditor, setShowRollupEditor] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  // Hand focus back to the header that opened the panel: unmounting with focus
  // inside dropped it on <body>, so the keyboard lost its place in the table.
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    nameRef.current?.select();
    return () => {
      const lost = document.activeElement === document.body || panel?.contains(document.activeElement);
      if (lost && opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  // Typed name read through a ref so the document listeners register once,
  // not on every keystroke.
  const propNameRef = useRef(propName);
  propNameRef.current = propName;
  const commitName = () => {
    const name = propNameRef.current.trim();
    const live = storeApi.getState().databases[databaseId]?.properties[property.id];
    if (name && live && name !== live.name) updateProperty(databaseId, property.id, { name });
  };
  const commitAndCloseRef = useRef(() => {});
  commitAndCloseRef.current = () => { commitName(); onClose(); };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) commitAndCloseRef.current();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') commitAndCloseRef.current(); };
    document.addEventListener('pointerdown', handler, true);
    document.addEventListener('mousedown', handler, true);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', handler, true);
      document.removeEventListener('mousedown', handler, true);
      document.removeEventListener('keydown', onKey, true);
    };
  }, []);

  const changeType = (newType: PropertyType) => {
    if (newType !== property.type) updateProperty(databaseId, property.id, { type: newType });
    setShowTypeList(false);
  };

  // Notion parity: every property is renamable (including the mandatory title);
  // type is changeable everywhere except the title and id columns.
  const isTitle = property.type === 'title';
  const canChangeType = !isTitle && property.type !== 'id' && !schemaLocked;
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
    <div ref={panelRef} style={style} data-testid="property-config-panel" role="dialog" aria-label={`${property.name} property`}
      className={cn("w-[280px] bg-surface-primary rounded-xl shadow-2xl border border-line overflow-y-auto overflow-x-hidden animate-in fade-in slide-in-from-top-2 duration-150")}>

      {/* ─── Property name + clickable icon ─── */}
      <div className={cn("px-3 pt-3 pb-2")}>
        <div className={cn("flex items-center gap-2")}>
          <PropertyIconButton property={property} databaseId={databaseId} disabled={schemaLocked} />
          <input ref={nameRef} value={propName} readOnly={schemaLocked}
            onChange={e => setPropName(e.target.value)} onBlur={commitName}
            // preventDefault: focus is back on the header by keypress time, and
            // Enter's keypress would click it and reopen this panel.
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitAndCloseRef.current(); } }}
            aria-label="Property name"
            className={cn("flex-1 text-sm font-medium text-ink outline-none bg-transparent border-b border-transparent focus:border-focus-border-strong px-1 py-0.5 transition-colors")}
            placeholder="Property name" />
        </div>
        {viewLocked && (
          <p className={cn("px-1 pt-1.5 text-xs text-ink-muted")}>
            {schemaLocked ? 'This database is locked' : 'This view is locked'}
          </p>
        )}
      </div>

      {/* ─── Show page icon (title column only, Notion parity) ─── */}
      {isTitle && (
        <div className={cn("px-3 pb-2")}>
          <button
            type="button"
            role="switch"
            aria-checked={viewSettings.showPageIcon !== false}
            aria-label="Show page icon"
            disabled={viewLocked}
            onClick={() => updateViewSettings(viewId, { showPageIcon: viewSettings.showPageIcon === false })}
            className={cn("w-full flex items-center justify-between px-2 py-1.5 rounded-md enabled:hover:bg-hover-surface text-sm text-ink-body transition-colors disabled:opacity-50 disabled:cursor-not-allowed")}
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

      {/* ─── AI-filled select (shown only when the host can fill it) ─── */}
      {property.type === 'select' && !schemaLocked && (
        <>
          <AutofillConfigPanel databaseId={databaseId} property={property} />
          <div className={cn("h-px bg-surface-tertiary")} />
        </>
      )}

      {/* ─── Formula / Relation / Rollup / ID specific ─── */}
      {property.type === 'formula' && !schemaLocked && (
        <><div className={cn("py-1 px-1")}><ActionButton icon={<Sigma className={cn("w-3.5 h-3.5")} />} label="Edit formula" onClick={() => setShowFormulaEditor(true)} /></div><div className={cn("h-px bg-surface-tertiary")} /></>
      )}
      {property.type === 'button' && !schemaLocked && (
        <><div className={cn("py-1 px-1")}><ActionButton icon={<MousePointerClick className={cn("w-3.5 h-3.5")} />} label="Edit button" onClick={() => setShowButtonEditor(true)} /></div><div className={cn("h-px bg-surface-tertiary")} /></>
      )}
      {property.type === 'relation' && !schemaLocked && (
        <><div className={cn("py-1 px-1")}><ActionButton icon={<ExternalLink className={cn("w-3.5 h-3.5")} />} label="Edit relation" onClick={() => setShowRelationEditor(true)} /></div><div className={cn("h-px bg-surface-tertiary")} /></>
      )}
      {property.type === 'rollup' && !schemaLocked && (
        <><div className={cn("py-1 px-1")}><ActionButton icon={<GitBranch className={cn("w-3.5 h-3.5")} />} label="Edit rollup" onClick={() => setShowRollupEditor(true)} /></div><div className={cn("h-px bg-surface-tertiary")} /></>
      )}
      {property.type === 'id' && !schemaLocked && <IdFormatConfig property={property} databaseId={databaseId} onClose={onClose} />}

      {/* ─── Quick actions ─── */}
      <div className={cn("py-1 px-1")}>
        <ActionButton icon={<Filter className={cn("w-3.5 h-3.5")} />} label="Filter by this property"
          onClick={() => { addFilter(viewId, { propertyId: property.id, operator: 'is_not_empty', value: '' }); onClose(); }} disabled={viewLocked} />
        <ActionButton icon={<ArrowUp className={cn("w-3.5 h-3.5")} />} label="Sort ascending"
          onClick={() => { addSort(viewId, { propertyId: property.id, direction: 'asc' }); onClose(); }} disabled={viewLocked} />
        <ActionButton icon={<ArrowDown className={cn("w-3.5 h-3.5")} />} label="Sort descending"
          onClick={() => { addSort(viewId, { propertyId: property.id, direction: 'desc' }); onClose(); }} disabled={viewLocked} />
        <ActionButton icon={<Group className={cn("w-3.5 h-3.5")} />} label="Group by this property"
          onClick={() => { setGrouping(viewId, { propertyId: property.id }); onClose(); }} disabled={viewLocked} />
        <ActionButton icon={<EyeOff className={cn("w-3.5 h-3.5")} />} label="Hide in view"
          onClick={() => { togglePropertyVisibility(viewId, property.id); onClose(); }} disabled={isTitle || viewLocked} />
        <ActionButton icon={<WrapText className={cn("w-3.5 h-3.5")} />}
          label={viewSettings.wrapContent ? 'Unwrap content' : 'Wrap content'}
          onClick={() => { updateViewSettings(viewId, { wrapContent: !viewSettings.wrapContent }); onClose(); }} disabled={viewLocked} />
      </div>

      <div className={cn("h-px bg-surface-tertiary")} />

      {/* ─── Structure actions (Notion order: insert / duplicate / delete) ─── */}
      <div className={cn("py-1 px-1")}>
        <ActionButton icon={<PanelLeftClose className={cn("w-3.5 h-3.5")} />} label="Insert left"
          onClick={() => {
            const view = storeApi.getState().views[viewId];
            const idx = view?.visibleProperties.indexOf(property.id) ?? 0;
            const prevPropId = idx > 0 ? view.visibleProperties[idx - 1] : null;
            insertPropertyAt(databaseId, 'New column', 'text', viewId, prevPropId);
            onClose();
          }} disabled={schemaLocked} />
        <ActionButton icon={<PanelRightClose className={cn("w-3.5 h-3.5")} />} label="Insert right"
          onClick={() => { insertPropertyAt(databaseId, 'New column', 'text', viewId, property.id); onClose(); }} disabled={schemaLocked} />
        <ActionButton icon={<Copy className={cn("w-3.5 h-3.5")} />} label="Duplicate property"
          onClick={() => { duplicateProperty(databaseId, property.id, viewId); onClose(); }} disabled={isTitle || schemaLocked} />
        <ActionButton icon={<Trash2 className={cn("w-3.5 h-3.5")} />} label="Delete property"
          onClick={() => { deleteProperty(databaseId, property.id); onClose(); }} danger disabled={isTitle || schemaLocked} />
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
