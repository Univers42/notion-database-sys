/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   viewSliceTypes.ts                                  :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/02 14:39:19 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/05 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { ViewConfig, ViewSettings, Filter, Sort, Grouping } from '../../types/database';

export interface ViewSliceState {
  views: Record<string, ViewConfig>;
}

export interface ViewSliceActions {
  addView: (view: Omit<ViewConfig, 'id'>) => void;
  updateView: (viewId: string, updates: Partial<ViewConfig>) => void;
  updateViewSettings: (viewId: string, settings: Partial<ViewSettings>) => void;
  deleteView: (viewId: string) => void;
  duplicateView: (viewId: string) => void;
  setActiveView: (viewId: string) => void;
  addFilter: (viewId: string, filter: Omit<Filter, 'id'>) => void;
  updateFilter: (viewId: string, filterId: string, updates: Partial<Filter>) => void;
  removeFilter: (viewId: string, filterId: string) => void;
  clearFilters: (viewId: string) => void;
  addSort: (viewId: string, sort: Omit<Sort, 'id'>) => void;
  setSort: (viewId: string, sort: Omit<Sort, 'id'>) => void;
  updateSort: (viewId: string, sortId: string, updates: Partial<Sort>) => void;
  removeSort: (viewId: string, sortId: string) => void;
  clearSorts: (viewId: string) => void;
  setGrouping: (viewId: string, grouping: Grouping | undefined) => void;
  togglePropertyVisibility: (viewId: string, propertyId: string) => void;
  hideAllProperties: (viewId: string) => void;
  reorderProperties: (viewId: string, propertyIds: string[]) => void;
}

export type ViewSlice = ViewSliceState & ViewSliceActions;
