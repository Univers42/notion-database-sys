/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   RollupCellEditorSections.tsx                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/02 14:36:05 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/03 17:11:29 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import type { SchemaProperty, RollupFunction, DatabaseSchema } from '../../types/database';
import { ExternalLink, Hash, BarChart2, ChevronDown, ChevronRight, CheckCircle2 } from 'lucide-react';
import { ROLLUP_FUNCTIONS } from './constants';
import { cn } from '../../utils/cn';

/* ── Section: Relation ── */
export function RelationSection({ relationProps, selected, open, onToggle, onSelect, relationPropId }: Readonly<{
  relationProps: SchemaProperty[]; selected: SchemaProperty | undefined | null;
  open: boolean; onToggle: () => void; onSelect: (p: SchemaProperty) => void; relationPropId: string;
}>) {
  return (
    <div className={cn("px-2 pt-2")}>
      <div className={cn("px-2 py-1 text-xs font-medium text-ink-muted uppercase tracking-wide")}>Relation</div>
      <SectionButton icon={<ExternalLink className={cn("w-4 h-4 text-ink-muted shrink-0")} />} label={selected?.name || 'Select relation…'} open={open} onClick={onToggle} />
      {open && (
        <div className={cn("ml-2 mt-1 bg-surface-secondary rounded-lg border border-line-light overflow-hidden mb-1")}>
          {relationProps.length === 0
            ? <div className={cn("px-3 py-2 text-xs text-ink-muted")}>No relation properties</div>
            : relationProps.map(rp => (
              <button key={rp.id} onClick={() => onSelect(rp)}
                className={cn(`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-hover-surface-white transition-colors ${rp.id === relationPropId ? 'bg-accent-soft text-accent-text font-medium' : 'text-ink-body'}`)}>
                <ExternalLink className={cn("w-3.5 h-3.5 text-ink-muted")} />
                <span className={cn("truncate")}>{rp.name}</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

/* ── Section: Property ── */
export function PropertySection({ targetDb, targetProps, selected, open, onToggle, onSelect, targetPropId }: Readonly<{
  targetDb: DatabaseSchema | null; targetProps: SchemaProperty[]; selected: SchemaProperty | undefined | null;
  open: boolean; onToggle: () => void; onSelect: (p: SchemaProperty) => void; targetPropId: string;
}>) {
  return (
    <div className={cn("px-2 pt-1 border-t border-line-light mt-2")}>
      <div className={cn("px-2 py-1 text-xs font-medium text-ink-muted uppercase tracking-wide")}>Property</div>
      <button onClick={onToggle} disabled={!targetDb}
        className={cn("w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-hover-surface text-sm transition-colors")}>
        <Hash className={cn("w-4 h-4 text-ink-muted shrink-0")} />
        <span className={cn(`flex-1 text-left truncate ${targetDb ? 'text-ink-body' : 'text-ink-muted'}`)}>
          {selected?.name || (targetDb ? 'Select property…' : 'Select relation first')}
        </span>
        <ChevronDown className={cn(`w-3.5 h-3.5 text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`)} />
      </button>
      {open && targetDb && (
        <div className={cn("ml-2 mt-1 bg-surface-secondary rounded-lg border border-line-light overflow-hidden max-h-40 overflow-y-auto mb-1")}>
          {targetProps.map(tp => (
            <button key={tp.id} onClick={() => onSelect(tp)}
              className={cn(`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-hover-surface-white transition-colors ${tp.id === targetPropId ? 'bg-accent-soft text-accent-text font-medium' : 'text-ink-body'}`)}>
              <span className={cn("truncate")}>{tp.name}</span>
              <span className={cn("text-xs text-ink-muted ml-auto shrink-0")}>{tp.type}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Section: Calculate ── */
export function CalculateSection({ fn, selectedFnLabel, fnGroups, open, calcSubmenu, onToggle, onSelect, setCalcSubmenu }: Readonly<{
  fn: RollupFunction; selectedFnLabel: string;
  fnGroups: Record<string, typeof ROLLUP_FUNCTIONS>;
  open: boolean; calcSubmenu: string | null;
  onToggle: () => void; onSelect: (f: RollupFunction) => void;
  setCalcSubmenu: (s: string | null) => void;
}>) {
  return (
    <div className={cn("px-2 pt-1 border-t border-line-light mt-2 pb-2")}>
      <div className={cn("px-2 py-1 text-xs font-medium text-ink-muted uppercase tracking-wide")}>Calculate</div>
      <SectionButton icon={<BarChart2 className={cn("w-4 h-4 text-ink-muted shrink-0")} />} label={selectedFnLabel} open={open} onClick={onToggle} />
      {open && (
        <div className={cn("ml-2 mt-1 bg-surface-secondary rounded-lg border border-line-light overflow-hidden mb-1")}>
          {ROLLUP_FUNCTIONS.filter(f => f.group === 'Show').map(f => (
            <button key={f.value} onClick={() => onSelect(f.value)}
              className={cn(`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-hover-surface-white transition-colors ${fn === f.value ? 'bg-accent-soft text-accent-text font-medium' : 'text-ink-body'}`)}>
              <span className={cn("truncate")}>{f.label}</span>
              {fn === f.value && <CheckCircle2 className={cn("w-3.5 h-3.5 text-accent-text-soft ml-auto shrink-0")} />}
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
  label: string; items: readonly { value: RollupFunction; label: string }[];
  activeFn: RollupFunction; isOpen: boolean;
  onToggle: () => void; onSelect: (f: RollupFunction) => void;
}) {
  return (
    <div className={cn("border-t border-line-light")}>
      <button onClick={onToggle} className={cn("w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-hover-surface-white transition-colors text-ink-body")}>
        <span className={cn("flex-1 text-left")}>{label}</span>
        <ChevronRight className={cn(`w-3.5 h-3.5 text-ink-muted transition-transform ${isOpen ? 'rotate-90' : ''}`)} />
      </button>
      {isOpen && (
        <div className={cn("bg-surface-primary border-t border-line-faint")}>
          {items.map(f => (
            <button key={f.value} onClick={() => onSelect(f.value)}
              className={cn(`w-full flex items-center gap-2 px-5 py-1.5 text-sm hover:bg-hover-surface transition-colors ${activeFn === f.value ? 'text-accent-text font-medium' : 'text-ink-body-light'}`)}>
              <span className={cn("truncate")}>{f.label}</span>
              {activeFn === f.value && <CheckCircle2 className={cn("w-3 h-3 text-accent-text-soft ml-auto shrink-0")} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Shared section toggle button ── */
export function SectionButton({ icon, label, open, onClick }: Readonly<{
  icon: React.ReactNode; label: string; open: boolean; onClick: () => void;
}>) {
  return (
    <button onClick={onClick} className={cn("w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-hover-surface text-sm transition-colors")}>
      {icon}
      <span className={cn("flex-1 text-left truncate text-ink-body")}>{label}</span>
      <ChevronDown className={cn(`w-3.5 h-3.5 text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`)} />
    </button>
  );
}
