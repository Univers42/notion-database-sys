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

/** Pages for a view with the surrounding dashboard's global filters applied. */
export function useViewPages(viewId: string | null | undefined): Page[] {
  const extra = useDashboardFilters();
  const { views, databases, getPagesForView } = useDatabaseStore();
  const pages = viewId ? getPagesForView(viewId) : [];
  return useMemo(() => {
    if (!viewId || extra.length === 0) return pages as Page[];
    const view = views[viewId];
    const database = view ? databases[view.databaseId] : null;
    if (!database) return pages as Page[];
    return applyGlobalFilters(pages as Page[], extra, database.properties);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewId, pages, extra, views, databases]);
}
