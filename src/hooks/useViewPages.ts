/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useViewPages.ts                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/10 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── useViewPages — getPagesForView + dashboard global filters ──────────────
// Drop-in replacement for getPagesForView(view.id) inside view components.
// Outside a dashboard the context is empty and this is a pass-through.

import { useMemo } from 'react';
import { useDatabaseStore } from '../store/dbms/hardcoded/useDatabaseStore';
import { useDashboardFilters } from './useDashboardFilters';
import { useGroupSliceStore, sidebarGroupingActive } from './useViewGrouping';
import { evaluateFilter } from '../lib/filter/evaluateFilter';
import type { DashboardGlobalFilter, Page, SchemaProperty } from '../types/database';

/**
 * Applies dashboard global filters on top of a view's pages. Filters bind to
 * properties by NAME + TYPE (cross-source semantics); filters whose property
 * doesn't exist in this database are skipped — Notion behaviour. Select-ish
 * values are matched by option LABEL so one filter spans databases whose
 * option ids differ.
 */
export function applyGlobalFilters(
  pages: readonly Page[],
  filters: readonly DashboardGlobalFilter[],
  properties: Record<string, SchemaProperty>,
): Page[] {
  const props = Object.values(properties);
  const bound = filters
    .map(f => ({ f, prop: props.find(p => p.name === f.propertyName && p.type === f.propertyType) }))
    .filter((x): x is { f: DashboardGlobalFilter; prop: SchemaProperty } => !!x.prop)
    .map(({ f, prop }) => {
      const opt = prop.options?.find(o => o.value === f.value || o.id === f.value);
      return { prop, filter: { id: f.id, propertyId: prop.id, operator: f.operator, value: opt ? opt.id : f.value } };
    });
  if (bound.length === 0) return [...pages];
  return pages.filter(page => bound.every(({ prop, filter }) => evaluateFilter(page, filter, prop)));
}

/** Pages for a view with the surrounding dashboard's global filters applied,
 *  then the view's active group SLICE (GitHub-mode sidebar selection). */
export function useViewPages(viewId: string | null | undefined): Page[] {
  const extra = useDashboardFilters();
  // Data-only selectors: the bare-store subscription re-rendered every view,
  // widget, and stat tile on ANY store change (UI state included). Pages is
  // subscribed explicitly so counts/rows stay live on record edits.
  const views = useDatabaseStore(s => s.views);
  const databases = useDatabaseStore(s => s.databases);
  useDatabaseStore(s => s.pages);
  const getPagesForView = useDatabaseStore(s => s.getPagesForView);
  const getGroupedPages = useDatabaseStore(s => s.getGroupedPages);
  const slice = useGroupSliceStore(s => (viewId ? s.slices[viewId] ?? null : null));
  const pages = viewId ? getPagesForView(viewId) : [];
  return useMemo(() => {
    let out = pages as Page[];
    const view = viewId ? views[viewId] : null;
    // Slice first (group membership is computed on the UNfiltered set, so the
    // sidebar's counts and the slice stay consistent).
    if (view && slice && sidebarGroupingActive(view)) {
      const group = getGroupedPages(view.id).find(g => g.groupId === slice);
      if (group) out = group.pages;
    }
    if (!viewId || extra.length === 0) return out;
    const database = view ? databases[view.databaseId] : null;
    if (!database) return out;
    return applyGlobalFilters(out, extra, database.properties);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewId, pages, extra, views, databases, slice]);
}
