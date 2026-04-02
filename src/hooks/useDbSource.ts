// ─── useDbSource — Zustand store for active DB source ────────────────────────
// Tracks which database source backend the app is using.

import { create } from 'zustand';
import type { DbSourceType } from '../services/dbms/types.ts';

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
  activeSource: 'json',
  switching: false,
  lastError: null,

  setActiveSource: (source: DbSourceType) => set({
    activeSource: source,
    lastError: null,
  }),

  setSwitching: (switching: boolean) => set({ switching }),

  setError: (error: string | null) => set({ lastError: error }),
}));
