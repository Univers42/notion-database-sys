import React from 'react';
import type { SchemaProperty, RollupFunction } from '../../types/database';
import { ExternalLink, Hash, BarChart2, ChevronDown, ChevronRight, CheckCircle2 } from 'lucide-react';
import { ROLLUP_FUNCTIONS } from './constants';

/* ── Section: Relation ── */
export function RelationSection({ relationProps, selected, open, onToggle, onSelect, relationPropId }: {
  relationProps: SchemaProperty[]; selected: SchemaProperty | undefined | null;
  open: boolean; onToggle: () => void; onSelect: (p: SchemaProperty) => void; relationPropId: string;
}) {
  return (
    <div className="px-2 pt-2">
      <div className="px-2 py-1 text-xs font-medium text-ink-muted uppercase tracking-wide">Relation</div>
      <SectionButton icon={<ExternalLink className="w-4 h-4 text-ink-muted shrink-0" />} label={selected?.name || 'Select relation…'} open={open} onClick={onToggle} />
      {open && (
        <div className="ml-2 mt-1 bg-surface-secondary rounded-lg border border-line-light overflow-hidden mb-1">
          {relationProps.length === 0
            ? <div className="px-3 py-2 text-xs text-ink-muted">No relation properties</div>
            : relationProps.map(rp => (
              <button key={rp.id} onClick={() => onSelect(rp)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-hover-surface-white transition-colors ${rp.id === relationPropId ? 'bg-accent-soft text-accent-text font-medium' : 'text-ink-body'}`}>
                <ExternalLink className="w-3.5 h-3.5 text-ink-muted" />
                <span className="truncate">{rp.name}</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

/* ── Section: Property ── */
export function PropertySection({ targetDb, targetProps, selected, open, onToggle, onSelect, targetPropId }: {
  targetDb: any; targetProps: SchemaProperty[]; selected: SchemaProperty | undefined | null;
  open: boolean; onToggle: () => void; onSelect: (p: SchemaProperty) => void; targetPropId: string;
}) {
  return (
    <div className="px-2 pt-1 border-t border-line-light mt-2">
      <div className="px-2 py-1 text-xs font-medium text-ink-muted uppercase tracking-wide">Property</div>
      <button onClick={onToggle} disabled={!targetDb}
        className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-hover-surface text-sm transition-colors">
        <Hash className="w-4 h-4 text-ink-muted shrink-0" />
        <span className={`flex-1 text-left truncate ${targetDb ? 'text-ink-body' : 'text-ink-muted'}`}>
          {selected?.name || (targetDb ? 'Select property…' : 'Select relation first')}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && targetDb && (
        <div className="ml-2 mt-1 bg-surface-secondary rounded-lg border border-line-light overflow-hidden max-h-40 overflow-y-auto mb-1">
          {targetProps.map(tp => (
            <button key={tp.id} onClick={() => onSelect(tp)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-hover-surface-white transition-colors ${tp.id === targetPropId ? 'bg-accent-soft text-accent-text font-medium' : 'text-ink-body'}`}>
              <span className="truncate">{tp.name}</span>
              <span className="text-xs text-ink-muted ml-auto shrink-0">{tp.type}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Section: Calculate ── */
export function CalculateSection({ fn, selectedFnLabel, fnGroups, open, calcSubmenu, onToggle, onSelect, setCalcSubmenu }: {
  fn: RollupFunction; selectedFnLabel: string;
  fnGroups: Record<string, typeof ROLLUP_FUNCTIONS>;
  open: boolean; calcSubmenu: string | null;
  onToggle: () => void; onSelect: (f: RollupFunction) => void;
  setCalcSubmenu: (s: string | null) => void;
}) {
  return (
    <div className="px-2 pt-1 border-t border-line-light mt-2 pb-2">
      <div className="px-2 py-1 text-xs font-medium text-ink-muted uppercase tracking-wide">Calculate</div>
      <SectionButton icon={<BarChart2 className="w-4 h-4 text-ink-muted shrink-0" />} label={selectedFnLabel} open={open} onClick={onToggle} />
      {open && (
        <div className="ml-2 mt-1 bg-surface-secondary rounded-lg border border-line-light overflow-hidden mb-1">
          {ROLLUP_FUNCTIONS.filter(f => f.group === 'Show').map(f => (
            <button key={f.value} onClick={() => onSelect(f.value)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-hover-surface-white transition-colors ${fn === f.value ? 'bg-accent-soft text-accent-text font-medium' : 'text-ink-body'}`}>
              <span className="truncate">{f.label}</span>
              {fn === f.value && <CheckCircle2 className="w-3.5 h-3.5 text-accent-text-soft ml-auto shrink-0" />}
            </button>
          ))}
          {['Count', 'Percent', 'Math'].map(group => (
            <CalcSubmenuGroup key={group} label={group} items={fnGroups[group] || []}
              activeFn={fn} isOpen={calcSubmenu === group}
              onToggle={() => setCalcSubmenu(calcSubmenu === group ? null : group)}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Reusable sub-menu group (replaces 3 identical blocks) ── */
export function CalcSubmenuGroup({ label, items, activeFn, isOpen, onToggle, onSelect }: {
  label: string; items: { value: RollupFunction; label: string }[];
  activeFn: RollupFunction; isOpen: boolean;
  onToggle: () => void; onSelect: (f: RollupFunction) => void;
}) {
  return (
    <div className="border-t border-line-light">
      <button onClick={onToggle} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-hover-surface-white transition-colors text-ink-body">
        <span className="flex-1 text-left">{label}</span>
        <ChevronRight className={`w-3.5 h-3.5 text-ink-muted transition-transform ${isOpen ? 'rotate-90' : ''}`} />
      </button>
      {isOpen && (
        <div className="bg-surface-primary border-t border-line-faint">
          {items.map(f => (
            <button key={f.value} onClick={() => onSelect(f.value)}
              className={`w-full flex items-center gap-2 px-5 py-1.5 text-sm hover:bg-hover-surface transition-colors ${activeFn === f.value ? 'text-accent-text font-medium' : 'text-ink-body-light'}`}>
              <span className="truncate">{f.label}</span>
              {activeFn === f.value && <CheckCircle2 className="w-3 h-3 text-accent-text-soft ml-auto shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Shared section toggle button ── */
export function SectionButton({ icon, label, open, onClick }: {
  icon: React.ReactNode; label: string; open: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-hover-surface text-sm transition-colors">
      {icon}
      <span className="flex-1 text-left truncate text-ink-body">{label}</span>
      <ChevronDown className={`w-3.5 h-3.5 text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
  );
}
