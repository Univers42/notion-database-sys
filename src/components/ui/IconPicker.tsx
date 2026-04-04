/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   IconPicker.tsx                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:37:12 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/02 01:57:54 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { PICKER_ICON_NAMES } from './iconRegistry';
import { Icon } from './Icon';
import { cn } from '../../utils/cn';

// ═══════════════════════════════════════════════════════════════════════════════
// Notion-style Icon Picker — 288 icons in a filterable, portal-rendered grid.
// Renders via portal to avoid parent overflow/clipping issues.
// ═══════════════════════════════════════════════════════════════════════════════

export interface IconPickerProps {
  /** Currently selected icon name (kebab-case registry key) */
  value?: string | null;
  /** Called when user picks an icon */
  onSelect: (iconName: string) => void;
  /** Called when user clicks "Remove" */
  onRemove?: () => void;
  /** Called to close the picker */
  onClose?: () => void;
}

/** Human-readable label from kebab key */
function toLabel(name: string): string {
  return name.replaceAll('-', ' ').replaceAll(/\b\w/g, c => c.toUpperCase());
}

// ─── Inner picker panel (no portal logic) ────────────────────────────────────

function IconPickerPanel({
  value,
  onSelect,
  onRemove,
}: Readonly<IconPickerProps>) {
  const [filter, setFilter] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = useMemo(() => {
    if (!filter.trim()) return PICKER_ICON_NAMES;
    const q = filter.toLowerCase().trim();
    return PICKER_ICON_NAMES.filter(name => name.replaceAll('-', ' ').includes(q));
  }, [filter]);

  const handleRandom = useCallback(() => {
    const idx = Math.floor(Math.random() * PICKER_ICON_NAMES.length);
    onSelect(PICKER_ICON_NAMES[idx]);
  }, [onSelect]);

  return (
    <div className={cn("flex flex-col bg-surface-primary rounded-xl shadow-lg border border-line overflow-hidden w-full h-full")}>
      {/* ─── Header ─── */}
      <div className={cn("shrink-0")}>
        <div className={cn("flex items-center px-2 pt-2")}>
          <div className={cn("flex items-center")}>
            <div className={cn("relative")}>
              <button className={cn("px-2.5 py-1.5 text-sm font-medium text-ink rounded-md")}>Icon</button>
              <div className={cn("absolute bottom-0 left-2.5 right-2.5 h-[2px] bg-surface-inverse rounded-full")} />
            </div>
          </div>
          <div className={cn("ml-auto flex items-center gap-1")}>
            {onRemove && (
              <button
                onClick={onRemove}
                className={cn("px-2.5 py-1.5 text-sm text-ink-secondary hover:text-hover-text-strong hover:bg-hover-surface2 rounded-md transition-colors")}
              >
                Remove
              </button>
            )}
          </div>
        </div>

        {/* ─── Filter + Random ─── */}
        <div className={cn("px-3 pt-1.5 pb-2.5")}>
          <div className={cn("flex items-center gap-1.5")}>
            <div className={cn("flex-1 flex items-center gap-1.5 px-2 py-1 bg-surface-secondary border border-line rounded-md h-7")}>
              <svg viewBox="0 0 16 16" className={cn("w-4 h-4 shrink-0 fill-fill-secondary")} aria-hidden="true">
                <path d="M7.1 1.975a5.125 5.125 0 1 0 3.155 9.164l3.107 3.107a.625.625 0 1 0 .884-.884l-3.107-3.107A5.125 5.125 0 0 0 7.1 1.975M3.225 7.1a3.875 3.875 0 1 1 7.75 0 3.875 3.875 0 0 1-7.75 0" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                placeholder="Filter…"
                value={filter}
                onChange={e => setFilter(e.target.value)}
                className={cn("flex-1 bg-transparent text-sm outline-none placeholder:text-placeholder min-w-0")}
              />
            </div>
            <button
              onClick={handleRandom}
              className={cn("flex items-center justify-center w-7 h-7 rounded-md border border-line text-ink-secondary hover:text-hover-text-strong hover:bg-hover-surface2 transition-colors shrink-0")}
              title="Random"
            >
              <svg viewBox="0 0 16 16" className={cn("w-4 h-4 fill-current")} aria-hidden="true">
                <path d="M11.982 2.526a.625.625 0 0 0-.884.884l.915.915H10.93a3.83 3.83 0 0 0-3.27 1.837l-.386.635-.388-.637a3.83 3.83 0 0 0-3.268-1.837H2.48a.625.625 0 0 0 0 1.25h1.14c.9 0 1.733.469 2.2 1.237L6.543 8 5.82 9.19a2.58 2.58 0 0 1-2.2 1.237H2.48a.625.625 0 1 0 0 1.25h1.14A3.83 3.83 0 0 0 6.887 9.84l.388-.638.386.636a3.83 3.83 0 0 0 3.268 1.837h1.085l-.916.915a.625.625 0 1 0 .884.884l1.98-1.98a.625.625 0 0 0 0-.884l-1.98-1.98a.625.625 0 0 0-.884.884l.911.91h-1.08a2.58 2.58 0 0 1-2.2-1.236L8.006 8l.723-1.188a2.58 2.58 0 0 1 2.2-1.237h1.08l-.91.911a.625.625 0 1 0 .883.884l1.98-1.98a.625.625 0 0 0 0-.884z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Icon Grid ─── */}
      <div
        className={cn("flex-1 overflow-y-auto min-h-0 px-3 pb-3")}
        style={{ maskImage: 'linear-gradient(black 0%, black calc(100% - 24px), transparent 100%)' }}
      >
        <div className={cn("flex items-center px-1 mt-1 mb-1.5 text-xs font-medium text-ink-secondary select-none")}>
          <span>Icons</span>
          <span className={cn("ml-auto text-ink-muted tabular-nums")}>{filtered.length}</span>
        </div>

        {filtered.length === 0 ? (
          <div className={cn("text-center text-sm text-ink-muted py-8")}>No icons match "{filter}"</div>
        ) : (
          <div className={cn("grid gap-px")} style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(32px, 1fr))' }}>
            {filtered.map(name => {
              const isSelected = name === value;
              return (
                <button
                  key={name}
                  onClick={() => onSelect(name)}
                  className={cn(`flex items-center justify-center rounded aspect-square transition-colors ${
                    isSelected ? 'bg-accent-muted ring-2 ring-ring-accent-strong' : 'hover:bg-hover-surface2'
                  }`)}
                  title={toLabel(name)}
                >
                  <Icon name={name} className={cn("w-5 h-5")} fill="currentColor" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Re-export the panel as IconPicker for inline use
export { IconPickerPanel as IconPicker };
export default IconPickerPanel;
