import React from 'react';
import { ChevronRightIcon, CloseIcon } from './Icons';

// ═══════════════════════════════════════════════════════════════════════════════
// Toggle & Setting Row primitives (no-icon variants for layout-settings panels)
// ═══════════════════════════════════════════════════════════════════════════════

/* ─── ToggleSwitch ─────────────────────────────────────────────────────
   Notion-style inline toggle switch (14px height, 26px width).
   Use standalone or inside ToggleSettingRow.
   ─────────────────────────────────────────────────────────────────── */
export function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={e => { e.stopPropagation(); onChange(!checked); }}
      className="relative shrink-0"
      role="switch" aria-checked={checked}>
      <div className={`flex shrink-0 h-[14px] w-[26px] rounded-full p-[2px] transition-colors duration-200 ${
        checked ? 'bg-blue-500' : 'bg-gray-300'
      }`} style={{ boxSizing: 'content-box' }}>
        <div className={`w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-transform duration-200 ${
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
export function ToggleSettingRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      role="menuitemcheckbox"
      aria-checked={checked}
      className="w-full flex items-center rounded-md hover:bg-gray-100/60 transition-colors px-2 py-[7px]"
    >
      <span className="flex-1 text-sm text-gray-800 truncate text-left">{label}</span>
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
export function NavSettingRow({ label, value, onClick }: { label: string; value?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      role="menuitem"
      className="w-full flex items-center rounded-md hover:bg-gray-100/60 transition-colors px-2 py-[7px]"
    >
      <span className="flex-1 text-sm text-gray-800 truncate text-left">{label}</span>
      <span className="flex items-center text-gray-400 shrink-0 ml-2">
        {value && <span className="text-sm text-gray-400 truncate max-w-[120px]">{value}</span>}
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

export function MenuRow({ icon, label, onClick, className = '', danger = false }: MenuRowProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-[6px] text-sm rounded-md transition-colors
        ${danger
          ? 'text-red-600 hover:bg-red-50'
          : 'text-gray-700 hover:bg-gray-100/70'
        } ${className}`}
    >
      <span className={`flex items-center justify-center shrink-0 ${danger ? 'text-red-500' : 'text-gray-400'}`}>
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

export function SettingsRow({ icon, label, value, showChevron, onClick }: SettingsRowProps) {
  const hasChevron = showChevron ?? !!onClick;
  return (
    <button
      onClick={onClick}
      role="menuitem"
      className="w-full flex rounded-md transition-colors text-gray-800 hover:bg-gray-100/60"
      style={{ fill: 'currentColor' }}
    >
      <div className="flex items-center gap-0 w-full px-2 py-[6px]">
        {/* Left icon */}
        <span className="flex items-center justify-center shrink-0 w-5 h-5 text-gray-500">
          {icon}
        </span>
        {/* Label */}
        <span className="flex-1 text-sm leading-5 text-left ml-2 truncate">{label}</span>
        {/* Right side: value + chevron */}
        {(value || hasChevron) && (
          <span className="flex items-center text-gray-400 shrink-0 ml-2">
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

/* ─── SettingsHeader ──────────────────────────────────────────────────────
   Panel header with title + optional back arrow + close (X) button.
   Matches Notion's "View settings" header exactly.
   ─────────────────────────────────────────────────────────────────────── */

export interface SettingsHeaderProps {
  title: string;
  onClose?: () => void;
  onBack?: () => void;
}

export function SettingsHeader({ title, onClose, onBack }: SettingsHeaderProps) {
  return (
    <div className="flex items-center shrink-0" style={{ paddingTop: 14, paddingBottom: 6, paddingInline: 16, height: 42 }}>
      {onBack && (
        <button
          onClick={onBack}
          className="p-1 -ml-1 mr-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor" aria-hidden="true">
            <path d="M9.278 12.762a.625.625 0 1 0 .884-.884L6.284 8l3.878-3.878a.625.625 0 0 0-.884-.884l-4.32 4.32a.625.625 0 0 0 0 .884z" />
          </svg>
        </button>
      )}
      <span className="text-xs font-medium leading-4 text-gray-500 flex-1">{title}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="p-1 rounded-full text-gray-400 hover:text-gray-600 bg-gray-100/60 hover:bg-gray-200/60 transition-colors"
        >
          <CloseIcon className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

/* ─── SettingsSectionLabel ─────────────────────────────────────────────────
   Muted section label divider within settings panels
   (e.g. "Data source settings"). Includes a top 1px border.
   ─────────────────────────────────────────────────────────────────────── */

export function SettingsSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative pt-[6px] mt-1">
      <div className="absolute top-0 left-4 right-4 h-px bg-gray-200/70" />
      <div className="flex px-2 mt-1.5 mb-2 text-xs font-medium leading-[1.2] text-gray-500 select-none pt-1">
        <span className="truncate">{children}</span>
      </div>
    </div>
  );
}

/* ─── MenuDivider ─────────────────────────────────────────────────────────
   Thin separator used between menu sections (matches Notion's 1px line).
   ─────────────────────────────────────────────────────────────────────── */

export function MenuDivider() {
  return (
    <div className="relative my-[3px] mx-3">
      <div className="h-px bg-gray-200/80" />
    </div>
  );
}

/* ─── ViewTypeCard ────────────────────────────────────────────────────────
   A card used in the "Add a new view" grid and the layout-switcher grid.
   Shows an icon centered above a label, inside a rounded interactive box.
   ─────────────────────────────────────────────────────────────────────── */

export interface ViewTypeCardProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export function ViewTypeCard({ icon, label, active = false, onClick }: ViewTypeCardProps) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 rounded-lg overflow-hidden transition-all
        w-[92px] h-[62px]
        ${active
          ? 'bg-blue-50 border-2 border-blue-500 text-blue-600'
          : 'bg-transparent border border-transparent hover:bg-gray-100/60 text-gray-600'
        }`}
    >
      <span className={active ? 'text-blue-500' : 'text-current'}>{icon}</span>
      <span className="text-sm leading-5 font-normal text-center px-1 truncate w-full">{label}</span>
    </button>
  );
}

/* ─── PanelHeader ─────────────────────────────────────────────────────────
   Small muted section header label (like "Add a new view").
   ─────────────────────────────────────────────────────────────────────── */

export function PanelSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center px-2 mt-1.5 mb-2 text-xs font-medium leading-[1.2] text-gray-400 select-none">
      <span className="truncate">{children}</span>
    </div>
  );
}
