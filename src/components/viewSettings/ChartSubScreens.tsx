/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ChartSubScreens.tsx                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:38:58 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/10 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── Chart sub-screens: type + X axis (Y, groups and style screens live in
//     ChartSubScreensY / ChartSubScreensX / ChartSubScreensStyle) ────────────

import React from 'react';
import { CHART_TYPE_META } from './constants';
import { SubPanelHeader, OptionList, PropertyOptionList } from './SubComponents';
import type { PanelScreen } from './constants';
import type { SchemaProperty, ViewSettings } from '../../types/database';
import { cn } from '../../utils/cn';

/** Shared props for all chart settings sub-screens. */
export interface ChartScreensProps {
  screen: PanelScreen;
  setScreen: (s: PanelScreen) => void;
  settings: ViewSettings;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateSetting: (key: string, val: any) => void;
  allProps: SchemaProperty[];
  groupableProps: SchemaProperty[];
  databaseName: string;
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  identityProps: any;
}

/** Property types eligible as a chart X axis (Notion parity). */
export const X_AXIS_ELIGIBLE_TYPES: readonly string[] = [
  'select', 'multi_select', 'status', 'checkbox', 'user', 'person',
  'relation', 'text', 'date', 'created_time', 'last_edited_time', 'due_date',
];

/** Renders the chart type selection grid (bar, line, donut, number). */
export function ChartTypeScreen({ setScreen, settings, updateSetting, onClose }: Readonly<ChartScreensProps>) {
  return (
    <div className={cn("flex flex-col h-full")}>
      <SubPanelHeader title="Chart type" onBack={() => setScreen('editChart')} onClose={onClose} />
      <div className={cn("p-4 grid grid-cols-2 gap-2")}>
        {CHART_TYPE_META.map(ct => {
          const isActive = (settings.chartType || 'vertical_bar') === ct.type;
          return (
            <button key={ct.type} onClick={() => { updateSetting('chartType', ct.type); setScreen('editChart'); }}
              className={cn(`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                isActive ? 'border-accent-border bg-accent-soft3 text-accent-text-light' : 'border-line hover:border-hover-border text-ink-secondary'
              }`)}>
              <span className={cn(isActive ? 'text-accent-text-soft' : 'text-ink-muted')}>{ct.icon}</span>
              <span className={cn("text-xs font-medium")}>{ct.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Renders the X-axis property picker for chart configuration. */
export function XAxisWhatScreen({ setScreen, settings, updateSetting, allProps, onClose }: Readonly<ChartScreensProps>) {
  const eligible = allProps.filter(p => X_AXIS_ELIGIBLE_TYPES.includes(p.type));
  return (
    <div className={cn("flex flex-col h-full")}>
      <SubPanelHeader title="X-Axis: What to show" onBack={() => setScreen('editChart')} onClose={onClose} />
      <PropertyOptionList properties={eligible} activeId={settings.xAxisProperty || ''} onSelect={id => { updateSetting('xAxisProperty', id); setScreen('editChart'); }} />
    </div>
  );
}

/** Renders the X-axis sort direction picker (ascending, descending, manual). */
export function XAxisSortScreen({ setScreen, settings, updateSetting, onClose }: Readonly<ChartScreensProps>) {
  return (
    <div className={cn("flex flex-col h-full")}>
      <SubPanelHeader title="X-Axis: Sort by" onBack={() => setScreen('editChart')} onClose={onClose} />
      <OptionList
        options={[{ id: 'ascending', label: 'Ascending' }, { id: 'descending', label: 'Descending' }, { id: 'manual', label: 'Manual' }]}
        activeId={settings.xAxisSort || 'manual'}
        onSelect={id => { updateSetting('xAxisSort', id); setScreen('editChart'); }}
      />
    </div>
  );
}
