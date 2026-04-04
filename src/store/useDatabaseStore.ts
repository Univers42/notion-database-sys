/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useDatabaseStore.ts                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:43:40 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/05 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { create } from 'zustand';
import { createDatabaseSlice } from './slices/databaseSlice';
import { createPageSlice } from './slices/pageSlice';
import { createViewSlice } from './slices/viewSlice';
import { createSelectionSlice } from './slices/selectionSlice';
import { createComputedSlice } from './slices/computedSlice';
import { writeHash } from '../hooks/useDbSource';
import { getInitialSource } from './dbmsStoreTypes';
import type { ExtendedDatabaseState } from './dbmsStoreTypes';
import { createDbmsActions } from './dbmsStoreActions';

/** Zustand store composing domain slices with DBMS persistence. */
export const useDatabaseStore = create<ExtendedDatabaseState>((set, get) => ({
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

useDatabaseStore.subscribe(
  (state, prev) => {
    if (state.activeViewId !== prev.activeViewId || state.activeDbmsSource !== prev.activeDbmsSource) {
      writeHash(state.activeDbmsSource, state.activeViewId);
    }
  },
);

export type { ExtendedDatabaseState } from './dbmsStoreTypes';

// Re-export the state type for consumers
export type { DatabaseState } from './dbms/hardcoded/storeTypes';
