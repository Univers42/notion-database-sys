/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useDashboardFilters.tsx                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/10 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── useDashboardFilters — dashboard-level "global filter" context ──────────
// Notion parity: simple property filters applied across every widget whose
// source database has a matching property (matched by NAME + TYPE, so they
// work across sources). Widgets read them through useViewPages.

import { createContext, useContext } from 'react';
import type { DashboardGlobalFilter } from '../types/database';

const DashboardFiltersContext = createContext<readonly DashboardGlobalFilter[]>([]);

/** Provider used by the dashboard renderer around its widgets. */
export const DashboardFiltersProvider = DashboardFiltersContext.Provider;

/** The active dashboard global filters ([] outside a dashboard). */
export function useDashboardFilters(): readonly DashboardGlobalFilter[] {
  return useContext(DashboardFiltersContext);
}
