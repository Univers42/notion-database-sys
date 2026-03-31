/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   SettingsPrimitives.tsx                              :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:37:19 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 16:37:20 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { CloseIcon } from './Icons';

// ═══════════════════════════════════════════════════════════════════════════════
// Settings-panel primitives extracted from MenuPrimitives
// ═══════════════════════════════════════════════════════════════════════════════

/* ─── SettingsHeader ──────────────────────────────────────────────────────
   Panel header with title + optional back arrow + close (X) button.
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
          className="p-1 -ml-1 mr-1 rounded-full text-ink-muted hover:text-hover-text hover:bg-hover-surface2 transition-colors"
        >
          <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor" aria-hidden="true">
            <path d="M9.278 12.762a.625.625 0 1 0 .884-.884L6.284 8l3.878-3.878a.625.625 0 0 0-.884-.884l-4.32 4.32a.625.625 0 0 0 0 .884z" />
          </svg>
        </button>
      )}
      <span className="text-xs font-medium leading-4 text-ink-secondary flex-1">{title}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="p-1 rounded-full text-ink-muted hover:text-hover-text bg-surface-tertiary-soft3 hover:bg-hover-surface3 transition-colors"
        >
          <CloseIcon className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

/* ─── SettingsSectionLabel ─────────────────────────────────────────────────
   Muted section label divider within settings panels.
   ─────────────────────────────────────────────────────────────────────── */

export function SettingsSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative pt-[6px] mt-1">
      <div className="absolute top-0 left-4 right-4 h-px bg-surface-muted-soft2" />
      <div className="flex px-2 mt-1.5 mb-2 text-xs font-medium leading-[1.2] text-ink-secondary select-none pt-1">
        <span className="truncate">{children}</span>
      </div>
    </div>
  );
}

/* ─── MenuDivider ─────────────────────────────────────────────────────────
   Thin separator used between menu sections.
   ─────────────────────────────────────────────────────────────────────── */

export function MenuDivider() {
  return (
    <div className="relative my-[3px] mx-3">
      <div className="h-px bg-surface-muted-soft" />
    </div>
  );
}

/* ─── ViewTypeCard ────────────────────────────────────────────────────────
   A card used in the "Add a new view" grid and the layout-switcher grid.
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
          ? 'bg-accent-soft border-2 border-accent-border text-accent-text-light'
          : 'bg-transparent border border-transparent hover:bg-hover-surface-soft3 text-ink-body-light'
        }`}
    >
      <span className={active ? 'text-accent-text-soft' : 'text-current'}>{icon}</span>
      <span className="text-sm leading-5 font-normal text-center px-1 truncate w-full">{label}</span>
    </button>
  );
}

/* ─── PanelSectionLabel ───────────────────────────────────────────────────
   Small muted section header label.
   ─────────────────────────────────────────────────────────────────────── */

export function PanelSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center px-2 mt-1.5 mb-2 text-xs font-medium leading-[1.2] text-ink-muted select-none">
      <span className="truncate">{children}</span>
    </div>
  );
}
