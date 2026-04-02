/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   MenuPrimitives.tsx                                 :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:37:19 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 19:40:54 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { ChevronRightIcon } from './Icons';

// ═══════════════════════════════════════════════════════════════════════════════
// Toggle & Setting Row primitives (no-icon variants for layout-settings panels)
// ═══════════════════════════════════════════════════════════════════════════════

/* ─── ToggleSwitch ─────────────────────────────────────────────────────
   Notion-style inline toggle switch (14px height, 26px width).
   Use standalone or inside ToggleSettingRow.
   ─────────────────────────────────────────────────────────────────── */
export function ToggleSwitch({ checked, onChange }: Readonly<{ checked: boolean; onChange: (v: boolean) => void }>) {
  return (
    <button onClick={e => { e.stopPropagation(); onChange(!checked); }}
      className="relative shrink-0"
      role="switch" aria-checked={checked}>
      <div className={`flex shrink-0 h-[14px] w-[26px] rounded-full p-[2px] transition-colors duration-200 ${
        checked ? 'bg-accent' : 'bg-surface-strong'
      }`} style={{ boxSizing: 'content-box' }}>
        <div className={`w-[14px] h-[14px] rounded-full bg-surface-primary shadow-sm transition-transform duration-200 ${
          checked ? 'translate-x-[12px]' : 'translate-x-0'
        }`} />
      </div>
    </button>
  );
}

/* ─── ToggleSettingRow ──────────────────────────────────────────────────
   Full-row toggle: label on left, ToggleSwitch on right.
   No left icon — used in per-view layout settings panels.
   ─────────────────────────────────────────────────────────────────── */
export function ToggleSettingRow({ label, checked, onChange }: Readonly<{ label: string; checked: boolean; onChange: (v: boolean) => void }>) {
  return (
    <button
      onClick={() => onChange(!checked)}
      role="menuitemcheckbox"
      aria-checked={checked}
      className="w-full flex items-center rounded-md hover:bg-hover-surface-soft3 transition-colors px-2 py-[7px]"
    >
      <span className="flex-1 text-sm text-ink-strong truncate text-left">{label}</span>
      <div className="shrink-0 ml-2">
        <ToggleSwitch checked={checked} onChange={onChange} />
      </div>
    </button>
  );
}

/* ─── NavSettingRow ────────────────────────────────────────────────────
   Navigation row: label on left, optional value + chevron on right.
   No left icon — used in per-view layout settings panels.
   ─────────────────────────────────────────────────────────────────── */
export function NavSettingRow({ label, value, onClick }: Readonly<{ label: string; value?: string; onClick: () => void }>) {
  return (
    <button
      onClick={onClick}
      role="menuitem"
      className="w-full flex items-center rounded-md hover:bg-hover-surface-soft3 transition-colors px-2 py-[7px]"
    >
      <span className="flex-1 text-sm text-ink-strong truncate text-left">{label}</span>
      <span className="flex items-center text-ink-muted shrink-0 ml-2">
        {value && <span className="text-sm text-ink-muted truncate max-w-[120px]">{value}</span>}
        <ChevronRightIcon className="w-[14px] h-[14px] ml-1.5" />
      </span>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Reusable primitives used throughout the database widget panels / menus.
// Import these instead of duplicating the icon+label row pattern.
// ═══════════════════════════════════════════════════════════════════════════════

/* ─── MenuRow ─────────────────────────────────────────────────────────────
   Clickable row with an SVG icon on the left and a label on the right.
   Used in dropdown menus, context menus, and action panels.
   ─────────────────────────────────────────────────────────────────────── */

export interface MenuRowProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  className?: string;
  /** Render the label in red (destructive action) */
  danger?: boolean;
}

export function MenuRow({ icon, label, onClick, className = '', danger = false }: Readonly<MenuRowProps>) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-[6px] text-sm rounded-md transition-colors
        ${danger
          ? 'text-danger-text hover:bg-hover-danger'
          : 'text-ink-body hover:bg-hover-surface-soft2'
        } ${className}`}
    >
      <span className={`flex items-center justify-center shrink-0 ${danger ? 'text-danger-text-soft' : 'text-ink-muted'}`}>
        {icon}
      </span>
      <span className="truncate">{label}</span>
    </button>
  );
}

/* ─── SettingsRow ──────────────────────────────────────────────────────────
   Navigation row with icon, label, optional right-side value, and chevron.
   Matches Notion's settings panel row pattern exactly.
   Used in ViewSettingsPanel and sub-screens.
   ─────────────────────────────────────────────────────────────────────── */

export interface SettingsRowProps {
  icon: React.ReactNode;
  label: string;
  /** Value displayed on the right (e.g. "Table", "4") */
  value?: string;
  /** Whether to show the right-side chevron. Default: true when onClick provided */
  showChevron?: boolean;
  onClick?: () => void;
}

export function SettingsRow({ icon, label, value, showChevron, onClick }: Readonly<SettingsRowProps>) {
  const hasChevron = showChevron ?? !!onClick;
  return (
    <button
      onClick={onClick}
      role="menuitem"
      className="w-full flex rounded-md transition-colors text-ink-strong hover:bg-hover-surface-soft3"
      style={{ fill: 'currentColor' }}
    >
      <div className="flex items-center gap-0 w-full px-2 py-[6px]">
        {/* Left icon */}
        <span className="flex items-center justify-center shrink-0 w-5 h-5 text-ink-secondary">
          {icon}
        </span>
        {/* Label */}
        <span className="flex-1 text-sm leading-5 text-left ml-2 truncate">{label}</span>
        {/* Right side: value + chevron */}
        {(value || hasChevron) && (
          <span className="flex items-center text-ink-muted shrink-0 ml-2">
            {value && (
              <span className="text-sm leading-5 truncate max-w-[120px]">{value}</span>
            )}
            {hasChevron && (
              <ChevronRightIcon className="w-[14px] h-[14px] ml-1.5" />
            )}
          </span>
        )}
      </div>
    </button>
  );
}

/* ─── SettingsHeader, SettingsSectionLabel, MenuDivider, ViewTypeCard, PanelSectionLabel ──
   Re-exported from ./SettingsPrimitives for backward compatibility.
   ─────────────────────────────────────────────────────────────────────── */

export { SettingsHeader, SettingsSectionLabel, MenuDivider, ViewTypeCard, PanelSectionLabel } from './SettingsPrimitives';
export type { SettingsHeaderProps, ViewTypeCardProps } from './SettingsPrimitives';
