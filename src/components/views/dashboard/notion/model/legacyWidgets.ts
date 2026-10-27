/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   legacyWidgets.ts                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/10/27 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/10/27 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── legacyWidgets — adapt a legacy `settings.widgets` grid to dashboard rows ─
// Pure: maps each legacy tile to a widget of the editable model (KPI, chart or
// record list over the dashboard's own records) and packs the 4-column grid
// into rows. Used at read time when `dashboardRows` is absent.

import type {
  DashboardChartConfig, DashboardRow, DashboardStatConfig, DashboardViewWidget,
  SchemaProperty,
} from '../../../../../types/database';
import type { DashboardWidget } from '../../../../../types/database';
import { statKind } from '../../dashboardAggregates';

const HEIGHT_1 = 140;
const HEIGHT_2 = 320;

function statConfigFor(widget: DashboardWidget, properties: Record<string, SchemaProperty>): DashboardStatConfig {
  const prop = widget.propertyId ? properties[widget.propertyId] || null : null;
  const kind = statKind(prop, widget);
  if (kind === 'checked' && widget.propertyId) {
    return {
      fn: 'count',
      where: [{ id: `w-${widget.id}`, propertyId: widget.propertyId, operator: 'is_checked', value: true }],
    };
  }
  if (kind === 'count') return { fn: 'count' };
  if (kind === 'distinct') return { fn: 'distinct', propertyId: widget.propertyId };
  const fn = kind === 'average' ? 'avg' : kind;
  return { fn: fn as DashboardStatConfig['fn'], propertyId: widget.propertyId };
}

function chartTypeForStyle(style: DashboardWidget['chartStyle']): string {
  switch (style) {
    case 'donut': return 'donut';
    case 'horizontal_bar': return 'horizontal_bar';
    case 'stacked_bar': return 'stacked_bar';
    case 'area': return 'area';
    case 'multi_line': return 'multi_line';
    case 'progress': return 'progress_gauge';
    default: return 'vertical_bar';
  }
}

interface PackedItem {
  widget: DashboardViewWidget;
  legacyWidth: number;
  legacyHeight: 1 | 2;
}

