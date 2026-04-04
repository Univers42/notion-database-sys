/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   MenuPrimitives.tsx                                 :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:37:19 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 22:31:02 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { ChevronRightIcon } from './Icons';
import { ToggleSwitch } from './ToggleSwitch';
import { cn } from '../../utils/cn';

export { ToggleSwitch } from './ToggleSwitch';

export type ToggleSettingRowSlots = {
  root?: string;
  label?: string;
  toggle?: string;
};

/** Full-width toggle row with label on left and switch on right. */
export function ToggleSettingRow({ label, checked, onChange, slots = {} }: Readonly<{ label: string; checked: boolean; onChange: (v: boolean) => void; slots?: Partial<ToggleSettingRowSlots> }>) {
  return (
    <button
      onClick={() => onChange(!checked)}
      role="menuitemcheckbox"
      aria-checked={checked}
      className={cn("w-full flex items-center rounded-md hover:bg-hover-surface-soft3 transition-colors px-2 py-[7px]", slots.root)}
    >
      <span className={cn("flex-1 text-sm text-ink-strong truncate text-left", slots.label)}>{label}</span>
      <div className={cn("shrink-0 ml-2", slots.toggle)}>
        <ToggleSwitch checked={checked} onChange={onChange} />
      </div>
    </button>
  );
}

export type NavSettingRowSlots = {
  root?: string;
  label?: string;
  valueWrap?: string;
  value?: string;
  chevron?: string;
};

/** Navigation row with label, optional value display, and right chevron. */
export function NavSettingRow({ label, value, onClick, slots = {} }: Readonly<{ label: string; value?: string; onClick: () => void; slots?: Partial<NavSettingRowSlots> }>) {
  return (
    <button
      onClick={onClick}
      role="menuitem"
      className={cn("w-full flex items-center rounded-md hover:bg-hover-surface-soft3 transition-colors px-2 py-[7px]", slots.root)}
    >
      <span className={cn("flex-1 text-sm text-ink-strong truncate text-left", slots.label)}>{label}</span>
      <span className={cn("flex items-center text-ink-muted shrink-0 ml-2", slots.valueWrap)}>
        {value && <span className={cn("text-sm text-ink-muted truncate max-w-[120px]", slots.value)}>{value}</span>}
        <ChevronRightIcon className={cn("w-[14px] h-[14px] ml-1.5", slots.chevron)} />
      </span>
    </button>
  );
}

export type MenuRowSlots = {
  root?: string;
  icon?: string;
  label?: string;
};

export interface MenuRowProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  className?: string;
  /** Render the label in red (destructive action) */
  danger?: boolean;
  slots?: Partial<MenuRowSlots>;
}

/** Clickable menu row with icon and label, optionally styled as destructive. */
export function MenuRow({ icon, label, onClick, className = '', danger = false, slots = {} }: Readonly<MenuRowProps>) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-[6px] text-sm rounded-md transition-colors',
        danger ? 'text-danger-text hover:bg-hover-danger' : 'text-ink-body hover:bg-hover-surface-soft2',
        className, slots.root,
      )}
    >
      <span className={cn('flex items-center justify-center shrink-0', danger ? 'text-danger-text-soft' : 'text-ink-muted', slots.icon)}>
        {icon}
      </span>
      <span className={cn('truncate', slots.label)}>{label}</span>
    </button>
  );
}

export type SettingsRowSlots = {
  root?: string;
  inner?: string;
  icon?: string;
  label?: string;
  valueWrap?: string;
  value?: string;
  chevron?: string;
};

export interface SettingsRowProps {
  icon: React.ReactNode;
  label: string;
  /** Value displayed on the right (e.g. "Table", "4") */
  value?: string;
  /** Whether to show the right-side chevron. Default: true when onClick provided */
  showChevron?: boolean;
  onClick?: () => void;
  slots?: Partial<SettingsRowSlots>;
}

/** Settings-panel row with icon, label, optional value, and navigation chevron. */
export function SettingsRow({ icon, label, value, showChevron, onClick, slots = {} }: Readonly<SettingsRowProps>) {
  const hasChevron = showChevron ?? !!onClick;
  return (
    <button
      onClick={onClick}
      role="menuitem"
      className={cn('w-full flex rounded-md transition-colors text-ink-strong hover:bg-hover-surface-soft3', slots.root)}
      style={{ fill: 'currentColor' }}
    >
      <div className={cn('flex items-center gap-0 w-full px-2 py-[6px]', slots.inner)}>
        {/* Left icon */}
        <span className={cn('flex items-center justify-center shrink-0 w-5 h-5 text-ink-secondary', slots.icon)}>
          {icon}
        </span>
        {/* Label */}
        <span className={cn('flex-1 text-sm leading-5 text-left ml-2 truncate', slots.label)}>{label}</span>
        {/* Right side: value + chevron */}
        {(value || hasChevron) && (
          <span className={cn('flex items-center text-ink-muted shrink-0 ml-2', slots.valueWrap)}>
            {value && (
              <span className={cn('text-sm leading-5 truncate max-w-[120px]', slots.value)}>{value}</span>
            )}
            {hasChevron && (
              <ChevronRightIcon className={cn('w-[14px] h-[14px] ml-1.5', slots.chevron)} />
            )}
          </span>
        )}
      </div>
    </button>
  );
}

export { SettingsHeader, SettingsSectionLabel, MenuDivider, ViewTypeCard, PanelSectionLabel } from './SettingsPrimitives';
export type { SettingsHeaderProps, ViewTypeCardProps } from './SettingsPrimitives';
