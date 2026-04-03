/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   SubComponentsExtra.tsx                             :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/02 14:38:39 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/02 14:38:40 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState, useRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Icon } from '../ui/Icon';
import { IconPickerPopover } from '../ui/IconPickerPopover';
import type { ViewType } from '../../types/database';
import { DEFAULT_VIEW_ICONS } from './constants';
import { InfoCircleIcon } from '../ui/Icons';
import { cn } from '../../utils/cn';

// ─── CardLayoutPicker ────────────────────────────────────────────────────────

export function CardLayoutPicker({ value, onChange }: Readonly<{ value: 'compact' | 'list'; onChange: (v: 'compact' | 'list') => void }>) {
  return (
    <div className={cn("mx-2 mb-2 rounded-[10px] p-3 bg-surface-tertiary-soft4 flex flex-col items-center overflow-hidden")}>
      <div className={cn("text-xs font-medium text-ink-secondary mb-3 select-none")}>Card layout</div>
      <div className={cn("flex justify-center w-full px-1.5 gap-3")}>
        {(['compact', 'list'] as const).map(layout => {
          const isActive = value === layout;
          const accent = isActive ? 'bg-accent-muted2' : 'bg-surface-tertiary';
          const elAccent = isActive ? 'bg-accent-subtle2' : 'bg-surface-muted-soft';
          return (
            <div key={layout} className={cn("flex flex-col items-center flex-1 max-w-[150px] gap-1.5")}>
              <button type="button" role="radio" aria-checked={isActive}
                onClick={() => onChange(layout)}
                className={cn("relative w-full bg-surface-primary border-none rounded-[10px]")}
                style={{
                  padding: 10, aspectRatio: '4 / 3',
                  outline: isActive ? '2px solid var(--color-outline-active)' : '1px solid var(--color-outline-inactive)',
                  outlineOffset: isActive ? -2 : -1,
                }}>
                <div className={cn(`absolute inset-x-0 top-0 h-[32%] ${accent} rounded-t-[10px]`)} />
                <div className={cn(`absolute left-[10%] top-[23%] h-[18%] aspect-square rounded-full ${elAccent}`)} />
                {layout === 'compact' ? (
                  <>
                    <div className={cn("absolute left-[10%] top-[50%] w-[75%] h-[7%] flex gap-[5px]")}>
                      <div className={cn(`rounded-full h-full ${elAccent} flex-1`)} />
                      <div className={cn(`rounded-full h-full ${elAccent} flex-1`)} />
                      <div className={cn(`rounded-full h-full ${elAccent} flex-1`)} />
                    </div>
                    <div className={cn("absolute left-[10%] top-[66%] w-[60%] h-[7%] flex gap-[5px]")}>
                      <div className={cn(`rounded-full h-full ${elAccent} flex-1`)} />
                      <div className={cn(`rounded-full h-full ${elAccent} flex-1`)} />
                    </div>
                  </>
                ) : (
                  <div className={cn("absolute left-[10%] top-[50%] flex flex-col gap-[20%] h-[36%] w-full")}>
                    <div className={cn(`rounded-full h-full w-[55%] ${elAccent}`)} />
                    <div className={cn(`rounded-full h-full w-[25%] ${elAccent}`)} />
                    <div className={cn(`rounded-full h-full w-[40%] ${elAccent}`)} />
                  </div>
                )}
              </button>
              <span className={cn(`text-sm ${isActive ? 'text-ink' : 'text-ink-secondary'}`)}>
                {layout === 'compact' ? 'Compact' : 'List'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── ViewIdentityRow ─────────────────────────────────────────────────────────

export function ViewIdentityRow({ viewIcon, setViewIcon, viewName, onNameChange, onIconChange, fallbackIcon: _fallbackIcon, viewType }: Readonly<{
  viewIcon: string; setViewIcon: (v: string) => void; viewName: string;
  onNameChange: (v: string) => void; onIconChange: (v: string) => void;
  fallbackIcon: React.ReactNode; viewType: ViewType;
}>) {
  const [showPicker, setShowPicker] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const currentIcon = viewIcon || DEFAULT_VIEW_ICONS[viewType];

  return (
    <div className={cn("px-4 pt-1 pb-1.5")}>
      <div className={cn("flex items-center gap-2")}>
        <button ref={btnRef} onClick={() => setShowPicker(!showPicker)}
          className={cn("inline-flex items-center justify-center w-7 h-7 rounded-md border border-line hover:border-hover-border text-ink-secondary bg-surface-primary transition-colors shrink-0")}
          title="Change icon">
          <Icon name={currentIcon} className={cn("w-[18px] h-[18px]")} />
        </button>
        {showPicker && (
          <IconPickerPopover anchorRef={btnRef} value={viewIcon || null}
            onSelect={name => { setViewIcon(name); onIconChange(name); setShowPicker(false); }}
            onRemove={() => { setViewIcon(''); onIconChange(''); setShowPicker(false); }}
            onClose={() => setShowPicker(false)} />
        )}
        <div className={cn("flex-1 min-w-0")}>
          <div className={cn("flex items-center h-7 rounded-md border border-line bg-surface-secondary-soft px-1.5")}>
            <input placeholder="View name" type="text" value={viewName} onChange={e => onNameChange(e.target.value)}
              className={cn("flex-1 text-sm text-ink outline-none bg-transparent min-w-0")} />
            <div className={cn("relative group/info ml-1")}>
              <InfoCircleIcon className={cn("w-[14px] h-[14px] text-ink-muted cursor-help")} />
              <div className={cn("absolute right-0 bottom-full mb-1 w-48 p-2 bg-surface-inverse text-ink-inverse text-[10px] rounded-lg opacity-0 group-hover/info:opacity-100 pointer-events-none transition-opacity z-50")}>
                Configure how this view displays your data. Changes only affect this view.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PropertyRow ─────────────────────────────────────────────────────────────

export function PropertyVisibilityRow({ propId: _propId, propName, iconName, visible, databaseId: _databaseId, onToggle, onIconChange }: Readonly<{
  propId: string; propName: string; iconName: string; visible: boolean;
  databaseId: string; onToggle: () => void; onIconChange: (name: string) => void;
}>) {
  const [showPicker, setShowPicker] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  return (
    <div className={cn("flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-hover-surface transition-colors text-sm group")}>
      <button ref={btnRef} onClick={e => { e.stopPropagation(); setShowPicker(!showPicker); }}
        className={cn("flex items-center justify-center w-5 h-5 rounded hover:bg-hover-surface3 transition-colors shrink-0")} title="Change property icon">
        <Icon name={iconName} className={cn("w-4 h-4 text-ink-muted")} />
      </button>
      {showPicker && (
        <IconPickerPopover anchorRef={btnRef} value={iconName}
          onSelect={name => { onIconChange(name); setShowPicker(false); }}
          onRemove={() => { onIconChange(''); setShowPicker(false); }}
          onClose={() => setShowPicker(false)} />
      )}
      <button onClick={onToggle} className={cn("flex-1 text-left min-w-0 truncate")}>
        <span className={cn(visible ? 'text-ink' : 'text-ink-muted')}>{propName}</span>
      </button>
      <button onClick={onToggle} className={cn("shrink-0")}>
        {visible
          ? <Eye className={cn("w-3.5 h-3.5 text-accent-text-soft opacity-60 group-hover:opacity-100")} />
          : <EyeOff className={cn("w-3.5 h-3.5 text-ink-disabled group-hover:text-ink-muted")} />}
      </button>
    </div>
  );
}
