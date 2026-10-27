/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   DashboardAutoDetect.tsx                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/10 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── DashboardAutoDetect — zero-config stats layout (legacy dashboard) ──────
// Extracted from DashboardView so the dual-mode dispatch stays small.

import React, { useMemo } from 'react';
import type { SchemaProperty } from '../../../types/database';
import { Hash, TrendingUp, Users, CheckCircle, Clock, BarChart3 } from 'lucide-react';
import { isThisWeek, parseISO } from 'date-fns';
import { StatCard, BarChartWidget, NumberSummaryWidget, RecentList } from '.';
import { aggregatePages, type ComputedData } from './dashboardAggregates';
import { cn } from '../../../utils/cn';

/** Memoized stats over the current pages (always call — rules of hooks). */
export function useComputedData(pages: { updatedAt: string; properties: Record<string, unknown> }[], database: { properties: Record<string, { id: string; type: string; name: string; options?: { id: string; value: string; color: string }[] }> } | null): ComputedData {
  const allProps = useMemo(() => database ? Object.values(database.properties) : [], [database]);
  return useMemo(() => {
    if (!database) return { numberAggs: {}, selectCounts: {}, checkboxCounts: {}, recentCount: 0 };

    const recentCount = pages.filter(p => {
      try { return isThisWeek(parseISO(p.updatedAt)); } catch { return false; }
    }).length;

    return { ...aggregatePages(pages, allProps), recentCount };
  }, [pages, database, allProps]);
}

/** Auto-detected stats dashboard: stat cards + main select chart + recents. */
export function AutoDetectDashboard({ pages, allProps, computedData, openPage, getPageTitle, responsive = false }: Readonly<{
  pages: { id: string; icon?: string; updatedAt: string; properties: Record<string, unknown> }[];
  allProps: { id: string; type: string; name: string; options?: { id: string; value: string; color: string }[] }[];
  computedData: ComputedData;
  openPage: (id: string) => void;
  getPageTitle: (page: { properties: Record<string, unknown> }) => string;
  /** "Responsive layout" view setting: columns follow the CONTAINER width —
   *  viewport breakpoints lie inside inline embeds and slim panes. */
  responsive?: boolean;
}>) {
  const checkboxProps = allProps.filter(p => p.type === 'checkbox');
  const doneCounts = checkboxProps[0] ? computedData.checkboxCounts[checkboxProps[0].id] : undefined;
  const numberProps = allProps.filter(p => p.type === 'number');
  const selectProps = allProps.filter(p => p.type === 'select' || p.type === 'status');
  const mainSelectProp = [...selectProps].sort((a, b) =>
    Object.keys(computedData.selectCounts[b.id] || {}).length - Object.keys(computedData.selectCounts[a.id] || {}).length
  )[0];
  const mainSelectData = mainSelectProp && computedData.selectCounts[mainSelectProp.id]
    ? Object.values(computedData.selectCounts[mainSelectProp.id]).sort((a, b) => b.count - a.count) : [];
  const recentPages = [...pages].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 8);

  return (
    <div className={cn("flex-1 overflow-auto p-6 bg-surface-secondary")}>
      <div className={cn("max-w-6xl mx-auto flex flex-col gap-6")}>
        <div className={cn(responsive
          ? "grid grid-cols-1 @xl:grid-cols-2 @4xl:grid-cols-4 gap-4"
          : "grid grid-cols-2 md:grid-cols-4 gap-4")}>
          <StatCard icon={<Hash className={cn("w-5 h-5")} />} label="Total Records" value={pages.length} color="blue" />
          <StatCard icon={<Clock className={cn("w-5 h-5")} />} label="Updated This Week" value={computedData.recentCount} color="purple" />
          {doneCounts ? (
            <StatCard icon={<CheckCircle className={cn("w-5 h-5")} />} label={checkboxProps[0].name} value={doneCounts.checked}
              subtext={`${pages.length > 0 ? Math.round((doneCounts.checked / pages.length) * 100) : 0}% of ${pages.length}`}
              color="green" />
          ) : (
            <StatCard icon={<Users className={cn("w-5 h-5")} />} label="Properties" value={allProps.length} color="green" />
          )}
          {numberProps[0] && computedData.numberAggs[numberProps[0].id] ? (
            <StatCard icon={<TrendingUp className={cn("w-5 h-5")} />} label={`Total ${numberProps[0].name}`}
              value={computedData.numberAggs[numberProps[0].id].sum} color="amber" />
          ) : (
            <StatCard icon={<BarChart3 className={cn("w-5 h-5")} />} label="Categories" value={mainSelectData.length} color="amber" />
          )}
        </div>

        <div className={cn(responsive
          ? "grid grid-cols-1 @4xl:grid-cols-3 gap-6"
          : "grid grid-cols-1 lg:grid-cols-3 gap-6")}>
          {mainSelectProp && mainSelectData.length > 0 && (
            <div className={cn("bg-surface-primary rounded-xl border border-line p-5")}>
              <h3 className={cn("text-sm font-semibold text-ink mb-4")}>By {mainSelectProp.name}</h3>
              <BarChartWidget data={mainSelectData} total={pages.length} />
            </div>
          )}
          {numberProps.length > 0 && (
            <div className={cn("bg-surface-primary rounded-xl border border-line p-5")}>
              <h3 className={cn("text-sm font-semibold text-ink mb-4")}>Number Summary</h3>
              <NumberSummaryWidget numberProps={numberProps as SchemaProperty[]} numberAggs={computedData.numberAggs} />
            </div>
          )}
          <div className={cn(`bg-surface-primary rounded-xl border border-line p-5 ${!mainSelectData.length && !numberProps.length ? (responsive ? '@4xl:col-span-3' : 'lg:col-span-3') : ''}`)}>
            <h3 className={cn("text-sm font-semibold text-ink mb-4")}>Recent Activity</h3>
            <RecentList pages={recentPages} openPage={openPage} getPageTitle={getPageTitle} />
          </div>
        </div>
      </div>
    </div>
  );
}

export { autoDetectedWidgets } from '../dashboard/notion/model/autoDetectedWidgets';
