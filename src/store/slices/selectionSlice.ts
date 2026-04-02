/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   selectionSlice.ts                                  :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:42:48 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/02 01:19:23 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── selectionSlice — active view, search, and UI state ─────────────────────

export interface SelectionSliceState {
  activeViewId: string | null;
  searchQuery: string;
}

export interface SelectionSliceActions {
  setSearchQuery: (query: string) => void;
}

export type SelectionSlice = SelectionSliceState & SelectionSliceActions;

import type { StoreSet } from '../storeTypes';

export function createSelectionSlice(set: StoreSet): SelectionSliceActions {
  return {
    setSearchQuery: (query) => set({ searchQuery: query }),
  };
}
