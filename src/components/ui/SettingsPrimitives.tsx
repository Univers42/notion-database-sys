/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   SettingsPrimitives.tsx                              :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:37:19 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 11:45:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { CloseIcon } from './Icons';
import { cn } from '../../utils/cn';

export type SettingsHeaderSlots = {
  root?: string;
  backButton?: string;
  title?: string;
  closeButton?: string;
};

export interface SettingsHeaderProps {
  title: string;
  onClose?: () => void;
  onBack?: () => void;
  slots?: Partial<SettingsHeaderSlots>;
}

/** Panel header with title, optional back arrow, and close button. */
export function SettingsHeader({ title, onClose, onBack, slots = {} }: Readonly<SettingsHeaderProps>) {
  return (
    <div className={cn('flex items-center shrink-0', slots.root)} style={{ paddingTop: 14, paddingBottom: 6, paddingInline: 16, height: 42 }}>
      {onBack && (
        <button
          onClick={onBack}
          className={cn('p-1 -ml-1 mr-1 rounded-full text-ink-muted hover:text-hover-text hover:bg-hover-surface2 transition-colors', slots.backButton)}
        >
          <svg viewBox="0 0 16 16" className={cn("w-4 h-4")} fill="currentColor" aria-hidden="true">
            <path d="M9.278 12.762a.625.625 0 1 0 .884-.884L6.284 8l3.878-3.878a.625.625 0 0 0-.884-.884l-4.32 4.32a.625.625 0 0 0 0 .884z" />
          </svg>
        </button>
      )}
      <span className={cn('text-xs font-medium leading-4 text-ink-secondary flex-1', slots.title)}>{title}</span>
      {onClose && (
        <button
          onClick={onClose}
          className={cn('p-1 rounded-full text-ink-muted hover:text-hover-text bg-surface-tertiary-soft3 hover:bg-hover-surface3 transition-colors', slots.closeButton)}
        >
          <CloseIcon className={cn("w-3.5 h-3.5")} />
        </button>
      )}
    </div>
  );
}

/** Muted section label with top divider for settings panels. */
export function SettingsSectionLabel({ children, className }: Readonly<{ children: React.ReactNode; className?: string }>) {
  return (
    <div className={cn('relative pt-[6px] mt-1', className)}>
      <div className={cn("absolute top-0 left-4 right-4 h-px bg-surface-muted-soft2")} />
      <div className={cn("flex px-2 mt-1.5 mb-2 text-xs font-medium leading-[1.2] text-ink-secondary select-none pt-1")}>
        <span className={cn("truncate")}>{children}</span>
      </div>
    </div>
  );
}

/** Thin horizontal separator for menu sections. */
export function MenuDivider({ className }: Readonly<{ className?: string }>) {
  return (
    <div className={cn('relative my-[3px] mx-3', className)}>
      <div className={cn("h-px bg-surface-muted-soft")} />
    </div>
  );
}

export type ViewTypeCardSlots = {
  root?: string;
  icon?: string;
  label?: string;
};

export interface ViewTypeCardProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  slots?: Partial<ViewTypeCardSlots>;
}

/** Selectable card for view type grids (e.g. layout-switcher). */
export function ViewTypeCard({ icon, label, active = false, onClick, slots = {} }: Readonly<ViewTypeCardProps>) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center gap-1 rounded-lg overflow-hidden transition-all w-[92px] h-[62px]',
        active
          ? 'bg-accent-soft border-2 border-accent-border text-accent-text-light'
          : 'bg-transparent border border-transparent hover:bg-hover-surface-soft3 text-ink-body-light',
        slots.root,
      )}
    >
      <span className={cn(active ? 'text-accent-text-soft' : 'text-current', slots.icon)}>{icon}</span>
      <span className={cn('text-sm leading-5 font-normal text-center px-1 truncate w-full', slots.label)}>{label}</span>
    </button>
  );
}

/** Small muted section header label for panels. */
export function PanelSectionLabel({ children, className }: Readonly<{ children: React.ReactNode; className?: string }>) {
  return (
    <div className={cn('flex items-center px-2 mt-1.5 mb-2 text-xs font-medium leading-[1.2] text-ink-muted select-none', className)}>
      <span className={cn("truncate")}>{children}</span>
    </div>
  );
}
