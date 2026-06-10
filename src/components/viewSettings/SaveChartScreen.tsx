/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   SaveChartScreen.tsx                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 12:00:00 by dlesieur          #+#    #+#             */
/*                                                +#+#+#+#+#+   +#+           */
/* ************************************************************************** */

/**
 * "Save chart as…" screen: PNG (2×), SVG (vector) and CSV (the aggregated
 * data) through the chart export registry — the exact chart instance the
 * user is looking at, whatever the render engine.
 */

import React from 'react';
import { exportChart, type ChartExportFormat } from '../views/chart/chartExportRegistry';
import { SubPanelHeader } from './SubComponents';
import type { ChartScreensProps } from './ChartSubScreens';
import { cn } from '../../utils/cn';

const FORMATS: { format: ChartExportFormat; label: string; hint: string }[] = [
  { format: 'png', label: 'PNG image', hint: 'Raster at 2× resolution, white background' },
  { format: 'svg', label: 'SVG vector', hint: 'Scales losslessly, editable in design tools' },
  { format: 'csv', label: 'CSV data', hint: 'The aggregated values behind the chart' },
];

/** Export format list; downloads via the per-view export handle. */
export function SaveChartScreen(props: Readonly<ChartScreensProps>) {
  const { setScreen, onClose, viewId, identityProps } = props;
  const [status, setStatus] = React.useState<string | null>(null);
  const baseName: string = identityProps?.viewName || 'chart';

  const save = (format: ChartExportFormat) => {
    setStatus(null);
    exportChart(viewId, format, baseName)
      .then((done) => setStatus(done ? `Saved ${baseName}.${format}` : 'Nothing to export yet — open the chart first.'))
      .catch(() => setStatus('Export failed.'));
  };

  return (
    <div className={cn('flex flex-col h-full')} style={{ minWidth: 290, maxWidth: 290 }}>
      <SubPanelHeader title="Save chart as…" onBack={() => setScreen('editChart')} onClose={onClose} />
      <div className={cn('flex-1 overflow-auto px-2 pb-2 flex flex-col gap-px')} style={{ minHeight: 0 }}>
        {FORMATS.map(({ format, label, hint }) => (
          <button key={format} onClick={() => save(format)}
            className={cn('w-full rounded-md px-2 py-2 text-left hover:bg-hover-surface-soft2')}>
            <span className={cn('block text-sm text-ink-body')}>{label}</span>
            <span className={cn('block text-xs text-ink-muted')}>{hint}</span>
          </button>
        ))}
        {status && <p className={cn('px-2 pt-2 text-xs text-ink-muted')}>{status}</p>}
      </div>
    </div>
  );
}
