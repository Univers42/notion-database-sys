/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   RollupCellEditor.tsx                               :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:36:05 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/03 17:11:29 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState, useMemo } from 'react';
import { useDatabaseStore } from '../../store/dbms/hardcoded/useDatabaseStore';
import type { SchemaProperty, RollupFunction } from '../../types/database';
import type { RollupFunctionMeta } from '../../utils/rollup';
import { CellPortal } from './CellPortal';
import { ROLLUP_FUNCTIONS } from './constants';
import { RelationSection, PropertySection, CalculateSection } from './RollupCellEditorSections';
import { cn } from '../../utils/cn';

interface RollupCellEditorProps {
  property: SchemaProperty;
  databaseId: string;
  onClose: () => void;
}

export function RollupCellEditor({ property, databaseId, onClose }: Readonly<RollupCellEditorProps>) {
  const databases = useDatabaseStore(s => s.databases);
  const updateProperty = useDatabaseStore(s => s.updateProperty);

  const db = databases[databaseId];
  const relationProps = useMemo(
    () => Object.values(db?.properties || {}).filter(p => p.type === 'relation' && p.relationConfig),
    [db?.properties]
  );

  const currentConfig = property.rollupConfig;
  const [relationPropId, setRelationPropId] = useState(currentConfig?.relationPropertyId || '');
  const [targetPropId, setTargetPropId] = useState(currentConfig?.targetPropertyId || '');
  const [fn, setFn] = useState<RollupFunction>(currentConfig?.function || 'show_original');

  const [showRelPicker, setShowRelPicker] = useState(false);
  const [showPropPicker, setShowPropPicker] = useState(false);
  const [showCalcPicker, setShowCalcPicker] = useState(false);
  const [calcSubmenu, setCalcSubmenu] = useState<string | null>(null);

  const selectedRelProp = relationPropId ? db?.properties[relationPropId] : null;
  const targetDbId = selectedRelProp?.relationConfig?.databaseId;
  const targetDb = targetDbId ? databases[targetDbId] : null;
  const targetProps = targetDb ? Object.values(targetDb.properties) : [];
  const selectedTargetProp = targetPropId ? targetDb?.properties[targetPropId] : null;
  const selectedFnLabel = ROLLUP_FUNCTIONS.find(f => f.value === fn)?.label || 'Show original';

  const handleSave = (newRelId?: string, newPropId?: string, newFn?: RollupFunction) => {
    updateProperty(databaseId, property.id, {
      type: 'rollup',
      rollupConfig: {
        relationPropertyId: newRelId ?? relationPropId,
        targetPropertyId: newPropId ?? targetPropId,
        function: newFn ?? fn,
        displayAs: currentConfig?.displayAs || 'number',
      },
    });
  };

  const fnGroups = useMemo(() => {
    const groups: Record<string, RollupFunctionMeta[]> = {};
    for (const f of ROLLUP_FUNCTIONS) {
      if (!groups[f.group]) groups[f.group] = [];
      groups[f.group].push(f);
    }
    return groups;
  }, []);

  const closePickers = (keep: 'rel' | 'prop' | 'calc') => {
    if (keep !== 'rel') setShowRelPicker(false);
    if (keep !== 'prop') setShowPropPicker(false);
    if (keep !== 'calc') { setShowCalcPicker(false); setCalcSubmenu(null); }
  };

  return (
    <CellPortal onClose={onClose}>
      <div className={cn("flex flex-col min-w-[200px] max-h-[70vh]")}>
        <div className={cn("overflow-y-auto flex-1")}>
          <RelationSection
            relationProps={relationProps} selected={selectedRelProp}
            open={showRelPicker}
            onToggle={() => { closePickers('rel'); setShowRelPicker(!showRelPicker); }}
            onSelect={rp => { setRelationPropId(rp.id); setTargetPropId(''); setShowRelPicker(false); handleSave(rp.id, '', fn); }}
            relationPropId={relationPropId}
          />
          <PropertySection
            targetDb={targetDb} targetProps={targetProps} selected={selectedTargetProp}
            open={showPropPicker}
            onToggle={() => { closePickers('prop'); setShowPropPicker(!showPropPicker); }}
            onSelect={tp => { setTargetPropId(tp.id); setShowPropPicker(false); handleSave(relationPropId, tp.id, fn); }}
            targetPropId={targetPropId}
          />
          <CalculateSection
            fn={fn} selectedFnLabel={selectedFnLabel} fnGroups={fnGroups}
            open={showCalcPicker} calcSubmenu={calcSubmenu}
            onToggle={() => { closePickers('calc'); setShowCalcPicker(!showCalcPicker); setCalcSubmenu(null); }}
            onSelect={f => { setFn(f); setShowCalcPicker(false); setCalcSubmenu(null); handleSave(relationPropId, targetPropId, f); }}
            setCalcSubmenu={setCalcSubmenu}
          />
        </div>
      </div>
    </CellPortal>
  );
}

