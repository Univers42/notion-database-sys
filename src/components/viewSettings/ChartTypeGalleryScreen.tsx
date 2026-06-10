/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ChartTypeGalleryScreen.tsx                         :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 12:00:00 by dlesieur          #+#    #+#             */
/*                                                +#+#+#+#+#+   +#+           */
/* ************************************************************************** */

/**
 * "All chart types" gallery: the full 50+ preset registry grouped by family
 * and searchable. Presets whose needs aren't met yet (breakdown for heatmap
 * rows, a date x axis for calendars/rivers) stay visible but disabled with a
 * hint, so users discover what an extra setting unlocks.
 */

import React from 'react';
import {
  chartTypesByFamily, CHART_FAMILY_LABELS, type ChartTypeDef,
} from '../../lib/chart/chartTypeRegistry';
import { SubPanelHeader } from './SubComponents';
import type { ChartScreensProps } from './ChartSubScreens';
import { cn } from '../../utils/cn';

const DATE_X_TYPES = ['date', 'created_time', 'last_edited_time', 'due_date'];

function unmetNeed(def: ChartTypeDef, props: ChartScreensProps): string | null {
  const xProp = props.allProps.find((property) => property.id === props.settings.xAxisProperty);
  if (def.needs?.series && !props.settings.yAxisGroupBy) return 'Needs a Y-axis “Group by”';
  if (def.needs?.dateX && (!xProp || !DATE_X_TYPES.includes(xProp.type))) return 'Needs a date X axis';
  return null;
}

/** Searchable, family-grouped chart preset gallery. */
export function ChartTypeGalleryScreen(props: Readonly<ChartScreensProps>) {
  const { setScreen, settings, updateSetting, onClose } = props;
  const [query, setQuery] = React.useState('');
  const needle = query.trim().toLowerCase();
  const active = settings.chartType || 'vertical_bar';

  return (
    <div className={cn('flex flex-col h-full')} style={{ minWidth: 290, maxWidth: 290 }}>
      <SubPanelHeader title="All chart types" onBack={() => setScreen('editChart')} onClose={onClose} />
      <div className={cn('px-3 pb-2')}>
        <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)}
          placeholder="Search chart types…" aria-label="Search chart types"
          className={cn('w-full rounded-md border border-line bg-transparent px-2 py-1 text-sm outline-none focus:border-accent-border')} />
      </div>
      <div className={cn('flex-1 overflow-auto px-2 pb-3')} style={{ minHeight: 0 }}>
        {chartTypesByFamily().map(([family, defs]) => {
          const visible = defs.filter((def) => !needle || def.label.toLowerCase().includes(needle));
          if (visible.length === 0) return null;
          return (
            <div key={family} className={cn('pb-1')}>
              <div className={cn('px-2 pt-2 pb-1 text-xs font-medium text-ink-secondary select-none')}>
                {CHART_FAMILY_LABELS[family]}
              </div>
              <div className={cn('grid grid-cols-2 gap-1 px-1')}>
                {visible.map((def) => {
                  const hint = unmetNeed(def, props);
                  const isActive = def.id === active;
                  return (
                    <button key={def.id} disabled={Boolean(hint)} title={hint ?? def.label}
                      onClick={() => { updateSetting('chartType', def.id); setScreen('editChart'); }}
                      className={cn(`flex flex-col items-start gap-0.5 rounded-lg border px-2 py-1.5 text-left transition-all ${
                        isActive
                          ? 'border-accent-border bg-accent-soft3 text-accent-text-light'
                          : 'border-line hover:border-hover-border text-ink-body'
                      } disabled:opacity-45`)}>
                      <span className={cn('text-xs font-medium leading-4')}>{def.label}</span>
                      {hint && <span className={cn('text-[10px] text-ink-muted leading-3')}>{hint}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
