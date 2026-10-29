/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useDatabaseStore.ts                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:43:40 by dlesieur          #+#    #+#             */
/*   Updated: 2026/10/29 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { createContext, useContext } from 'react';
import { useStore } from 'zustand';
import { createStore, type StoreApi } from 'zustand/vanilla';
import { createDatabaseSlice } from './slices/databaseSlice';
import { createPageSlice } from './slices/pageSlice';
import { createViewSlice } from './slices/viewSlice';
import { createSelectionSlice } from './slices/selectionSlice';
import { createComputedSlice } from './slices/computedSlice';
import { writeHash } from '../hooks/useDbSource';
import { getInitialSource } from './dbmsStoreTypes';
import type { ExtendedDatabaseState } from './dbmsStoreTypes';
import { createDbmsActions } from './dbmsStoreActions';
import { changeRespectsLocks } from '../lib/lockGuards';
import type { StoreGet, StoreSet } from './dbms/hardcoded/storeTypes';

export type DatabaseStoreApi = StoreApi<ExtendedDatabaseState>;

/** The schema and view slices, and the DBMS actions that wrap them, write through
 *  this: a change that breaks a lock is dropped whole. Host loads go through
 *  setState and the DBMS loaders, so a host can still load or replace a locked view. */
function lockGuarded(set: StoreSet, get: StoreGet): StoreSet {
  return (partial) => {
    const state = get();
    const patch = typeof partial === 'function' ? partial(state) : partial;
    if (patch === state || changeRespectsLocks(state, patch)) set(patch);
  };
}

/** Creates a fresh database store instance with all domain and DBMS slices. */
export function createDatabaseStore(): DatabaseStoreApi {
  const store = createStore<ExtendedDatabaseState>()((set, get) => {
    const guarded = lockGuarded(set, get);
    return {
    databases: {},
    pages: {},
    views: {},
    activeViewId: null,
    openPageId: null,
    searchQuery: '',

    dbmsLoading: true,
    dbmsError: null,
    activeDbmsSource: getInitialSource(),

    ...createDatabaseSlice(guarded, get),
    ...createPageSlice(set, get),
    ...createViewSlice(guarded, get),
    ...createSelectionSlice(set),
    ...createComputedSlice(set, get),

    ...createDbmsActions(set, get, guarded),
    };
  });

  store.subscribe((state, prev) => {
    if (state.activeViewId !== prev.activeViewId || state.activeDbmsSource !== prev.activeDbmsSource) {
      writeHash(state.activeDbmsSource, state.activeViewId);
    }
  });

  return store;
}

const StoreContext = createContext<DatabaseStoreApi | null>(null);

export const DatabaseStoreProvider = StoreContext.Provider;

/** Returns the database store API for the current ObjectDatabase instance. */
export function useStoreApi(): DatabaseStoreApi {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error(
      'useStoreApi must be used within <ObjectDatabase>. '
      + 'See src/component/README.md for embedding instructions.',
    );
  }
  return store;
}

export function useDatabaseStore<T = ExtendedDatabaseState>(
  selector: (state: ExtendedDatabaseState) => T = (state) => state as T,
): T {
  const store = useStoreApi();
  return useStore(store, selector);
}

export type { ExtendedDatabaseState } from './dbmsStoreTypes';

// Re-export the state type for consumers
export type { DatabaseState } from './dbms/hardcoded/storeTypes';
