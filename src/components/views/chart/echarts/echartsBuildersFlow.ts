/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   echartsBuildersFlow.ts                             :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 12:00:00 by dlesieur          #+#    #+#             */
/*                                                +#+#+#+#+#+   +#+           */
/* ************************************************************************** */

// ─── Flow builders: funnel/pyramid, sankey, relation graph, waterfall ───────

import { sankeyData, waterfallSegments } from '../../../../lib/chart/chartEchartsData';
import { baseOption, type BuilderCtx, type EOption } from './echartsBuildersCore';

export function buildFunnel(ctx: BuilderCtx): EOption {
  const data = [...ctx.result.categories]
    .sort((a, b) => b.total - a.total)
    .map((category) => ({ name: category.label, value: category.total }));
  return {
    ...baseOption(ctx),
    tooltip: { trigger: 'item', confine: true },
    series: [{
      type: 'funnel', data,
      sort: ctx.def.id === 'pyramid' ? 'ascending' : 'descending',
      gap: 2, label: { show: true, position: 'inside' },
    }],
  };
}

export function buildSankey(ctx: BuilderCtx): EOption {
  const { nodes, links } = sankeyData(ctx.result);
  return {
    color: [...ctx.colors],
    tooltip: { trigger: 'item', confine: true },
    series: [{
      type: 'sankey', data: nodes, links,
      emphasis: { focus: 'adjacency' },
      lineStyle: { color: 'gradient', curveness: 0.5 },
    }],
  };
}

export function buildGraph(ctx: BuilderCtx): EOption {
  const { nodes, links } = sankeyData(ctx.result);
  const maxLink = Math.max(1, ...links.map((link) => link.value));
  return {
    color: [...ctx.colors],
    tooltip: { confine: true },
    series: [{
      type: 'graph', layout: 'circular',
      data: nodes.map((node) => ({ ...node, symbolSize: 18 })),
      links: links.map((link) => ({ ...link, lineStyle: { width: 1 + (link.value / maxLink) * 6 } })),
      label: { show: true, position: 'right' },
    }],
  };
}

export function buildWaterfall(ctx: BuilderCtx): EOption {
  const { labels, offsets, deltas } = waterfallSegments(ctx.result);
  return {
    ...baseOption(ctx),
    legend: { show: false },
    xAxis: { type: 'category', data: labels },
    yAxis: { type: 'value', splitLine: { show: ctx.settings.showGridLines !== false } },
    series: [
      {
        type: 'bar', stack: 'wf', data: offsets, tooltip: { show: false },
        itemStyle: { color: 'transparent' }, emphasis: { itemStyle: { color: 'transparent' } },
      },
      {
        type: 'bar', stack: 'wf',
        data: deltas.map((delta, index) => ({
          value: Math.abs(delta),
          itemStyle: {
            color: index === deltas.length - 1
              ? ctx.colors[1]
              : (delta >= 0 ? ctx.colors[0] : ctx.colors[2 % ctx.colors.length]),
            borderRadius: 2,
          },
        })),
      },
    ],
  };
}
