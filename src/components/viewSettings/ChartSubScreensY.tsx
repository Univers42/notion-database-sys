/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ChartSubScreensY.tsx                               :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/10 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── Y-axis chart sub-screens: value+aggregation, group by, range, ref line ─

import React from 'react';
import { SubPanelHeader, OptionList, PropertyOptionList, Toggle } from './SubComponents';
import type { ChartScreensProps } from './ChartSubScreens';
import { cn } from '../../utils/cn';

const AGGREGATIONS = [
  { id: 'sum', label: 'Sum' }, { id: 'average', label: 'Average' },
  { id: 'median', label: 'Median' }, { id: 'min', label: 'Min' },
  { id: 'max', label: 'Max' },
];

/**
 * Y-axis "What to show": Count or a number property; picking a property
 * reveals the aggregation choices (Sum/Average/Median/Min/Max) and the
 * Cumulative toggle (Notion parity).
 */
export function YAxisWhatScreen({ setScreen, settings, updateSetting, allProps, onClose }: Readonly<ChartScreensProps>) {
  const eligible = allProps.filter(p => p.type === 'number');
  return (
    <div className={cn("flex flex-col h-full")}>
      <SubPanelHeader title="Y-Axis: What to show" onBack={() => setScreen('editChart')} onClose={onClose} />
      <div className={cn("flex-1 overflow-auto")}>
        <PropertyOptionList properties={eligible} activeId={settings.yAxisProperty || ''}
          onSelect={id => updateSetting('yAxisProperty', id || undefined)} noneLabel="Count (all)" />
        {settings.yAxisProperty && (
          <>
            <div className={cn("px-4 pt-1 text-xs font-medium text-ink-secondary")}>Aggregation</div>
            <OptionList options={AGGREGATIONS} activeId={settings.yAxisAggregation || 'sum'}
              onSelect={id => updateSetting('yAxisAggregation', id)} />
          </>
        )}
        <div className={cn("px-4 pb-4")}>
          <Toggle label="Cumulative" checked={!!settings.yAxisCumulative}
            onChange={v => updateSetting('yAxisCumulative', v)} />
          <p className={cn("text-[11px] text-ink-muted mt-1")}>
            Shows running totals across the X axis (best with ascending sort).
          </p>
        </div>
      </div>
    </div>
  );
}

/** Renders the Y-axis group-by (breakdown) property picker. */
export function YAxisGroupByScreen({ setScreen, settings, updateSetting, groupableProps, onClose }: Readonly<ChartScreensProps>) {
  return (
    <div className={cn("flex flex-col h-full")}>
      <SubPanelHeader title="Y-Axis: Group by" onBack={() => setScreen('editChart')} onClose={onClose} />
      <PropertyOptionList properties={groupableProps} activeId={settings.yAxisGroupBy || ''}
        onSelect={id => { updateSetting('yAxisGroupBy', id || undefined); setScreen('editChart'); }} noneLabel="None" />
    </div>
  );
}

/** Y-axis range: presets plus custom min/max bounds. */
export function YAxisRangeScreen({ setScreen, settings, updateSetting, onClose }: Readonly<ChartScreensProps>) {
  return (
    <div className={cn("flex flex-col h-full")}>
      <SubPanelHeader title="Y-Axis: Range" onBack={() => setScreen('editChart')} onClose={onClose} />
      <OptionList
        options={[{ id: 'auto', label: 'Auto' }, { id: '0-100', label: '0 – 100' }, { id: '0-1000', label: '0 – 1,000' }, { id: 'custom', label: 'Custom' }]}
        activeId={settings.yAxisRange || 'auto'}
        onSelect={id => updateSetting('yAxisRange', id)}
      />
      {settings.yAxisRange === 'custom' && (
        <div className={cn("px-4 pb-4 flex gap-2")}>
          {(['yAxisRangeMin', 'yAxisRangeMax'] as const).map((key, i) => (
            <label key={key} className={cn("flex-1 flex flex-col gap-1")}>
              <span className={cn("text-xs text-ink-secondary")}>{i === 0 ? 'Min' : 'Max'}</span>
              <input type="number" value={settings[key] ?? ''}
                onChange={e => updateSetting(key, e.target.value === '' ? undefined : Number(e.target.value))}
                className={cn("px-3 py-2 border border-line rounded-lg text-sm bg-surface-primary focus:outline-none focus:ring-2 focus:ring-focus-ring-muted")}
                placeholder={i === 0 ? '0' : 'auto'} />
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

/** Renders the Y-axis reference line configuration (value and visibility). */
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
