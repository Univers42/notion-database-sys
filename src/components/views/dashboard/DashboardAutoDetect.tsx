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
import type { ComputedData } from '.';
import { cn } from '../../../utils/cn';

type AggProperty = { id: string; type: string; name: string; options?: { id: string; value: string; color: string }[] };

/** Aggregate number, select, and checkbox stats from all pages. */
function aggregatePages(
  pages: { properties: Record<string, unknown> }[],
  allProps: AggProperty[],
): Omit<ComputedData, 'recentCount'> {
  let checked = 0, unchecked = 0;
  const numberAggs: ComputedData['numberAggs'] = {};
  const selectCounts: ComputedData['selectCounts'] = {};

  pages.forEach(page => {
    allProps.forEach(prop => {
      const val = page.properties[prop.id];
      if (prop.type === 'checkbox') { if (val) checked++; else unchecked++; }
      if (prop.type === 'number' && typeof val === 'number') {
        if (!numberAggs[prop.id]) numberAggs[prop.id] = { sum: 0, count: 0, min: Infinity, max: -Infinity };
        numberAggs[prop.id].sum += val;
        numberAggs[prop.id].count++;
        numberAggs[prop.id].min = Math.min(numberAggs[prop.id].min, val);
        numberAggs[prop.id].max = Math.max(numberAggs[prop.id].max, val);
      }
      if ((prop.type === 'select' || prop.type === 'status') && val) {
        if (!selectCounts[prop.id]) selectCounts[prop.id] = {};
        const opt = prop.options?.find(o => o.id === val);
        const label = opt?.value || (val as string);
        if (!selectCounts[prop.id][label]) selectCounts[prop.id][label] = { count: 0, color: opt?.color || '', label };
        selectCounts[prop.id][label].count++;
      }
    });
  });

  return { numberAggs, selectCounts, checked, unchecked };
}

/** Memoized stats over the current pages (always call — rules of hooks). */
export function useComputedData(pages: { updatedAt: string; properties: Record<string, unknown> }[], database: { properties: Record<string, { id: string; type: string; name: string; options?: { id: string; value: string; color: string }[] }> } | null): ComputedData {
  const allProps = useMemo(() => database ? Object.values(database.properties) : [], [database]);
  return useMemo(() => {
    if (!database) return { numberAggs: {}, selectCounts: {}, checked: 0, unchecked: 0, recentCount: 0 };

    const recentCount = pages.filter(p => {
      try { return isThisWeek(parseISO(p.updatedAt)); } catch { return false; }
    }).length;

    return { ...aggregatePages(pages, allProps), recentCount };
  }, [pages, database, allProps]);
}

/** Auto-detected stats dashboard: stat cards + main select chart + recents. */
export function AutoDetectDashboard({ pages, allProps, computedData, openPage, getPageTitle }: Readonly<{
  pages: { id: string; icon?: string; updatedAt: string; properties: Record<string, unknown> }[];
  allProps: { id: string; type: string; name: string; options?: { id: string; value: string; color: string }[] }[];
  computedData: ComputedData;
  openPage: (id: string) => void;
  getPageTitle: (page: { properties: Record<string, unknown> }) => string;
}>) {
  const checkboxProps = allProps.filter(p => p.type === 'checkbox');
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
        <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-4")}>
          <StatCard icon={<Hash className={cn("w-5 h-5")} />} label="Total Records" value={pages.length} color="blue" />
          <StatCard icon={<Clock className={cn("w-5 h-5")} />} label="Updated This Week" value={computedData.recentCount} color="purple" />
          {checkboxProps.length > 0 ? (
            <StatCard icon={<CheckCircle className={cn("w-5 h-5")} />} label="Completed" value={computedData.checked}
              subtext={`${pages.length > 0 ? Math.round((computedData.checked / Math.max(computedData.checked + computedData.unchecked, 1)) * 100) : 0}%`}
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

        <div className={cn("grid grid-cols-1 lg:grid-cols-3 gap-6")}>
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
          <div className={cn(`bg-surface-primary rounded-xl border border-line p-5 ${!mainSelectData.length && !numberProps.length ? 'lg:col-span-3' : ''}`)}>
            <h3 className={cn("text-sm font-semibold text-ink mb-4")}>Recent Activity</h3>
            <RecentList pages={recentPages} openPage={openPage} getPageTitle={getPageTitle} />
          </div>
        </div>
      </div>
    </div>
  );
}
