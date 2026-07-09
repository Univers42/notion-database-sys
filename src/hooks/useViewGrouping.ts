/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useViewGrouping.ts                                  :+:      :+:    :+:  */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 14:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 14:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── View grouping — the two display modes every groupable view shares ──────
// 'stacked'  → Notion model: groups render in place as collapsible sections
//              (collapse persists per view in settings.collapsedGroupIds).
// 'sidebar'  → GitHub Projects "Slice by": a left panel lists the group
//              values; picking one filters the view to that slice (selection
//              is session-local, not persisted).
// Timeline and calendar cannot stack their temporal layout, so grouping on
// them always behaves as 'sidebar'.

import { create } from 'zustand';
import { useDatabaseStore } from '../store/dbms/hardcoded/useDatabaseStore';
import type { ViewConfig } from '../types/views';

/** Per-view "slice" selection (GitHub mode). null/absent → all groups. */
interface GroupSliceState {
  slices: Record<string, string | null>;
  setSlice: (viewId: string, groupId: string | null) => void;
}

export const useGroupSliceStore = create<GroupSliceState>(set => ({
  slices: {},
  setSlice: (viewId, groupId) =>
    set(s => ({ slices: { ...s.slices, [viewId]: groupId } })),
}));

/** View types that render the slice sidebar (board groups natively; table
 *  keeps its own in-table stacking). */
const SLICEABLE_TYPES = new Set(['gallery', 'list', 'feed', 'timeline', 'calendar']);

/** True when this view shows the GitHub-style slice panel. */
export function sidebarGroupingActive(view: ViewConfig | null | undefined): boolean {
  if (!view?.grouping || !SLICEABLE_TYPES.has(view.type)) return false;
  if (view.type === 'timeline' || view.type === 'calendar') return true;
  return view.settings?.groupLayout === 'sidebar';
}

/** True when this view renders Notion-style stacked sections itself. */
export function stackedGroupingActive(view: ViewConfig | null | undefined): boolean {
  return Boolean(view?.grouping) && !sidebarGroupingActive(view);
}

/** Stacked-mode helper: groups + persisted collapse state + toggle. */
export function useStackedGroups(viewId: string | null | undefined) {
  const views = useDatabaseStore(s => s.views);
  useDatabaseStore(s => s.pages); // re-render on record edits
  const getGroupedPages = useDatabaseStore(s => s.getGroupedPages);
  const updateViewSettings = useDatabaseStore(s => s.updateViewSettings);
  const view = viewId ? views[viewId] : null;

  const collapsedIds = view?.settings?.collapsedGroupIds ?? [];
  const collapsed = new Set(collapsedIds);
  const toggleCollapse = (groupId: string) => {
    if (!viewId) return;
    updateViewSettings(viewId, {
      collapsedGroupIds: collapsed.has(groupId)
        ? collapsedIds.filter(id => id !== groupId)
        : [...collapsedIds, groupId],
    });
  };

  const active = stackedGroupingActive(view);
  return {
    groups: active && viewId ? getGroupedPages(viewId) : null,
    collapsed,
    toggleCollapse,
  };
}
