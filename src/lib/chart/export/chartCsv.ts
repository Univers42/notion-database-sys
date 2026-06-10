/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   chartCsv.ts                                        :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 12:00:00 by dlesieur          #+#    #+#             */
/*                                                +#+#+#+#+#+   +#+           */
/* ************************************************************************** */

/**
 * ChartResult → CSV ("Save chart as… CSV"). One row per category, one
 * column per series plus a total column; BOM-prefixed so Excel detects
 * UTF-8. Pure string-out — no DOM.
 */

import type { ChartResult } from '../chartTypes';
import { VALUE_SERIES_KEY } from '../chartTypes';

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n;]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** The CSV body (with BOM) for a chart's aggregated data. */
export function chartResultToCsv(result: ChartResult): string {
  const single = result.series.length === 1 && result.series[0].key === VALUE_SERIES_KEY;
  const header = single
    ? ['Category', 'Value']
    : ['Category', ...result.series.map((series) => series.label), 'Total'];
  const rows = result.categories.map((category) => {
    if (single) return [csvCell(category.label), csvCell(category.total)].join(',');
    return [
      csvCell(category.label),
      ...result.series.map((series) => csvCell(category.values[series.key] ?? 0)),
      csvCell(category.total),
    ].join(',');
  });
  return `﻿${[header.map(csvCell).join(','), ...rows].join('\n')}\n`;
}
