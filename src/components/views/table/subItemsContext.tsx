/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   subItemsContext.tsx                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/26 07:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/26 08:10:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * Table sub-items context. The component owns the expanded set + the per-record
 * row cache (fetched from the host controller on first expand); the host owns
 * fetching/opening/creating. Null when no controller is provided — rows render
 * unchanged.
 */

import React from 'react';
import type { ObjectDatabaseSubItemRow, ObjectDatabaseSubItemsController } from '../../../component/types';

interface SubItemsContextValue {
  isExpanded: (recordId: string) => boolean;
  toggle: (recordId: string) => void;
  rowsFor: (recordId: string) => { rows: ObjectDatabaseSubItemRow[]; loading: boolean };
  open: (subItemId: string) => void;
  create: (recordId: string) => void;
}

const SubItemsContext = React.createContext<SubItemsContextValue | null>(null);

/** Read the sub-items context (null when no controller is provided). */
export function useSubItems(): SubItemsContextValue | null {
  return React.useContext(SubItemsContext);
}

/** Provides the sub-items context + owns the expanded set and per-record row cache. */
export function SubItemsProvider({
  controller,
  children,
}: Readonly<{ controller?: ObjectDatabaseSubItemsController; children: React.ReactNode }>): React.ReactElement {
  const [expanded, setExpanded] = React.useState<ReadonlySet<string>>(() => new Set());
  const rowsRef = React.useRef<Map<string, ObjectDatabaseSubItemRow[]>>(new Map());
  const loadingRef = React.useRef<Set<string>>(new Set());
  const [version, setVersion] = React.useState(0);
  const bump = React.useCallback(() => setVersion((v) => v + 1), []);

  const ensureLoaded = React.useCallback(async (recordId: string) => {
    if (!controller || rowsRef.current.has(recordId) || loadingRef.current.has(recordId)) return;
    loadingRef.current.add(recordId);
    bump();
    const rows = await controller.fetchRows(recordId).catch(() => []);
    rowsRef.current.set(recordId, rows);
    loadingRef.current.delete(recordId);
    bump();
  }, [controller, bump]);

  const create = React.useCallback(async (recordId: string) => {
    if (!controller) return;
    await controller.createRow(recordId).catch(() => undefined);
    const rows = await controller.fetchRows(recordId).catch(() => rowsRef.current.get(recordId) ?? []);
    rowsRef.current.set(recordId, rows);
    bump();
  }, [controller, bump]);

  const value = React.useMemo<SubItemsContextValue | null>(() => {
    if (!controller) return null;
    // `version` is read so the memo (and thus context consumers) recompute when
    // the ref-held row cache mutates; refs avoid re-fetch races.
    void version;
    return {
      isExpanded: (id) => expanded.has(id),
      toggle: (id) => setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else { next.add(id); void ensureLoaded(id); }
        return next;
      }),
      rowsFor: (id) => ({ rows: rowsRef.current.get(id) ?? [], loading: loadingRef.current.has(id) }),
      open: (subItemId) => controller.openRow(subItemId),
      create: (id) => { void create(id); },
    };
  }, [controller, expanded, version, ensureLoaded, create]);

  return <SubItemsContext.Provider value={value}>{children}</SubItemsContext.Provider>;
}
