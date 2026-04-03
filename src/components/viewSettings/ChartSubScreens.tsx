/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ChartSubScreens.tsx                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:38:58 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 11:45:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { CHART_TYPE_META } from './constants';
import { SubPanelHeader, OptionList, PropertyOptionList, Toggle } from './SubComponents';
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
  const eligible = allProps.filter(p => ['select', 'multi_select', 'status', 'checkbox', 'user', 'person', 'text', 'date'].includes(p.type));
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
        activeId={settings.xAxisSort || 'ascending'}
        onSelect={id => { updateSetting('xAxisSort', id); setScreen('editChart'); }}
      />
    </div>
  );
}

/** Renders the Y-axis property picker for chart configuration. */
export function YAxisWhatScreen({ setScreen, settings, updateSetting, allProps, onClose }: Readonly<ChartScreensProps>) {
  const eligible = allProps.filter(p => p.type === 'number');
  return (
    <div className={cn("flex flex-col h-full")}>
      <SubPanelHeader title="Y-Axis: What to show" onBack={() => setScreen('editChart')} onClose={onClose} />
      <PropertyOptionList properties={eligible} activeId={settings.yAxisProperty || ''} onSelect={id => { updateSetting('yAxisProperty', id); setScreen('editChart'); }} noneLabel="Count (all)" />
    </div>
  );
}

/** Renders the Y-axis group-by property picker. */
export function YAxisGroupByScreen({ setScreen, settings, updateSetting, groupableProps, onClose }: Readonly<ChartScreensProps>) {
  return (
    <div className={cn("flex flex-col h-full")}>
      <SubPanelHeader title="Y-Axis: Group by" onBack={() => setScreen('editChart')} onClose={onClose} />
      <PropertyOptionList properties={groupableProps} activeId={settings.yAxisGroupBy || ''} onSelect={id => { updateSetting('yAxisGroupBy', id); setScreen('editChart'); }} noneLabel="None" />
    </div>
  );
}

/** Renders the Y-axis range configuration (min/max values). */
export function YAxisRangeScreen({ setScreen, settings, updateSetting, onClose }: Readonly<ChartScreensProps>) {
  return (
    <div className={cn("flex flex-col h-full")}>
      <SubPanelHeader title="Y-Axis: Range" onBack={() => setScreen('editChart')} onClose={onClose} />
      <OptionList
        options={[{ id: 'auto', label: 'Auto' }, { id: '0-100', label: '0 – 100' }, { id: '0-1000', label: '0 – 1,000' }, { id: 'custom', label: 'Custom' }]}
        activeId={settings.yAxisRange || 'auto'}
        onSelect={id => { updateSetting('yAxisRange', id); setScreen('editChart'); }}
      />
    </div>
  );
}

/** Renders the Y-axis reference line configuration (value and label). */
export function YAxisReferenceLineScreen({ setScreen, settings, updateSetting, onClose }: Readonly<ChartScreensProps>) {
  return (
    <div className={cn("flex flex-col h-full")}>
      <SubPanelHeader title="Reference line" onBack={() => setScreen('editChart')} onClose={onClose} />
      <div className={cn("p-4 flex flex-col gap-3")}>
        <Toggle label="Show reference line" checked={!!settings.showReferenceLine} onChange={v => updateSetting('showReferenceLine', v)} />
        {settings.showReferenceLine && (
          <label className={cn("flex flex-col gap-1")}>
            <span className={cn("text-xs text-ink-secondary")}>Value</span>
            <input type="number" value={settings.referenceLineValue ?? ''}
              onChange={e => updateSetting('referenceLineValue', e.target.value ? Number(e.target.value) : null)}
              className={cn("px-3 py-2 border border-line rounded-lg text-sm bg-surface-primary focus:outline-none focus:ring-2 focus:ring-focus-ring-muted")} placeholder="e.g. 50" />
          </label>
        )}
      </div>
    </div>
  );
}

/** Renders the chart color palette picker. */
export function ColorPaletteScreen({ setScreen, settings, updateSetting, onClose }: Readonly<ChartScreensProps>) {
  return (
    <div className={cn("flex flex-col h-full")}>
      <SubPanelHeader title="Color palette" onBack={() => setScreen('editChart')} onClose={onClose} />
      <OptionList
        options={['default', 'blue', 'green', 'warm', 'cool', 'pastel', 'vivid'].map(p => ({ id: p, label: p.charAt(0).toUpperCase() + p.slice(1) }))}
        activeId={settings.colorPalette || 'default'}
        onSelect={id => { updateSetting('colorPalette', id); setScreen('editChart'); }}
      />
    </div>
  );
}

/** Renders additional chart style options (opacity, border radius, rounded lines, etc.). */
export function MoreStyleScreen({ setScreen, settings, updateSetting, onClose }: Readonly<ChartScreensProps>) {
  return (
    <div className={cn("flex flex-col h-full")}>
      <SubPanelHeader title="Style options" onBack={() => setScreen('editChart')} onClose={onClose} />
      <div className={cn("p-4 flex flex-col gap-3")}>
        <Toggle label="Show legend" checked={settings.showLegend !== false} onChange={v => updateSetting('showLegend', v)} />
        <Toggle label="Show grid lines" checked={settings.showGridLines !== false} onChange={v => updateSetting('showGridLines', v)} />
        <Toggle label="Show data labels" checked={!!settings.showDataLabels} onChange={v => updateSetting('showDataLabels', v)} />
        <Toggle label="Rounded bars" checked={settings.roundedBars !== false} onChange={v => updateSetting('roundedBars', v)} />
        <Toggle label="Smooth line" checked={!!settings.smoothLine} onChange={v => updateSetting('smoothLine', v)} />
      </div>
    </div>
  );
}
