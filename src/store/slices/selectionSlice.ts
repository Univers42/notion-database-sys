/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   selectionSlice.ts                                  :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:42:48 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 13:43:26 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

export interface SelectionSliceState {
  activeViewId: string | null;
  searchQuery: string;
}

export interface SelectionSliceActions {
  setSearchQuery: (query: string) => void;
}

export type SelectionSlice = SelectionSliceState & SelectionSliceActions;

import type { StoreSet } from '../dbms/hardcoded/storeTypes';

/** Creates the selection/search slice. Sets `searchQuery` state. */
export function createSelectionSlice(set: StoreSet): SelectionSliceActions {
  return {
    setSearchQuery: (query) => set({ searchQuery: query }),
  };
}
