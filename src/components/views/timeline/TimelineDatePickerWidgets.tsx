/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   TimelineDatePickerWidgets.tsx                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 23:14:06 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 23:14:06 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../../utils/cn';


/** Horizontal divider between sections */
export function Divider() {
  return <div className={cn("h-px bg-line mx-0")} />;
}

/**
 * PRESENTATIONAL toggle (Notion's 14×26 switch). Deliberately NOT interactive:
 * the whole OptionRow is the switch button (role="switch"), so a click anywhere
 * — including on this visual — toggles. A nested real control here used to
 * swallow the click (stopPropagation + no-op onChange) and left the switch dead.
 */
export function TimelineToggleSwitch({ enabled }: Readonly<{ enabled: boolean }>) {
  return (
    <span
      aria-hidden="true"
      className={cn('flex shrink-0 rounded-full p-[2px] transition-colors duration-200 pointer-events-none',
        enabled ? 'bg-accent' : 'bg-surface-strong')}
      style={{ width: 26, height: 14, boxSizing: 'content-box' }}
    >
      <span
        className={cn('rounded-full bg-white transition-transform duration-200')}
        style={{ width: 14, height: 14, transform: `translateX(${enabled ? 12 : 0}px)` }}
      />
    </span>
  );
}

/** A settings row: label on left, controls on right. With `role="switch"` the
 *  whole row is the toggle and reports its state via aria-checked. */
export function OptionRow({
  label,
  onClick,
  children,
  role,
  ariaChecked,
}: Readonly<{
  label: string;
  onClick?: () => void;
  children?: React.ReactNode;
  role?: 'switch';
  ariaChecked?: boolean;
}>) {
  return (
    <button
      type="button"
      onClick={onClick}
      role={role}
      aria-checked={role === 'switch' ? ariaChecked : undefined}
      aria-label={role === 'switch' ? label : undefined}
      className={cn(`w-full flex items-center justify-between px-3 py-[7px]
                 hover:bg-hover-surface transition-colors cursor-pointer text-left`)}
    >
      <span className={cn("text-[13px] text-ink-body leading-tight")}>{label}</span>
      {children && <div className={cn("flex items-center")}>{children}</div>}
    </button>
  );
}

/** Dropdown trigger value (text + chevron) */
export function DropdownValue({ label }: Readonly<{ label: string }>) {
  return (
    <div className={cn("flex items-center gap-0.5")}>
      <span className={cn("text-[12px] text-ink-secondary")}>{label}</span>
      <ChevronDown className={cn("w-3 h-3 text-ink-muted")} />
    </div>
  );
}

/** A small absolute dropdown menu for format/remind pickers */
export function DropdownMenu({
  items,
  selected,
  onSelect,
  onClose,
}: Readonly<{
  items: readonly string[] | string[];
  selected: string;
  onSelect: (v: string) => void;
  onClose: () => void;
}>) {
  return (
    <>
      <button
        type="button"
        className={cn("fixed inset-0 z-[10000] appearance-none border-0 bg-transparent cursor-default")}
        onClick={onClose}
        tabIndex={-1}
        aria-label="Close dropdown"
      />
      <div
        className={cn(`absolute right-2 top-full mt-1 z-[10001] bg-surface-primary border border-line
                   rounded-lg shadow-xl py-1 min-w-[140px] max-h-[200px] overflow-y-auto`)}
      >
        {items.map(item => (
          <button
            key={item}
            type="button"
            role="menuitem"
            onClick={() => onSelect(item)}
            className={cn(`w-full text-left px-3 py-1.5 text-xs transition-colors
                        ${
                          item === selected
                            ? 'bg-accent-soft text-accent-text font-medium'
                            : 'text-ink-body hover:bg-hover-surface'
                        }`)}
          >
            {item}
          </button>
        ))}
      </div>
    </>
  );
}
