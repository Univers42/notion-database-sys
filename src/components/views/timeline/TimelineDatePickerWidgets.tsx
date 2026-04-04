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
import { ToggleSwitch as CanonicalToggle } from '../../ui/ToggleSwitch';
import { cn } from '../../../utils/cn';


/** Horizontal divider between sections */
export function Divider() {
  return <div className={cn("h-px bg-line mx-0")} />;
}

/** Toggle switch matching Notion's 14×26 switch — now uses canonical ToggleSwitch */
export function TimelineToggleSwitch({ enabled }: Readonly<{ enabled: boolean }>) {
  return <CanonicalToggle checked={enabled} onChange={() => {}} size="sm" />;
}

/** A settings row: label on left, controls on right */
export function OptionRow({
  label,
  onClick,
  children,
}: Readonly<{
  label: string;
  onClick?: () => void;
  children?: React.ReactNode;
}>) {
  return (
    <button
      type="button"
      onClick={onClick}
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
