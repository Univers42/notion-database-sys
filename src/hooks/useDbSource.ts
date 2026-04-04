/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useDbSource.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/03 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 22:31:02 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { create } from 'zustand';
import type { DbSourceType } from '../../services/dbms/types.ts';

const VALID_SOURCES = new Set<string>(['json', 'csv', 'mongodb', 'postgresql']);

/** Read the source from the URL hash (e.g. #source=postgresql&view=v-tasks-table). */
function readSourceFromHash(): DbSourceType {
  try {
    const params = new URLSearchParams(globalThis.location.hash.slice(1));
    const src = params.get('source');
    if (src && VALID_SOURCES.has(src)) return src as DbSourceType;
  } catch { /* ignore */ }
  return 'json';
}

/** Read the view ID from the URL hash. */
export function readViewFromHash(): string | null {
  try {
    const params = new URLSearchParams(globalThis.location.hash.slice(1));
    return params.get('view') || null;
  } catch { return null; }
}

/** Write source + view to the URL hash (replaceState — no history entry). */
export function writeHash(source: string, viewId?: string | null): void {
  const params = new URLSearchParams();
  params.set('source', source);
  if (viewId) params.set('view', viewId);
  const hash = `#${params.toString()}`;
  if (globalThis.location.hash !== hash) {
    history.replaceState(null, '', hash);
  }
}

/** All available source options with metadata. */
export const DB_SOURCE_OPTIONS: ReadonlyArray<{
  type: DbSourceType;
  label: string;
  icon: string;
  description: string;
}> = [
  { type: 'json', label: 'JSON', icon: '📄', description: 'Local JSON seed files' },
  { type: 'csv', label: 'CSV', icon: '📊', description: 'Local CSV seed files' },
  { type: 'mongodb', label: 'MongoDB', icon: '🍃', description: 'MongoDB 7.0 container' },
  { type: 'postgresql', label: 'PostgreSQL', icon: '🐘', description: 'PostgreSQL 16 container' },
] as const;

interface DbSourceState {
  /** The currently active database source type. */
  activeSource: DbSourceType;
  /** Whether a source switch is in progress. */
  switching: boolean;
  /** Last error from a failed source switch. */
  lastError: string | null;
  /** Change the active source. */
  setActiveSource: (source: DbSourceType) => void;
  /** Mark switching state. */
  setSwitching: (switching: boolean) => void;
  /** Set an error message. */
  setError: (error: string | null) => void;
}

export const useDbSource = create<DbSourceState>((set) => ({
  activeSource: readSourceFromHash(),
  switching: false,
  lastError: null,

  setActiveSource: (source: DbSourceType) => set({
    activeSource: source,
    lastError: null,
  }),

  setSwitching: (switching: boolean) => set({ switching }),

  setError: (error: string | null) => set({ lastError: error }),
}));
