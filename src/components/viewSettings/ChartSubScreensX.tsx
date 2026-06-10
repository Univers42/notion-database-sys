/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ChartSubScreensX.tsx                               :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/10 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── X-axis chart sub-screens: date bucket + per-group show/hide & order ────

import React, { useMemo } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { useDatabaseStore } from '../../store/dbms/hardcoded/useDatabaseStore';
import { useActiveViewId } from '../../hooks/useDatabaseScope';
import { SubPanelHeader, OptionList, Toggle } from './SubComponents';
import { useChartData } from '../views/chart/useChartData';
import type { ChartScreensProps } from './ChartSubScreens';
import { cn } from '../../utils/cn';

const BUCKETS = [
  { id: 'auto', label: 'Auto' }, { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' }, { id: 'month', label: 'Month' },
  { id: 'quarter', label: 'Quarter' }, { id: 'year', label: 'Year' },
];

/** Date bucket granularity picker (date X axes only). */
export function XAxisBucketScreen({ setScreen, settings, updateSetting, onClose }: Readonly<ChartScreensProps>) {
  return (
    <div className={cn("flex flex-col h-full")}>
      <SubPanelHeader title="X-Axis: Date grouping" onBack={() => setScreen('editChart')} onClose={onClose} />
      <OptionList options={BUCKETS} activeId={settings.xAxisDateBucket || 'auto'}
        onSelect={id => { updateSetting('xAxisDateBucket', id); setScreen('editChart'); }} />
    </div>
  );
}

/**
 * Per-group visibility + manual ordering. Groups are computed live through
 * the chart engine (with visibility filters disabled) so the list always
 * matches what the chart would show.
 */
export function XAxisGroupsScreen({ setScreen, settings, updateSetting, onClose }: Readonly<ChartScreensProps>) {
  const activeViewId = useActiveViewId();
  const { views, databases, getPagesForView } = useDatabaseStore();
  const view = activeViewId ? views[activeViewId] : null;
  const database = view ? databases[view.databaseId] : null;
  const pages = view ? getPagesForView(view.id) : [];

  const allVisibleSettings = useMemo(
    () => ({ ...settings, hiddenGroups: [] as string[] }),
    [settings],
  );
  const result = useChartData(database, pages, allVisibleSettings);

  const isBreakdown = !!settings.yAxisGroupBy;
  const items = isBreakdown
    ? result.series.map(s => ({ key: s.key, label: s.label }))
    : result.categories.map(c => ({ key: c.key, label: c.label }));
  const hidden = new Set(settings.hiddenGroups ?? []);

  const toggle = (key: string) => {
    const next = hidden.has(key)
      ? (settings.hiddenGroups ?? []).filter(k => k !== key)
      : [...(settings.hiddenGroups ?? []), key];
    updateSetting('hiddenGroups', next);
  };
  const move = (index: number, delta: number) => {
    const order = items.map(i => i.key);
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    [order[index], order[target]] = [order[target], order[index]];
    updateSetting('manualGroupOrder', order);
    if (settings.xAxisSort !== 'manual') updateSetting('xAxisSort', 'manual');
  };

  return (
    <div className={cn("flex flex-col h-full")}>
      <SubPanelHeader title={isBreakdown ? 'Visible subgroups' : 'Visible groups'}
        onBack={() => setScreen('editChart')} onClose={onClose} />
      <div className={cn("flex-1 overflow-auto p-2")}>
        {items.length === 0 && (
          <div className={cn("px-3 py-6 text-center text-xs text-ink-muted")}>No groups yet — add data or pick an X-axis property.</div>
        )}
        {items.map((item, i) => (
          <div key={item.key} className={cn("flex items-center gap-1 px-2 py-1 rounded-md hover:bg-hover-surface-soft2")}>
            {!isBreakdown && (
              <span className={cn("flex flex-col shrink-0")}>
                <button onClick={() => move(i, -1)} aria-label={`Move ${item.label} up`} disabled={i === 0}
                  className={cn("p-0.5 text-ink-muted hover:text-ink disabled:opacity-30")}><ChevronUp className={cn("w-3 h-3")} /></button>
                <button onClick={() => move(i, 1)} aria-label={`Move ${item.label} down`} disabled={i === items.length - 1}
                  className={cn("p-0.5 text-ink-muted hover:text-ink disabled:opacity-30")}><ChevronDown className={cn("w-3 h-3")} /></button>
              </span>
            )}
            <div className={cn("flex-1 min-w-0")}>
              <Toggle label={item.label} checked={!hidden.has(item.key)} onChange={() => toggle(item.key)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
