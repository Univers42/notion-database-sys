// ─── useDbRecords — hook for fetching records from the active source ─────────
// Currently delegates to the Zustand store (hardcoded data).
// When a backend API is added, this hook will fetch from the active adapter.

import { useMemo } from 'react';
import { useDatabaseStore } from '../store/useDatabaseStore';
import { useDbSource } from './useDbSource.ts';
import type { DbSourceType } from '../services/dbms/types.ts';

interface UseDbRecordsResult {
  /** The active database source. */
  source: DbSourceType;
  /** All pages from the store (currently hardcoded). */
  pages: ReturnType<typeof useDatabaseStore.getState>['pages'];
  /** All databases from the store. */
  databases: ReturnType<typeof useDatabaseStore.getState>['databases'];
  /** All views from the store. */
  views: ReturnType<typeof useDatabaseStore.getState>['views'];
  /** Whether data is loading (for future async sources). */
  loading: boolean;
  /** Last error message if any. */
  error: string | null;
}

/**
 * Provides records from the active database source.
 * Currently returns data directly from the Zustand store.
 * When the backend API is implemented, this will switch based
 * on the active source to fetch from JSON, CSV, MongoDB, or PostgreSQL.
 */
export function useDbRecords(): UseDbRecordsResult {
  const source = useDbSource((s) => s.activeSource);
  const switching = useDbSource((s) => s.switching);
  const lastError = useDbSource((s) => s.lastError);
  const pages = useDatabaseStore((s) => s.pages);
  const databases = useDatabaseStore((s) => s.databases);
  const views = useDatabaseStore((s) => s.views);

  return useMemo(() => ({
    source,
    pages,
    databases,
    views,
    loading: switching,
    error: lastError,
  }), [source, pages, databases, views, switching, lastError]);
}
