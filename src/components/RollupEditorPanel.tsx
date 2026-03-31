/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   RollupEditorPanel.tsx                              :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:39:40 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 18:35:36 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState, useRef, useEffect } from 'react';
import { useDatabaseStore } from '../store/useDatabaseStore';
import { GitBranch } from 'lucide-react';
import type { RollupFunction, RollupDisplayAs } from '../types/database';
import {
  SectionHeader, DropdownButton, PickerList, PickerItem,
  FunctionSelector, DisplaySelector,
} from './RollupEditorHelpers';

// ═══════════════════════════════════════════════════════════════════════════════
// ROLLUP EDITOR PANEL — Configure a rollup property
// ═══════════════════════════════════════════════════════════════════════════════

interface RollupEditorPanelProps {
  databaseId: string;
  propertyId: string;
  onClose: () => void;
  position?: { top: number; left: number };
}

export function RollupEditorPanel({ databaseId, propertyId, onClose, position }: RollupEditorPanelProps) {
  const { databases, updateProperty } = useDatabaseStore();
  const db = databases[databaseId];
  const prop = db?.properties[propertyId];

  // Find all relation properties in this database
  const relationProps = Object.values(db?.properties || {}).filter(p => p.type === 'relation' && p.relationConfig);

  const [relationPropId, setRelationPropId] = useState(prop?.rollupConfig?.relationPropertyId || '');
  const [targetPropId, setTargetPropId] = useState(prop?.rollupConfig?.targetPropertyId || '');
  const [fn, setFn] = useState<RollupFunction>(prop?.rollupConfig?.function || 'count_all');
  const [displayAs, setDisplayAs] = useState<RollupDisplayAs>(prop?.rollupConfig?.displayAs || 'number');

  const [showRelPicker, setShowRelPicker] = useState(false);
  const [showPropPicker, setShowPropPicker] = useState(false);
  const [showFnPicker, setShowFnPicker] = useState(false);
  const [showDisplayPicker, setShowDisplayPicker] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Resolve what database the selected relation points to
  const selectedRelProp = relationPropId ? db?.properties[relationPropId] : null;
  const targetDbId = selectedRelProp?.relationConfig?.databaseId;
  const targetDb = targetDbId ? databases[targetDbId] : null;
  const targetProps = targetDb ? Object.values(targetDb.properties) : [];

  const selectedTargetProp = targetPropId ? targetDb?.properties[targetPropId] : null;

  const handleSave = () => {
    if (!relationPropId) return;
    updateProperty(databaseId, propertyId, {
      type: 'rollup',
      rollupConfig: {
        relationPropertyId: relationPropId,
        targetPropertyId: targetPropId,
        function: fn,
        displayAs,
      },
    });
    onClose();
  };

  const style: React.CSSProperties = position
    ? { position: 'fixed', top: Math.min(position.top, window.innerHeight - 500), left: Math.min(position.left, window.innerWidth - 300), zIndex: 70 }
    : { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 70 };

  return (
    <div ref={panelRef} style={style}
      className="w-[290px] bg-surface-primary rounded-xl shadow-2xl border border-line overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 flex flex-col max-h-[80vh]">

      <div className="flex-1 overflow-y-auto">
        {/* ─── Relation section ─── */}
        <SectionHeader label="Relation" />
        <div className="px-2 pb-1">
          <DropdownButton
            label={selectedRelProp ? selectedRelProp.name : 'Select an existing relation\u2026'}
            muted={!selectedRelProp}
            open={showRelPicker}
            onClick={() => setShowRelPicker(!showRelPicker)} />

          {showRelPicker && (
            <PickerList>
              {relationProps.length === 0 ? (
                <div className="px-3 py-2 text-xs text-ink-muted">No relations in this database</div>
              ) : relationProps.map(rp => (
                <PickerItem key={rp.id} selected={rp.id === relationPropId}
                  onClick={() => { setRelationPropId(rp.id); setTargetPropId(''); setShowRelPicker(false); }}>
                  <GitBranch className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                  <span className="truncate">{rp.name}</span>
                  {rp.relationConfig && (
                    <span className="ml-auto text-[10px] text-ink-muted shrink-0">
                      → {databases[rp.relationConfig.databaseId]?.icon} {databases[rp.relationConfig.databaseId]?.name}
                    </span>
                  )}
                </PickerItem>
              ))}
            </PickerList>
          )}
        </div>

        {/* ─── Property section ─── */}
        <SectionHeader label="Property" />
        <div className="px-2 pb-1">
          <DropdownButton
            label={selectedTargetProp ? selectedTargetProp.name : 'Select a property\u2026'}
            muted={!selectedTargetProp}
            disabled={!targetDb}
            open={showPropPicker}
            onClick={() => targetDb && setShowPropPicker(!showPropPicker)} />

          {showPropPicker && targetDb && (
            <PickerList>
              {targetProps.map(tp => (
                <PickerItem key={tp.id} selected={tp.id === targetPropId}
                  onClick={() => { setTargetPropId(tp.id); setShowPropPicker(false); }}>
                  <span className="text-[10px] text-ink-muted uppercase w-6 shrink-0 text-center">{tp.type.slice(0, 3)}</span>
                  <span className="truncate">{tp.name}</span>
                </PickerItem>
              ))}
            </PickerList>
          )}
        </div>

        {/* ─── Calculate section ─── */}
        <FunctionSelector fn={fn} setFn={setFn} showFnPicker={showFnPicker} setShowFnPicker={setShowFnPicker} />

        {/* ─── Display as section (for numeric results) ─── */}
        <DisplaySelector fn={fn} displayAs={displayAs} setDisplayAs={setDisplayAs}
          showDisplayPicker={showDisplayPicker} setShowDisplayPicker={setShowDisplayPicker} />
      </div>

      {/* Save */}
      <div className="px-3 pb-3 pt-1 shrink-0 border-t border-line-light">
        <button onClick={handleSave} disabled={!relationPropId}
          className={`w-full py-2 rounded-md text-sm font-medium transition-colors ${relationPropId
            ? 'bg-accent hover:bg-hover-accent text-ink-inverse'
            : 'bg-surface-tertiary text-ink-muted cursor-not-allowed'}`}>
          Save
        </button>
      </div>
    </div>
  );
}