export function legacyWidgetsToRows(
  widgets: DashboardWidget[],
  hostViewId: string,
  properties: Record<string, SchemaProperty>,
): { dashboardWidgets: DashboardViewWidget[]; dashboardRows: DashboardRow[] } {
  if (!widgets || widgets.length === 0) {
    return { dashboardWidgets: [], dashboardRows: [] };
  }

  // Expand legacy widgets into (possibly multiple) editable widgets.
  const expanded: PackedItem[] = [];
  for (const widget of widgets) {
    const prop = widget.propertyId ? properties[widget.propertyId] || null : null;
    if (widget.type === 'stat') {
      expanded.push({
        widget: {
          id: widget.id,
          viewId: hostViewId,
          title: widget.title,
          stat: statConfigFor(widget, properties),
        },
        legacyWidth: widget.width,
        legacyHeight: widget.height,
      });
      continue;
    }
    if (widget.type === 'chart') {
      if (prop?.type === 'number') {
        // Legacy number chart shows sum/avg/min/max as four tiles.
        const figures: DashboardViewWidget[] = (['sum', 'avg', 'min', 'max'] as const).map(fn => ({
          id: `${widget.id}-${fn}`,
          viewId: hostViewId,
          title: widget.title,
          stat: { fn, propertyId: widget.propertyId },
        }));
        for (const figure of figures) {
          expanded.push({ widget: figure, legacyWidth: 1, legacyHeight: widget.height });
        }
        // Mark the group so packing keeps them on their own row: handled below by
        // flushing the current row before appending them.
        // We push a sentinel via a side-channel: track last expansion boundary.
        // Simpler: handled in packing by detecting consecutive figure ids.
        continue;
      }
      if (prop && (prop.type === 'select' || prop.type === 'status')) {
        const chart: DashboardChartConfig = {
          chartType: chartTypeForStyle(widget.chartStyle),
          xAxisProperty: widget.propertyId as string,
          yAxisAggregation: 'count',
        };
        expanded.push({
          widget: { id: widget.id, viewId: hostViewId, title: widget.title, chart },
          legacyWidth: widget.width,
          legacyHeight: widget.height,
        });
        continue;
      }
      // Fallback: keep as embedded view placeholder? Treat as empty stat.
      expanded.push({
        widget: { id: widget.id, viewId: hostViewId, title: widget.title },
        legacyWidth: widget.width,
        legacyHeight: widget.height,
      });
      continue;
    }
    if (widget.type === 'table') {
      expanded.push({
        widget: {
          id: widget.id,
          viewId: hostViewId,
          title: widget.title,
          records: {
            sortPropertyId: widget.propertyId,
            direction: 'desc',
            limit: 20,
            showPropertyId: widget.propertyId,
          },
        },
        legacyWidth: widget.width,
        legacyHeight: widget.height,
      });
      continue;
    }
    if (widget.type === 'list') {
      expanded.push({
        widget: {
          id: widget.id,
          viewId: hostViewId,
          title: widget.title,
          records: { direction: 'desc', limit: 10 },
        },
        legacyWidth: widget.width,
        legacyHeight: widget.height,
      });
      continue;
    }
  }

  // Pack into rows of <= 4 legacy columns. Number-chart figure groups (4 tiles)
  // must stay on their own row, so flush the current row when a figure run starts.
  const rows: DashboardRow[] = [];
  let current: PackedItem[] = [];
  let currentWidth = 0;
  const flush = () => {
    if (current.length === 0) return;
    const height = current.some(i => i.legacyHeight === 2) ? HEIGHT_2 : HEIGHT_1;
    const widths = current.map(i => i.legacyWidth / 4);
    // Normalize to sum 1 in case of rounding.
    const sum = widths.reduce((a, b) => a + b, 0);
    const normalized = sum > 0 ? widths.map(w => w / sum) : widths.map(() => 1 / current.length);
    rows.push({
      id: `r-${rows.length}`,
      widgetIds: current.map(i => i.widget.id),
      widths: normalized,
      height,
    });
    current = [];
    currentWidth = 0;
  };

  // Identify figure runs: a maximal run of items whose ids end with -sum/-avg/-min/-max
  // and originated from the same number chart. We'll just flush before first figure
  // and after last figure by detecting id suffix.
  let i = 0;
  // First, mark figure items.
  const isFigure = (item: PackedItem) => /-(sum|avg|min|max)$/.test(item.widget.id);
  while (i < expanded.length) {
    const item = expanded[i];
    if (isFigure(item)) {
      // flush current
      flush();
      // collect run
      const run: PackedItem[] = [];
      while (i < expanded.length && isFigure(expanded[i])) {
        run.push(expanded[i]);
        i++;
      }
      // push run as its own row(s) of <=4
      let acc: PackedItem[] = [];
      let accW = 0;
      for (const r of run) {
        if (acc.length > 0 && accW + r.legacyWidth > 4) {
          // flush acc
          const height = acc.some(x => x.legacyHeight === 2) ? HEIGHT_2 : HEIGHT_1;
          const widths = acc.map(x => x.legacyWidth / 4);
          const sum = widths.reduce((a, b) => a + b, 0);
          const normalized = sum > 0 ? widths.map(w => w / sum) : widths.map(() => 1 / acc.length);
          rows.push({ id: `r-${rows.length}`, widgetIds: acc.map(x => x.widget.id), widths: normalized, height });
          acc = [];
          accW = 0;
        }
        acc.push(r);
        accW += r.legacyWidth;
      }
      if (acc.length > 0) {
        const height = acc.some(x => x.legacyHeight === 2) ? HEIGHT_2 : HEIGHT_1;
        const widths = acc.map(x => x.legacyWidth / 4);
        const sum = widths.reduce((a, b) => a + b, 0);
        const normalized = sum > 0 ? widths.map(w => w / sum) : widths.map(() => 1 / acc.length);
        rows.push({ id: `r-${rows.length}`, widgetIds: acc.map(x => x.widget.id), widths: normalized, height });
      }
      continue;
    }
    // normal item
    if (current.length > 0 && currentWidth + item.legacyWidth > 4) {
      flush();
    }
    current.push(item);
    currentWidth += item.legacyWidth;
    i++;
  }
  flush();

  return {
    dashboardWidgets: expanded.map(e => e.widget),
    dashboardRows: rows,
  };
}
