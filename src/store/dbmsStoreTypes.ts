/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   dbmsStoreTypes.ts                                  :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/05 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/05 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { DatabaseState } from './dbms/hardcoded/storeTypes';

// Read initial source from URL hash
const VALID_SOURCES = new Set(['json', 'csv', 'mongodb', 'postgresql']);

export function getInitialSource(): string {
  try {
    const params = new URLSearchParams(globalThis.location.hash.slice(1));
    const src = params.get('source');
    if (src && VALID_SOURCES.has(src)) return src;
  } catch { /* SSR-safe */ }
  return 'json';
}

/** Extended state with DBMS loading capabilities. */
export interface DbmsExtras {
  /** Whether the store is currently loading data from DBMS. */
  dbmsLoading: boolean;
  /** Error from last DBMS load attempt. */
  dbmsError: string | null;
  /** Currently active DBMS source (json | csv | postgresql | mongodb). */
  activeDbmsSource: string;
  /** Load full state from the active DBMS source via API.
   *  Pass `silent: true` for live-reload (no loading spinner). */
  loadFromSource: (source?: string, opts?: { silent?: boolean }) => Promise<void>;
  /** Persist a page property change to the active DBMS source. */
  persistPageProperty: (pageId: string, propertyId: string, value: unknown) => void;
  /** Surgically patch specific page properties without replacing entire state.
   *  Used by the file-watcher WebSocket handler for zero-reload updates. */
  patchPages: (patches: Record<string, Record<string, unknown>>) => void;
}

export type ExtendedDatabaseState = DatabaseState & DbmsExtras;

/** Sources backed by a live database container. */
export const LIVE_DB_SOURCES = new Set(['postgresql', 'mongodb']);
