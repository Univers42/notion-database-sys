/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   RollupEditorHelpers.tsx                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:39:40 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 18:35:36 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ═══════════════════════════════════════════════════════════════════════════════
// Rollup editor helpers — constants, shared widgets, and sub-section components
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { ChevronDown, Hash, BarChart2 } from 'lucide-react';
import type { RollupFunction, RollupDisplayAs } from '../types/database';

// ─── Constants ───────────────────────────────────────────────────────────────

export const ROLLUP_FUNCTIONS: { value: RollupFunction; label: string; group: string }[] = [
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

export const DISPLAY_OPTIONS: { value: RollupDisplayAs; label: string; icon: React.ReactNode }[] = [
  { value: 'number', label: 'Number',  icon: <Hash className="w-3.5 h-3.5" /> },
  { value: 'bar',    label: 'Bar',     icon: <BarChart2 className="w-3.5 h-3.5" /> },
  { value: 'ring',   label: 'Ring',    icon: <span className="w-3.5 h-3.5 inline-flex items-center justify-center"><svg viewBox="0 0 14 14" className="w-3.5 h-3.5"><circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="34.56 34.56" strokeDashoffset="8.64" /></svg></span> },
];

// ─── Shared sub-components ───────────────────────────────────────────────────

export function SectionHeader({ label }: Readonly<{ label: string }>) {
  return (
    <div className="flex items-center px-3 pt-3 pb-1">
      <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">{label}</span>
    </div>
  );
}

export function DropdownButton({ label, muted, disabled, open, onClick }: Readonly<{
  label: string; muted?: boolean; disabled?: boolean; open?: boolean; onClick: () => void;
}>) {
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

export function PickerList({ children, maxH = 'max-h-48' }: Readonly<{ children: React.ReactNode; maxH?: string }>) {
  return (
    <div className={`mt-1 bg-surface-secondary rounded-lg border border-line-light overflow-y-auto ${maxH}`}>
      {children}
    </div>
  );
}

export function PickerItem({ children, selected, onClick }: Readonly<{ children: React.ReactNode; selected?: boolean; onClick: () => void }>) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-sm transition-colors ${
        selected ? 'bg-accent-soft text-accent-text font-medium' : 'text-ink-body hover:bg-hover-surface-white'
      }`}>
      {children}
    </button>
  );
}

// ─── Function selector section ───────────────────────────────────────────────

export function FunctionSelector({ fn, setFn, showFnPicker, setShowFnPicker }: Readonly<{
  fn: RollupFunction;
  setFn: (f: RollupFunction) => void;
  showFnPicker: boolean;
  setShowFnPicker: (v: boolean) => void;
}>) {
  const selectedFn = ROLLUP_FUNCTIONS.find(f => f.value === fn);
  return (
    <>
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
    </>
  );
}

// ─── Display mode selector section ───────────────────────────────────────────

export function DisplaySelector({ fn, displayAs, setDisplayAs, showDisplayPicker, setShowDisplayPicker }: Readonly<{
  fn: RollupFunction;
  displayAs: RollupDisplayAs;
  setDisplayAs: (d: RollupDisplayAs) => void;
  showDisplayPicker: boolean;
  setShowDisplayPicker: (v: boolean) => void;
}>) {
  if (['show_original', 'show_unique'].includes(fn)) return null;
  return (
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
  );
}
