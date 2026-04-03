/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ThemeToggle.tsx                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:37:23 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/02 15:07:14 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { useThemeStore } from '../../store/dbms/hardcoded/useThemeStore';
import { cn } from '../../utils/cn';

// ═══════════════════════════════════════════════════════════════════════════════
// ThemeToggle — cycles through light / dark / system
// ═══════════════════════════════════════════════════════════════════════════════

const SunIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="8" r="3" />
    <line x1="8" y1="1" x2="8" y2="2.5" />
    <line x1="8" y1="13.5" x2="8" y2="15" />
    <line x1="1" y1="8" x2="2.5" y2="8" />
    <line x1="13.5" y1="8" x2="15" y2="8" />
    <line x1="3.05" y1="3.05" x2="4.11" y2="4.11" />
    <line x1="11.89" y1="11.89" x2="12.95" y2="12.95" />
    <line x1="3.05" y1="12.95" x2="4.11" y2="11.89" />
    <line x1="11.89" y1="4.11" x2="12.95" y2="3.05" />
  </svg>
);

const MoonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13.5 8.5a5.5 5.5 0 1 1-7-7 4.5 4.5 0 0 0 7 7z" />
  </svg>
);

const MonitorIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1.5" y="2" width="13" height="9" rx="1.5" />
    <line x1="5.5" y1="14" x2="10.5" y2="14" />
    <line x1="8" y1="11" x2="8" y2="14" />
  </svg>
);

const THEME_META: Record<string, { icon: React.ReactNode; label: string }> = {
  light:  { icon: <SunIcon />,     label: 'Light' },
  dark:   { icon: <MoonIcon />,    label: 'Dark' },
  system: { icon: <MonitorIcon />, label: 'System' },
};

export function ThemeToggle() {
  const preference = useThemeStore(s => s.preference);
  const cycleTheme = useThemeStore(s => s.cycleTheme);
  const meta = THEME_META[preference];

  return (
    <button
      onClick={cycleTheme}
      title={`Theme: ${meta.label} — click to cycle`}
      className={cn(`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-ink-secondary
                 hover:bg-hover-surface hover:text-ink transition-colors text-xs`)}
    >
      {meta.icon}
      <span className={cn("hidden sm:inline")}>{meta.label}</span>
    </button>
  );
}
