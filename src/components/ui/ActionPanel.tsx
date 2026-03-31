/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ActionPanel.tsx                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:37:02 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 18:35:36 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { PanelItemRow, SectionDivider } from './ActionPanelRows';

// ═══════════════════════════════════════════════════════════════════════════════
// ActionPanel — a declarative, config-driven action menu.
//
// Pass an array of sections. Each section has items. Items can be:
//   • 'action'  — icon + label + optional shortcut + onClick
//   • 'toggle'  — icon + label + toggle switch
//   • 'link'    — icon + label + href (external link)
//   • 'info'    — plain text info line (e.g. "Last edited by…")
//
// Sections are automatically separated by dividers. If you add more sections
// the component handles layout responsively — no hardcoding needed.
// ═══════════════════════════════════════════════════════════════════════════════

/* ─── Public types ──────────────────────────────────────────────────────── */

export interface ActionItem {
  type?: 'action';
  icon?: React.ReactNode;
  label: string;
  shortcut?: string;
  onClick?: () => void;
  danger?: boolean;
  /** Highlight this row (e.g. with a tinted background) */
  active?: boolean;
}

export interface ToggleItem {
  type: 'toggle';
  icon?: React.ReactNode;
  label: string;
  shortcut?: string;
  checked: boolean;
  onToggle: (next: boolean) => void;
}

export interface LinkItem {
  type: 'link';
  icon?: React.ReactNode;
  label: string;
  href: string;
  /** Open in new tab (default true) */
  external?: boolean;
  muted?: boolean;
}

export interface InfoItem {
  type: 'info';
  /** Multiple lines are rendered stacked */
  lines: string[];
}

export type PanelItem = ActionItem | ToggleItem | LinkItem | InfoItem;

export interface PanelSection {
  /** Optional label rendered above the section */
  label?: string;
  items: PanelItem[];
}

export interface ActionPanelProps {
  /** Array of sections — each rendered with items, separated by dividers */
  sections: PanelSection[];
  /** Show a search input at the top. Items are filtered by label. */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Width of the panel (default 265) */
  width?: number;
  /** Extra className on the outermost wrapper */
  className?: string;
}

/* ─── Component ─────────────────────────────────────────────────────────── */

export function ActionPanel({
  sections,
  searchable = false,
  searchPlaceholder = 'Search actions…',
  width = 265,
  className = '',
}: ActionPanelProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchable && inputRef.current) inputRef.current.focus();
  }, [searchable]);

  /* Filter sections/items when search is active */
  const filtered: PanelSection[] = useMemo(() => {
    if (!query.trim()) return sections;
    const q = query.toLowerCase();
    return sections
      .map(s => ({
        ...s,
        items: s.items.filter(item => {
          if (item.type === 'info') return item.lines.some(l => l.toLowerCase().includes(q));
          return (item as any).label?.toLowerCase().includes(q);
        }),
      }))
      .filter(s => s.items.length > 0);
  }, [sections, query]);

  return (
    <div
      className={`flex flex-col bg-surface-primary border border-line rounded-xl shadow-lg overflow-hidden ${className}`}
      style={{ width, minWidth: 180, maxWidth: 'calc(100vw - 24px)' }}
    >
      <div className="flex flex-col" style={{ maxHeight: '70vh' }}>
        {/* ── Search ── */}
        {searchable && (
          <div className="shrink-0 px-2 pt-2 pb-1">
            <div className="flex items-center gap-1.5 rounded-md border border-line bg-surface-secondary-soft3 px-2 h-7">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-placeholder text-ink-strong"
              />
            </div>
          </div>
        )}

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1 min-h-0">
          {filtered.map((section, si) => (
            <div key={si}>
              {/* Divider between sections (not before first) */}
              {si > 0 && <SectionDivider />}

              <div className="flex flex-col gap-px p-1">
                {/* Section label */}
                {section.label && (
                  <div className="flex items-center px-2 mt-1.5 mb-2 text-xs font-medium leading-[1.2] text-ink-secondary select-none">
                    <span className="truncate">{section.label}</span>
                  </div>
                )}

                {/* Items */}
                {section.items.map((item, ii) => (
                  <PanelItemRow key={ii} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
