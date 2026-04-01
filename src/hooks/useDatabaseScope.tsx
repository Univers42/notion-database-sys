// ═══════════════════════════════════════════════════════════════════════════════
// DatabaseScope — React context for scoping database views
// ═══════════════════════════════════════════════════════════════════════════════
//
// Problem: All view components (TableView, BoardView, …) read `activeViewId`
// from the global Zustand store. When an inline database renders, it needs
// its own isolated view context without mutating global state.
//
// Solution: A React context that overrides `activeViewId` for a subtree.
// Views use `useActiveViewId()` instead of reading from the store directly.
// Full-page views continue to read global state (context is null by default).
// Inline databases wrap their content in `<DatabaseScope viewId={...}>`.
// ═══════════════════════════════════════════════════════════════════════════════

import { createContext, useContext } from 'react';
import { useDatabaseStore } from '../store/useDatabaseStore';

/**
 * When a `viewId` is provided, all children that call `useActiveViewId()`
 * will receive this override instead of the global `activeViewId`.
 */
const DatabaseScopeCtx = createContext<string | null>(null);

export const DatabaseScopeProvider = DatabaseScopeCtx.Provider;

/**
 * Returns the effective activeViewId — scoped override if inside a
 * `<DatabaseScopeProvider>`, otherwise the global store value.
 */
export function useActiveViewId(): string | null {
  const scopedViewId = useContext(DatabaseScopeCtx);
  const globalViewId = useDatabaseStore(s => s.activeViewId);
  return scopedViewId ?? globalViewId;
}
