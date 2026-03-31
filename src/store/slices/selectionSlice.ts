/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   selectionSlice.ts                                  :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:42:48 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 16:42:49 by dlesieur         ###   ########.fr       */
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Zustand set/get typing
type SetFn = (partial: any) => void;

export function createSelectionSlice(set: SetFn): SelectionSliceActions {
  return {
    setSearchQuery: (query) => set({ searchQuery: query }),
  };
}
