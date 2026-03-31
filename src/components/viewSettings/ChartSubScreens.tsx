/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ChartSubScreens.tsx                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:38:58 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 18:35:36 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ═══════════════════════════════════════════════════════════════════════════════
// Chart sub-screens — individual axis / style / palette pickers
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { CHART_TYPE_META } from './constants';
import { SubPanelHeader, OptionList, PropertyOptionList, Toggle } from './SubComponents';
import type { PanelScreen } from './constants';
import type { SchemaProperty } from '../../types/database';

export interface ChartScreensProps {
  screen: PanelScreen;
  setScreen: (s: PanelScreen) => void;
  settings: Record<string, any>;
  updateSetting: (key: string, val: any) => void;
  allProps: SchemaProperty[];
  groupableProps: SchemaProperty[];
  databaseName: string;
  onClose: () => void;
  identityProps: any;
}

export function ChartTypeScreen({ setScreen, settings, updateSetting, onClose }: ChartScreensProps) {
  return (
    <div className="flex flex-col h-full">
      <SubPanelHeader title="Chart type" onBack={() => setScreen('editChart')} onClose={onClose} />
      <div className="p-4 grid grid-cols-2 gap-2">
        {CHART_TYPE_META.map(ct => {
          const isActive = (settings.chartType || 'vertical_bar') === ct.type;
          return (
            <button key={ct.type} onClick={() => { updateSetting('chartType', ct.type); setScreen('editChart'); }}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                isActive ? 'border-accent-border bg-accent-soft3 text-accent-text-light' : 'border-line hover:border-hover-border text-ink-secondary'
              }`}>
              <span className={isActive ? 'text-accent-text-soft' : 'text-ink-muted'}>{ct.icon}</span>
              <span className="text-xs font-medium">{ct.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function XAxisWhatScreen({ setScreen, settings, updateSetting, allProps, onClose }: ChartScreensProps) {
  const eligible = allProps.filter(p => ['select', 'multi_select', 'status', 'checkbox', 'user', 'person', 'text', 'date'].includes(p.type));
  return (
    <div className="flex flex-col h-full">
      <SubPanelHeader title="X-Axis: What to show" onBack={() => setScreen('editChart')} onClose={onClose} />
      <PropertyOptionList properties={eligible} activeId={settings.xAxisProperty || ''} onSelect={id => { updateSetting('xAxisProperty', id); setScreen('editChart'); }} />
    </div>
  );
}

export function XAxisSortScreen({ setScreen, settings, updateSetting, onClose }: ChartScreensProps) {
  return (
    <div className="flex flex-col h-full">
      <SubPanelHeader title="X-Axis: Sort by" onBack={() => setScreen('editChart')} onClose={onClose} />
      <OptionList
        options={[{ id: 'ascending', label: 'Ascending' }, { id: 'descending', label: 'Descending' }, { id: 'manual', label: 'Manual' }]}
        activeId={settings.xAxisSort || 'ascending'}
        onSelect={id => { updateSetting('xAxisSort', id); setScreen('editChart'); }}
      />
    </div>
  );
}

export function YAxisWhatScreen({ setScreen, settings, updateSetting, allProps, onClose }: ChartScreensProps) {
  const eligible = allProps.filter(p => p.type === 'number');
  return (
    <div className="flex flex-col h-full">
      <SubPanelHeader title="Y-Axis: What to show" onBack={() => setScreen('editChart')} onClose={onClose} />
      <PropertyOptionList properties={eligible} activeId={settings.yAxisProperty || ''} onSelect={id => { updateSetting('yAxisProperty', id); setScreen('editChart'); }} noneLabel="Count (all)" />
    </div>
  );
}

export function YAxisGroupByScreen({ setScreen, settings, updateSetting, groupableProps, onClose }: ChartScreensProps) {
  return (
    <div className="flex flex-col h-full">
      <SubPanelHeader title="Y-Axis: Group by" onBack={() => setScreen('editChart')} onClose={onClose} />
      <PropertyOptionList properties={groupableProps} activeId={settings.yAxisGroupBy || ''} onSelect={id => { updateSetting('yAxisGroupBy', id); setScreen('editChart'); }} noneLabel="None" />
    </div>
  );
}

export function YAxisRangeScreen({ setScreen, settings, updateSetting, onClose }: ChartScreensProps) {
  return (
    <div className="flex flex-col h-full">
      <SubPanelHeader title="Y-Axis: Range" onBack={() => setScreen('editChart')} onClose={onClose} />
      <OptionList
        options={[{ id: 'auto', label: 'Auto' }, { id: '0-100', label: '0 – 100' }, { id: '0-1000', label: '0 – 1,000' }, { id: 'custom', label: 'Custom' }]}
        activeId={settings.yAxisRange || 'auto'}
        onSelect={id => { updateSetting('yAxisRange', id); setScreen('editChart'); }}
      />
    </div>
  );
}

export function YAxisReferenceLineScreen({ setScreen, settings, updateSetting, onClose }: ChartScreensProps) {
  return (
    <div className="flex flex-col h-full">
      <SubPanelHeader title="Reference line" onBack={() => setScreen('editChart')} onClose={onClose} />
      <div className="p-4 flex flex-col gap-3">
        <Toggle label="Show reference line" checked={!!settings.showReferenceLine} onChange={v => updateSetting('showReferenceLine', v)} />
        {settings.showReferenceLine && (
          <label className="flex flex-col gap-1">
            <span className="text-xs text-ink-secondary">Value</span>
            <input type="number" value={settings.referenceLineValue ?? ''}
              onChange={e => updateSetting('referenceLineValue', e.target.value ? Number(e.target.value) : null)}
              className="px-3 py-2 border border-line rounded-lg text-sm bg-surface-primary focus:outline-none focus:ring-2 focus:ring-focus-ring-muted" placeholder="e.g. 50" />
          </label>
        )}
      </div>
    </div>
  );
}

export function ColorPaletteScreen({ setScreen, settings, updateSetting, onClose }: ChartScreensProps) {
  return (
    <div className="flex flex-col h-full">
      <SubPanelHeader title="Color palette" onBack={() => setScreen('editChart')} onClose={onClose} />
      <OptionList
        options={['default', 'blue', 'green', 'warm', 'cool', 'pastel', 'vivid'].map(p => ({ id: p, label: p.charAt(0).toUpperCase() + p.slice(1) }))}
        activeId={settings.colorPalette || 'default'}
        onSelect={id => { updateSetting('colorPalette', id); setScreen('editChart'); }}
      />
    </div>
  );
}

export function MoreStyleScreen({ setScreen, settings, updateSetting, onClose }: ChartScreensProps) {
  return (
    <div className="flex flex-col h-full">
      <SubPanelHeader title="Style options" onBack={() => setScreen('editChart')} onClose={onClose} />
      <div className="p-4 flex flex-col gap-3">
        <Toggle label="Show legend" checked={settings.showLegend !== false} onChange={v => updateSetting('showLegend', v)} />
        <Toggle label="Show grid lines" checked={settings.showGridLines !== false} onChange={v => updateSetting('showGridLines', v)} />
        <Toggle label="Show data labels" checked={!!settings.showDataLabels} onChange={v => updateSetting('showDataLabels', v)} />
        <Toggle label="Rounded bars" checked={settings.roundedBars !== false} onChange={v => updateSetting('roundedBars', v)} />
        <Toggle label="Smooth line" checked={!!settings.smoothLine} onChange={v => updateSetting('smoothLine', v)} />
      </div>
    </div>
  );
}
