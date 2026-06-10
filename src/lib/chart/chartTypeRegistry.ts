/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   chartTypeRegistry.ts                               :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 12:00:00 by dlesieur          #+#    #+#             */
/*                                                +#+#+#+#+#+   +#+           */
/* ************************************************************************** */

/**
 * One registry for every chart type the gallery offers. Two render engines
 * coexist: the original recharts canvas keeps the 5 parity-tested legacy
 * types (drilldown, legend toggling, server-truth e2e — zero regression
 * risk), a lazily loaded ECharts canvas renders the extended family. BOTH
 * are fed by the same pure chart engine (ChartResult), so filters, caps,
 * hidden groups and server aggregation behave identically everywhere.
 */

import { CHART_TYPE_PRESETS } from './chartTypePresets';

/** Legacy union — the recharts path still narrows to these. */
export type LegacyChartType =
  | 'vertical_bar' | 'horizontal_bar' | 'line' | 'donut' | 'pie' | 'number';

export type ChartEngine = 'recharts' | 'echarts';

export type ChartFamily =
  | 'bar' | 'line' | 'area' | 'pie' | 'scatter' | 'radar'
  | 'heatmap' | 'hierarchy' | 'flow' | 'stat' | 'special';

/** What a preset needs before it can render meaningfully. */
export interface ChartTypeNeeds {
  /** Requires a breakdown (Y group by) to make sense (e.g. heatmap rows). */
  series?: boolean;
  /** Requires a date x axis (e.g. calendar heatmap, theme river). */
  dateX?: boolean;
}

export interface ChartTypeDef {
  id: string;
  label: string;
  family: ChartFamily;
  engine: ChartEngine;
  /** echarts option-builder family key (builders dispatch on this). */
  builder: string;
  needs?: ChartTypeNeeds;
  description?: string;
}

const REGISTRY = new Map<string, ChartTypeDef>(
  CHART_TYPE_PRESETS.map((def) => [def.id, def]),
);

export const FALLBACK_CHART_TYPE = 'vertical_bar';

/** Definition for a chart type id — unknown ids fall back to vertical_bar. */
export function getChartTypeDef(id: string | undefined): ChartTypeDef {
  return REGISTRY.get(id ?? FALLBACK_CHART_TYPE)
    ?? (REGISTRY.get(FALLBACK_CHART_TYPE) as ChartTypeDef);
}

/** All presets grouped by family, in declaration order (gallery layout). */
export function chartTypesByFamily(): [ChartFamily, ChartTypeDef[]][] {
  const groups = new Map<ChartFamily, ChartTypeDef[]>();
  for (const def of CHART_TYPE_PRESETS) {
    const bucket = groups.get(def.family) ?? [];
    bucket.push(def);
    groups.set(def.family, bucket);
  }
  return [...groups.entries()];
}

/** Human labels for gallery section headers. */
export const CHART_FAMILY_LABELS: Record<ChartFamily, string> = {
  bar: 'Bar', line: 'Line', area: 'Area', pie: 'Pie & donut',
  scatter: 'Scatter', radar: 'Radar & polar', heatmap: 'Heatmap',
  hierarchy: 'Hierarchy', flow: 'Flow', stat: 'Stat', special: 'Special',
};
