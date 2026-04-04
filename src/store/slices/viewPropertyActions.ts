/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   viewPropertyActions.ts                             :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/05 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/05 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { StoreSet, DatabaseState } from '../dbms/hardcoded/storeTypes';
import type { ViewSliceActions } from './viewSliceTypes';

type PropertyActions = Pick<ViewSliceActions, 'setGrouping' | 'togglePropertyVisibility' | 'hideAllProperties' | 'reorderProperties'>;

/**
 * Creates the grouping and property-visibility actions for the view slice.
 */
export function createPropertyActions(set: StoreSet): PropertyActions {
  return {
    setGrouping: (viewId, grouping) => set((state: DatabaseState) => ({
      views: { ...state.views, [viewId]: { ...state.views[viewId], grouping } },
    })),

    togglePropertyVisibility: (viewId, propertyId) => set((state: DatabaseState) => {
      const view = state.views[viewId];
      if (!view) return state;
      const isVisible = view.visibleProperties.includes(propertyId);
      return {
        views: {
          ...state.views,
          [viewId]: {
            ...view,
            visibleProperties: isVisible
              ? view.visibleProperties.filter((id: string) => id !== propertyId)
              : [...view.visibleProperties, propertyId],
          },
        },
      };
    }),

    hideAllProperties: (viewId) => set((state: DatabaseState) => {
      const view = state.views[viewId];
      if (!view) return state;
      const db = state.databases[view.databaseId];
      const titlePropId = db?.titlePropertyId;
      return {
        views: {
          ...state.views,
          [viewId]: { ...view, visibleProperties: titlePropId ? [titlePropId] : [] },
        },
      };
    }),

    reorderProperties: (viewId, propertyIds) => set((state: DatabaseState) => ({
      views: { ...state.views, [viewId]: { ...state.views[viewId], visibleProperties: propertyIds } },
    })),
  };
}
