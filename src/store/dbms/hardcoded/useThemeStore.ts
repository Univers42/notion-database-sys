/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useThemeStore.ts                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:43:43 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 20:16:40 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { create } from 'zustand';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'ndb-theme';

/** Read the OS-level color preference */
function getSystemTheme(): ResolvedTheme {
  if (globalThis.window === undefined) return 'light';
  return globalThis.window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Read persisted preference from localStorage (defaults to 'system') */
function getStoredPreference(): ThemePreference {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  } catch { /* SSR / privacy */ }
  return 'system';
}

// <html data-theme> belongs to whoever hosts the database. Embedded in another
// app, this store keeps a preference and writes nothing: writing here flipped
// the host's light theme to the OS's dark one as soon as this module loaded.
// Only the standalone app (main.tsx) installs it as the owner.
let ownsDocumentTheme = false;

/** True in the standalone app, where this store drives <html data-theme>. */
export function ownsTheme(): boolean {
  return ownsDocumentTheme;
}

function applyTheme(resolved: ResolvedTheme): void {
  if (!ownsDocumentTheme || globalThis.document === undefined) return;
  const el = globalThis.document.documentElement;
  if (el.dataset.theme === resolved) return;
  el.dataset.theme = resolved;
}

interface ThemeState {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setTheme: (pref: ThemePreference) => void;
  cycleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => {
  const preference = getStoredPreference();
  const resolved = preference === 'system' ? getSystemTheme() : preference;

  return {
    preference,
    resolved,

    setTheme: (pref) => {
      const next = pref === 'system' ? getSystemTheme() : pref;
      try { globalThis.localStorage?.setItem(STORAGE_KEY, pref); } catch { /* SSR / privacy */ }
      applyTheme(next);
      set({ preference: pref, resolved: next });
    },

    cycleTheme: () => {
      const order: ThemePreference[] = ['light', 'dark', 'system'];
      const idx = order.indexOf(get().preference);
      const next = order[(idx + 1) % order.length];
      get().setTheme(next);
    },
  };
});

/** Makes this store the owner of <html data-theme>: applies the stored
 *  preference now and follows the OS while the preference is "system". */
export function installStandaloneTheme(): void {
  if (ownsDocumentTheme || globalThis.window === undefined) return;
  ownsDocumentTheme = true;
  applyTheme(useThemeStore.getState().resolved);
  globalThis.window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (useThemeStore.getState().preference !== 'system') return;
    const resolved = getSystemTheme();
    applyTheme(resolved);
    useThemeStore.setState({ resolved });
  });
}
