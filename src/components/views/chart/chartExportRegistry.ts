/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   chartExportRegistry.ts                             :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 12:00:00 by dlesieur          #+#    #+#             */
/*                                                +#+#+#+#+#+   +#+           */
/* ************************************************************************** */

/**
 * Per-view export handles: ChartView registers its live ChartResult + chart
 * container so the "Save chart as…" settings screen can export the exact
 * chart the user is looking at without threading refs through the panel.
 * Works for BOTH engines — each renders an <svg> inside the container.
 */

import type { ChartResult } from '../../../lib/chart/chartTypes';
import { chartResultToCsv } from '../../../lib/chart/export/chartCsv';
import {
  svgNodeToString, rasterizeSvgString, downloadBlob,
} from '../../../lib/chart/export/chartImageExport';

export interface ChartExportHandle {
  getResult(): ChartResult;
  getContainer(): HTMLElement | null;
}

const handles = new Map<string, ChartExportHandle>();

export function registerChartExport(viewId: string, handle: ChartExportHandle): () => void {
  handles.set(viewId, handle);
  return () => {
    if (handles.get(viewId) === handle) handles.delete(viewId);
  };
}

export type ChartExportFormat = 'png' | 'svg' | 'csv';

/** Exports the chart currently rendered for `viewId`. Resolves false when
 *  there is nothing to export (no handle / no svg yet). */
export async function exportChart(viewId: string, format: ChartExportFormat, baseName: string): Promise<boolean> {
  const handle = handles.get(viewId);
  if (!handle) return false;
  const safeName = (baseName.trim() || 'chart').replaceAll(/[\\/:*?"<>|]/g, '-');
  if (format === 'csv') {
    downloadBlob(new Blob([chartResultToCsv(handle.getResult())], { type: 'text/csv;charset=utf-8' }), `${safeName}.csv`);
    return true;
  }
  const svg = handle.getContainer()?.querySelector('svg');
  if (!svg) return false;
  const markup = svgNodeToString(svg);
  if (format === 'svg') {
    downloadBlob(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }), `${safeName}.svg`);
    return true;
  }
  const rect = svg.getBoundingClientRect();
  const blob = await rasterizeSvgString(markup, rect.width || 800, rect.height || 400);
  downloadBlob(blob, `${safeName}.png`);
  return true;
}
