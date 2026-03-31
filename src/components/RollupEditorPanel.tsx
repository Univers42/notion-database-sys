import React, { useState, useRef, useEffect } from 'react';
import { useDatabaseStore } from '../store/useDatabaseStore';
import { X, ChevronDown, GitBranch, Hash, BarChart2 } from 'lucide-react';
import type { RollupFunction, RollupDisplayAs } from '../types/database';

// ═══════════════════════════════════════════════════════════════════════════════
// ROLLUP EDITOR PANEL — Configure a rollup property
// ═══════════════════════════════════════════════════════════════════════════════
// Notion-matching panel:
//   • Relation picker (select an existing relation property)
//   • Property picker (from the related database)
//   • Calculate function picker
//   • Display as: number / bar / ring
// ═══════════════════════════════════════════════════════════════════════════════

const ROLLUP_FUNCTIONS: { value: RollupFunction; label: string; group: string }[] = [
  { value: 'show_original',      label: 'Show original',       group: 'Show' },
  { value: 'show_unique',        label: 'Show unique values',  group: 'Show' },
  { value: 'count_all',          label: 'Count all',           group: 'Count' },
  { value: 'count_values',       label: 'Count values',        group: 'Count' },
  { value: 'count_unique_values',label: 'Count unique values', group: 'Count' },
  { value: 'count_empty',        label: 'Count empty',         group: 'Count' },
  { value: 'count_not_empty',    label: 'Count not empty',     group: 'Count' },
  { value: 'percent_empty',      label: 'Percent empty',       group: 'Percent' },
  { value: 'percent_not_empty',  label: 'Percent not empty',   group: 'Percent' },
  { value: 'sum',                label: 'Sum',                 group: 'Math' },
  { value: 'average',            label: 'Average',             group: 'Math' },
  { value: 'median',             label: 'Median',              group: 'Math' },
  { value: 'min',                label: 'Min',                 group: 'Math' },
  { value: 'max',                label: 'Max',                 group: 'Math' },
  { value: 'range',              label: 'Range',               group: 'Math' },
];

const DISPLAY_OPTIONS: { value: RollupDisplayAs; label: string; icon: React.ReactNode }[] = [
  { value: 'number', label: 'Number',  icon: <Hash className="w-3.5 h-3.5" /> },
  { value: 'bar',    label: 'Bar',     icon: <BarChart2 className="w-3.5 h-3.5" /> },
  { value: 'ring',   label: 'Ring',    icon: <span className="w-3.5 h-3.5 inline-flex items-center justify-center"><svg viewBox="0 0 14 14" className="w-3.5 h-3.5"><circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="34.56 34.56" strokeDashoffset="8.64" /></svg></span> },
];

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
  const selectedFn = ROLLUP_FUNCTIONS.find(f => f.value === fn);

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
        <SectionHeader label="Calculate" />
        <div className="px-2 pb-1">
          <DropdownButton
            label={selectedFn?.label || 'Show original'}
            open={showFnPicker}
            onClick={() => setShowFnPicker(!showFnPicker)} />

          {showFnPicker && (
            <PickerList maxH="max-h-56">
              {(['Show', 'Count', 'Percent', 'Math'] as const).map(group => {
                const items = ROLLUP_FUNCTIONS.filter(f => f.group === group);
                return (
                  <React.Fragment key={group}>
                    <div className="px-2 pt-2 pb-0.5 text-[10px] font-semibold text-ink-muted uppercase tracking-wider">{group}</div>
                    {items.map(f => (
                      <PickerItem key={f.value} selected={f.value === fn}
                        onClick={() => { setFn(f.value); setShowFnPicker(false); }}>
                        <span className="truncate">{f.label}</span>
                      </PickerItem>
                    ))}
                  </React.Fragment>
                );
              })}
            </PickerList>
          )}
        </div>

        {/* ─── Display as section (for numeric results) ─── */}
        {!['show_original', 'show_unique'].includes(fn) && (
          <>
            <SectionHeader label="Display as" />
            <div className="px-2 pb-2">
              <DropdownButton
                label={DISPLAY_OPTIONS.find(d => d.value === displayAs)?.label || 'Number'}
                open={showDisplayPicker}
                onClick={() => setShowDisplayPicker(!showDisplayPicker)} />

              {showDisplayPicker && (
                <PickerList>
                  {DISPLAY_OPTIONS.map(d => (
                    <PickerItem key={d.value} selected={d.value === displayAs}
                      onClick={() => { setDisplayAs(d.value); setShowDisplayPicker(false); }}>
                      <span className="text-ink-muted">{d.icon}</span>
                      <span>{d.label}</span>
                    </PickerItem>
                  ))}
                </PickerList>
              )}
            </div>
          </>
        )}
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

// ─── Shared sub-components ───────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center px-3 pt-3 pb-1">
      <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">{label}</span>
    </div>
  );
}

function DropdownButton({ label, muted, disabled, open, onClick }: {
  label: string; muted?: boolean; disabled?: boolean; open?: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-sm transition-colors ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-hover-surface cursor-pointer'
      } ${open ? 'bg-surface-secondary' : ''}`}>
      <span className={`truncate ${muted ? 'text-ink-muted' : 'text-ink-body'}`}>{label}</span>
      <ChevronDown className={`w-3.5 h-3.5 text-ink-muted shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
  );
}

function PickerList({ children, maxH = 'max-h-48' }: { children: React.ReactNode; maxH?: string }) {
  return (
    <div className={`mt-1 bg-surface-secondary rounded-lg border border-line-light overflow-y-auto ${maxH}`}>
      {children}
    </div>
  );
}

function PickerItem({ children, selected, onClick }: { children: React.ReactNode; selected?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-sm transition-colors ${
        selected ? 'bg-accent-soft text-accent-text font-medium' : 'text-ink-body hover:bg-hover-surface-white'
      }`}>
      {children}
    </button>
  );
}
