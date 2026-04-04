/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   SubComponents.tsx                                  :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:39:07 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 22:31:03 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { SettingsHeader } from '../ui/MenuPrimitives';
import { ToggleSwitch } from '../ui/ToggleSwitch';
import { cn } from '../../utils/cn';

/** Renders a settings sub-panel header with back and close buttons. */
export function SubPanelHeader({ title, onBack, onClose }: Readonly<{ title: string; onBack?: () => void; onClose?: () => void }>) {
  return <SettingsHeader title={title} onBack={onBack} onClose={onClose} />;
}

/** Renders a vertical list of selectable options with active highlighting. */
export function OptionList({ options, activeId, onSelect }: Readonly<{
  options: { id: string; label: string }[];
  activeId: string;
  onSelect: (id: string) => void;
}>) {
  return (
    <div className={cn("p-4 flex flex-col gap-1")}>
      {options.map(o => (
        <button key={o.id} onClick={() => onSelect(o.id)}
          className={cn(`px-3 py-2.5 text-sm rounded-lg text-left transition-colors ${
            activeId === o.id ? 'bg-accent-soft text-accent-text font-medium' : 'text-ink-body hover:bg-hover-surface'
          }`)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Renders a vertical list of database properties as selectable options. */
export function PropertyOptionList({ properties, activeId, onSelect, noneLabel }: Readonly<{
  properties: { id: string; name: string }[];
  activeId: string;
  onSelect: (id: string) => void;
  noneLabel?: string;
}>) {
  return (
    <div className={cn("p-4 flex flex-col gap-1")}>
      {noneLabel && (
        <button onClick={() => onSelect('')}
          className={cn(`px-3 py-2.5 text-sm rounded-lg text-left transition-colors ${
            activeId ? 'text-ink-body hover:bg-hover-surface' : 'bg-accent-soft text-accent-text font-medium'
          }`)}>
          {noneLabel}
        </button>
      )}
      {properties.map(p => (
        <button key={p.id} onClick={() => onSelect(p.id)}
          className={cn(`px-3 py-2.5 text-sm rounded-lg text-left transition-colors ${
            activeId === p.id ? 'bg-accent-soft text-accent-text font-medium' : 'text-ink-body hover:bg-hover-surface'
          }`)}>
          {p.name}
        </button>
      ))}
    </div>
  );
}

/** Renders a labeled toggle switch. */
export function Toggle({ label, checked, onChange }: Readonly<{ label: string; checked: boolean; onChange: (v: boolean) => void }>) {
  return <ToggleSwitch label={label} checked={checked} onChange={onChange} size="md" />;
}

export { CardLayoutPicker, ViewIdentityRow, PropertyVisibilityRow } from './SubComponentsExtra';
