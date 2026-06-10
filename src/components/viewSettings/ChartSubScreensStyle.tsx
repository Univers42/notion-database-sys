/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ChartSubScreensStyle.tsx                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/10 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── Style chart sub-screens: palette + extended style options ──────────────

import React from 'react';
import { SubPanelHeader, OptionList, Toggle } from './SubComponents';
import type { ChartScreensProps } from './ChartSubScreens';
import { cn } from '../../utils/cn';

const HEIGHTS = [
  { id: 'small', label: 'S' }, { id: 'medium', label: 'M' },
  { id: 'large', label: 'L' }, { id: 'xl', label: 'XL' },
];

/** Renders the chart color palette picker (+ color-by-value toggle). */
export function ColorPaletteScreen({ setScreen, settings, updateSetting, onClose }: Readonly<ChartScreensProps>) {
  return (
    <div className={cn("flex flex-col h-full")}>
      <SubPanelHeader title="Color palette" onBack={() => setScreen('editChart')} onClose={onClose} />
      <OptionList
        options={['default', 'blue', 'green', 'warm', 'cool', 'pastel', 'vivid'].map(p => ({ id: p, label: p.charAt(0).toUpperCase() + p.slice(1) }))}
        activeId={settings.colorPalette || 'default'}
        onSelect={id => updateSetting('colorPalette', id)}
      />
      <div className={cn("px-4 pb-4")}>
        <Toggle label="Color by value" checked={!!settings.colorByValue}
          onChange={v => updateSetting('colorByValue', v)} />
        <p className={cn("text-[11px] text-ink-muted mt-1")}>Darker shades for higher values.</p>
      </div>
    </div>
  );
}

/** Extended style options: toggles, chart height, axis titles. */
export function MoreStyleScreen({ setScreen, settings, updateSetting, onClose }: Readonly<ChartScreensProps>) {
  const ct = settings.chartType || 'vertical_bar';
  const isLine = ct === 'line';
  const isDonut = ct === 'donut' || ct === 'pie';
  const isBar = ct === 'vertical_bar' || ct === 'horizontal_bar';

  return (
    <div className={cn("flex flex-col h-full")}>
      <SubPanelHeader title="Style options" onBack={() => setScreen('editChart')} onClose={onClose} />
      <div className={cn("flex-1 overflow-auto p-4 flex flex-col gap-3")}>
        <div>
          <span className={cn("text-xs font-medium text-ink-secondary")}>Chart height</span>
          <div className={cn("flex gap-1.5 mt-1.5")}>
            {HEIGHTS.map(h => (
              <button key={h.id} onClick={() => updateSetting('chartHeight', h.id)}
                className={cn(`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  (settings.chartHeight || 'medium') === h.id
                    ? 'border-accent-border bg-accent-soft3 text-accent-text-light'
                    : 'border-line text-ink-secondary hover:bg-hover-surface'
                }`)}>{h.label}</button>
            ))}
          </div>
        </div>
        <Toggle label="Show legend" checked={settings.showLegend !== false} onChange={v => updateSetting('showLegend', v)} />
        <Toggle label="Show grid lines" checked={settings.showGridLines !== false} onChange={v => updateSetting('showGridLines', v)} />
        <Toggle label="Show data labels" checked={!!settings.showDataLabels} onChange={v => updateSetting('showDataLabels', v)} />
        {isBar && <Toggle label="Rounded bars" checked={settings.roundedBars !== false} onChange={v => updateSetting('roundedBars', v)} />}
        {isLine && <Toggle label="Smooth line" checked={!!settings.smoothLine} onChange={v => updateSetting('smoothLine', v)} />}
        {isLine && <Toggle label="Gradient area fill" checked={!!settings.gradientFill} onChange={v => updateSetting('gradientFill', v)} />}
        {isDonut && <Toggle label="Show value in center" checked={settings.donutCenterValue !== false} onChange={v => updateSetting('donutCenterValue', v)} />}
        {!isDonut && (
          <div className={cn("flex flex-col gap-2 pt-1")}>
            {([['xAxisTitle', 'X-axis title'], ['yAxisTitle', 'Y-axis title']] as const).map(([key, label]) => (
              <label key={key} className={cn("flex flex-col gap-1")}>
                <span className={cn("text-xs text-ink-secondary")}>{label}</span>
                <input type="text" value={settings[key] ?? ''}
                  onChange={e => updateSetting(key, e.target.value || undefined)}
                  className={cn("px-3 py-2 border border-line rounded-lg text-sm bg-surface-primary focus:outline-none focus:ring-2 focus:ring-focus-ring-muted")}
                  placeholder="None" />
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
