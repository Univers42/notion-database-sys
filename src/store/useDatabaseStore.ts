/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useDatabaseStore.ts                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:43:40 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 17:25:43 by dlesieur         ###   ########.fr       */
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

export type DatabaseStoreApi = StoreApi<ExtendedDatabaseState>;

/** Creates a fresh database store instance with all domain and DBMS slices. */
export function createDatabaseStore(): DatabaseStoreApi {
  const store = createStore<ExtendedDatabaseState>()((set, get) => ({
    databases: {},
    pages: {},
    views: {},
    activeViewId: null,
    openPageId: null,
    searchQuery: '',

    dbmsLoading: true,
    dbmsError: null,
    activeDbmsSource: getInitialSource(),

    ...createDatabaseSlice(set, get),
    ...createPageSlice(set, get),
    ...createViewSlice(set, get),
    ...createSelectionSlice(set),
    ...createComputedSlice(set, get),

    ...createDbmsActions(set, get),
  }));

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

export function useDatabaseStore(): ExtendedDatabaseState;
export function useDatabaseStore<T>(selector: (state: ExtendedDatabaseState) => T): T;
export function useDatabaseStore<T>(selector?: (state: ExtendedDatabaseState) => T): T | ExtendedDatabaseState {
  const store = useStoreApi();
  if (selector) return useStore(store, selector);
  return useStore(store, (state) => state);
}

export type { ExtendedDatabaseState } from './dbmsStoreTypes';

// Re-export the state type for consumers
export type { DatabaseState } from './dbms/hardcoded/storeTypes';
