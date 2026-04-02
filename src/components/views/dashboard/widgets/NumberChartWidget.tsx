/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   NumberChartWidget.tsx                              :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:37:42 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 18:07:36 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import type { DashboardWidget } from '../../../../types/database';
import { formatNumber } from '../constants';

export function renderNumberChart(widget: DashboardWidget, agg: { sum: number; count: number; min: number; max: number }) {
  return (
    <div className="p-5 h-full flex flex-col">
      <h3 className="text-sm font-semibold text-ink mb-3">{widget.title}</h3>
      <div className="grid grid-cols-4 gap-3 text-center flex-1 items-center">
        {[
          { label: 'Sum', val: agg.sum },
          { label: 'Average', val: Number((agg.sum / agg.count).toFixed(1)) },
          { label: 'Min', val: agg.min === Infinity ? 0 : agg.min },
          { label: 'Max', val: agg.max === -Infinity ? 0 : agg.max },
        ].map(s => (
          <div key={s.label} className="bg-surface-secondary rounded-lg p-3">
            <div className="text-xl font-bold text-ink tabular-nums">{formatNumber(s.val)}</div>
            <div className="text-[10px] text-ink-muted mt-1">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="text-[10px] text-ink-muted mt-2 text-center">{agg.count} records with values</div>
    </div>
  );
}
