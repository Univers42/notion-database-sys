/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ChartStyles.tsx                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:37:42 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 18:07:36 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import type { DashboardWidget, SchemaProperty } from '../../../../types/database';
import { COLORS } from '../constants';
import { DonutChart, AreaChartSVG, ProgressRing } from '../SVGCharts';
import { MultiLineChart } from '../MultiLineChart';
import type { ChartItem } from './StatWidget';
import { cn } from '../../../../utils/cn';

export function renderDonutStyle(widget: DashboardWidget, chartData: ChartItem[]) {
  return (
    <div className={cn("p-5 h-full flex flex-col")}>
      <h3 className={cn("text-sm font-semibold text-ink mb-4")}>{widget.title}</h3>
      <div className={cn("flex-1 flex items-center justify-center gap-6")}>
        <DonutChart data={chartData} size={widget.height === 2 ? 140 : 100} />
        <div className={cn("flex flex-col gap-1.5")}>
          {chartData.slice(0, 6).map((item, i) => (
            <div key={item.label} className={cn("flex items-center gap-2 text-xs")}>
              <div className={cn("w-2.5 h-2.5 rounded-full shrink-0")} style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <span className={cn("text-ink-body-light truncate max-w-[100px]")}>{item.label}</span>
              <span className={cn("text-ink-muted tabular-nums ml-auto")}>{item.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function renderHorizontalBarStyle(widget: DashboardWidget, chartData: ChartItem[], total: number) {
  return (
    <div className={cn("p-5 h-full flex flex-col")}>
      <h3 className={cn("text-sm font-semibold text-ink mb-4")}>{widget.title}</h3>
      <div className={cn("flex-1 flex flex-col gap-2.5 overflow-auto")}>
        {chartData.map((item, i) => {
          const pct = total > 0 ? (item.count / total) * 100 : 0;
          return (
            <div key={item.label}>
              <div className={cn("flex justify-between text-xs mb-0.5")}>
                <span className={cn("text-ink-body font-medium truncate")}>{item.label}</span>
                <span className={cn("text-ink-muted tabular-nums ml-2")}>{item.count} ({Math.round(pct)}%)</span>
              </div>
              <div className={cn("w-full bg-surface-tertiary rounded-full h-2.5")}>
                <div className={cn("h-2.5 rounded-full transition-all")} style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function renderStackedBarStyle(widget: DashboardWidget, chartData: ChartItem[], total: number) {
  return (
    <div className={cn("p-5 h-full flex flex-col")}>
      <h3 className={cn("text-sm font-semibold text-ink mb-4")}>{widget.title}</h3>
      <div className={cn("flex-1 flex flex-col justify-center gap-4")}>
        <div className={cn("w-full h-8 rounded-lg overflow-hidden flex")}>
          {chartData.map((item, i) => {
            const pct = total > 0 ? (item.count / total) * 100 : 0;
            return (
              <div key={item.label} className={cn("h-full transition-all hover:opacity-80")}
                style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                title={`${item.label}: ${item.count} (${Math.round(pct)}%)`} />
            );
          })}
        </div>
        <div className={cn("flex flex-wrap gap-x-4 gap-y-1.5")}>
          {chartData.map((item, i) => (
            <div key={item.label} className={cn("flex items-center gap-1.5 text-xs")}>
              <div className={cn("w-2.5 h-2.5 rounded shrink-0")} style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <span className={cn("text-ink-body-light")}>{item.label}</span>
              <span className={cn("text-ink-muted tabular-nums")}>{Math.round((item.count / total) * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function renderProgressStyle(widget: DashboardWidget, chartData: ChartItem[], total: number) {
  return (
    <div className={cn("p-5 h-full flex flex-col")}>
      <h3 className={cn("text-sm font-semibold text-ink mb-4")}>{widget.title}</h3>
      <div className={cn("flex-1 flex items-center justify-center")}>
        <div className={cn(`grid gap-4 ${chartData.length <= 3 ? 'grid-cols-3' : 'grid-cols-4'}`)}>
          {chartData.slice(0, 8).map((item, i) => {
            const pct = total > 0 ? (item.count / total) * 100 : 0;
            return (
              <div key={item.label} className={cn("flex flex-col items-center gap-1")}>
                <ProgressRing pct={pct} color={COLORS[i % COLORS.length]} size={48} />
                <span className={cn("text-[10px] text-ink-secondary truncate max-w-[60px] text-center")}>{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function renderDefaultBarChart(widget: DashboardWidget, chartData: ChartItem[], total: number) {
  if (widget.height === 2) {
    return (
      <div className={cn("p-5 h-full flex flex-col")}>
        <h3 className={cn("text-sm font-semibold text-ink mb-4")}>{widget.title}</h3>
        <div className={cn("flex-1 flex gap-6")}>
          <div className={cn("flex-shrink-0 flex items-center justify-center")}><DonutChart data={chartData} size={120} /></div>
          <div className={cn("flex-1 flex flex-col gap-2 overflow-auto")}>
            {chartData.map((item, i) => {
              const pct = total > 0 ? (item.count / total) * 100 : 0;
              return (
                <div key={item.label}>
                  <div className={cn("flex justify-between text-xs mb-0.5")}>
                    <span className={cn(`px-1.5 py-0.5 rounded font-medium ${item.color}`)}>{item.label}</span>
                    <span className={cn("text-ink-secondary tabular-nums")}>{item.count} ({Math.round(pct)}%)</span>
                  </div>
                  <div className={cn("w-full bg-surface-tertiary rounded-full h-2")}>
                    <div className={cn("h-2 rounded-full transition-all")} style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className={cn("p-4 h-full flex flex-col")}>
      <h3 className={cn("text-xs font-semibold text-ink mb-3")}>{widget.title}</h3>
      <div className={cn("flex items-end gap-2 flex-1")}>
        {chartData.slice(0, 8).map((item, i) => {
          const maxCount = Math.max(...chartData.map(d => d.count));
          const pct = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
          return (
            <div key={item.label} className={cn("flex flex-col items-center gap-0.5 flex-1 min-w-0")}>
              <span className={cn("text-[10px] font-semibold text-ink-body tabular-nums")}>{item.count}</span>
              <div className={cn("w-full rounded-t transition-all hover:opacity-80")} style={{ height: `${Math.max(pct, 8)}%`, backgroundColor: COLORS[i % COLORS.length] }} />
              <span className={cn("text-[8px] text-ink-secondary truncate max-w-full")}>{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function renderSelectChart(
  widget: DashboardWidget, chartData: ChartItem[], total: number,
  pages: { properties: Record<string, unknown> }[], propsMap: Record<string, SchemaProperty>,
) {
  const style = widget.chartStyle || 'bar';
  if (style === 'donut') return renderDonutStyle(widget, chartData);
  if (style === 'horizontal_bar') return renderHorizontalBarStyle(widget, chartData, total);
  if (style === 'stacked_bar') return renderStackedBarStyle(widget, chartData, total);
  if (style === 'area') return (
    <div className={cn("p-5 h-full flex flex-col")}>
      <h3 className={cn("text-sm font-semibold text-ink mb-3")}>{widget.title}</h3>
      <div className={cn("flex-1 flex items-end")}><AreaChartSVG data={chartData} /></div>
    </div>
  );
  if (style === 'multi_line') return (
    <div className={cn("p-5 h-full flex flex-col")}>
      <h3 className={cn("text-sm font-semibold text-ink mb-3")}>{widget.title}</h3>
      <div className={cn("flex-1 flex items-end")}><MultiLineChart data={chartData} pages={pages} propsMap={propsMap} /></div>
    </div>
  );
  if (style === 'progress') return renderProgressStyle(widget, chartData, total);
  return renderDefaultBarChart(widget, chartData, total);
}
