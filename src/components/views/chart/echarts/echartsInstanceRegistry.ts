/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   echartsInstanceRegistry.ts                         :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 12:00:00 by dlesieur          #+#    #+#             */
/*                                                +#+#+#+#+#+   +#+           */
/* ************************************************************************** */

/**
 * Live ECharts instances keyed by view id, so the export menu ("Save chart
 * as…") can call getDataURL on the exact instance the user is looking at
 * without threading refs through the settings panel. Duck-typed to avoid an
 * echarts import outside its lazy chunk.
 */

export interface ExportableChart {
  getDataURL(opts?: { type?: 'png' | 'jpeg' | 'svg'; pixelRatio?: number; backgroundColor?: string }): string;
  renderToSVGString?(): string;
}

const instances = new Map<string, ExportableChart>();

export function registerChartInstance(viewId: string, chart: ExportableChart): () => void {
  instances.set(viewId, chart);
  return () => {
    if (instances.get(viewId) === chart) instances.delete(viewId);
  };
}

export function getChartInstance(viewId: string): ExportableChart | null {
  return instances.get(viewId) ?? null;
}
