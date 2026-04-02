/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   SubComponents.tsx                                  :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:39:07 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/02 01:19:23 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ═══════════════════════════════════════════════════════════════════════════════
// View settings — shared sub-components
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { SettingsHeader } from '../ui/MenuPrimitives';

// ─── SubPanelHeader ──────────────────────────────────────────────────────────

export function SubPanelHeader({ title, onBack, onClose }: Readonly<{ title: string; onBack?: () => void; onClose?: () => void }>) {
  return <SettingsHeader title={title} onBack={onBack} onClose={onClose} />;
}

// ─── OptionList ──────────────────────────────────────────────────────────────

export function OptionList({ options, activeId, onSelect }: {
  options: { id: string; label: string }[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="p-4 flex flex-col gap-1">
      {options.map(o => (
        <button key={o.id} onClick={() => onSelect(o.id)}
          className={`px-3 py-2.5 text-sm rounded-lg text-left transition-colors ${
            activeId === o.id ? 'bg-accent-soft text-accent-text font-medium' : 'text-ink-body hover:bg-hover-surface'
          }`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── PropertyOptionList ──────────────────────────────────────────────────────

export function PropertyOptionList({ properties, activeId, onSelect, noneLabel }: {
  properties: { id: string; name: string }[];
  activeId: string;
  onSelect: (id: string) => void;
  noneLabel?: string;
}) {
  return (
    <div className="p-4 flex flex-col gap-1">
      {noneLabel && (
        <button onClick={() => onSelect('')}
          className={`px-3 py-2.5 text-sm rounded-lg text-left transition-colors ${
            !activeId ? 'bg-accent-soft text-accent-text font-medium' : 'text-ink-body hover:bg-hover-surface'
          }`}>
          {noneLabel}
        </button>
      )}
      {properties.map(p => (
        <button key={p.id} onClick={() => onSelect(p.id)}
          className={`px-3 py-2.5 text-sm rounded-lg text-left transition-colors ${
            activeId === p.id ? 'bg-accent-soft text-accent-text font-medium' : 'text-ink-body hover:bg-hover-surface'
          }`}>
          {p.name}
        </button>
      ))}
    </div>
  );
}

// ─── Toggle ──────────────────────────────────────────────────────────────────

export function Toggle({ label, checked, onChange }: Readonly<{ label: string; checked: boolean; onChange: (v: boolean) => void }>) {
  return (
    <button onClick={() => onChange(!checked)}
      className="flex items-center justify-between text-sm text-ink-body py-1 px-1 rounded-lg hover:bg-hover-surface transition-colors">
      <span>{label}</span>
      <div className={`relative w-9 h-5 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-surface-strong'}`}>
        <div className={`absolute w-4 h-4 bg-surface-primary rounded-full shadow-sm top-0.5 transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </div>
    </button>
  );
}

export { CardLayoutPicker, ViewIdentityRow, PropertyVisibilityRow } from './SubComponentsExtra';
