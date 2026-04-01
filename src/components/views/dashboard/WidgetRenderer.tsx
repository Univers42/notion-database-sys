import React from 'react';
import { Hash, TrendingUp, Activity, BarChart3, PieChart, Users } from 'lucide-react';
import type { DashboardWidget, SchemaProperty } from '../../../types/database';
import { COLORS, STAT_COLORS, formatNumber, formatCellValue } from './constants';
import { StatIconBadge, EmptyWidget } from './StatComponents';
import { RecentList } from './DataComponents';
import { DonutChart, AreaChartSVG, ProgressRing } from './SVGCharts';
import { MultiLineChart } from './MultiLineChart';

// ─── Computed data shape ─────────────────────────────────────────────────────

export interface ComputedData {
  numberAggs: Record<string, { sum: number; count: number; min: number; max: number }>;
  selectCounts: Record<string, Record<string, { count: number; color: string; label: string }>>;
  checked: number;
  unchecked: number;
  recentCount: number;
}

type ChartItem = { count: number; color: string; label: string };

// ─── Stat widget ─────────────────────────────────────────────────────────────

const STAT_ICONS = [
  <Hash className="w-5 h-5" />, <TrendingUp className="w-5 h-5" />,
  <Activity className="w-5 h-5" />, <BarChart3 className="w-5 h-5" />,
  <PieChart className="w-5 h-5" />, <Users className="w-5 h-5" />,
];

function resolveStatValue(prop: SchemaProperty | null, data: ComputedData, widget: DashboardWidget, total: number) {
  let value = 0, subtext = '';
  if (!widget.propertyId || widget.aggregation === 'count') { value = total; }
  else if (prop?.type === 'number' && data.numberAggs[prop.id]) {
    const agg = data.numberAggs[prop.id];
    switch (widget.aggregation) {
      case 'sum': value = agg.sum; break;
      case 'average': value = Number((agg.sum / agg.count).toFixed(1)); subtext = `from ${agg.count} records`; break;
      case 'min': value = agg.min === Infinity ? 0 : agg.min; break;
      case 'max': value = agg.max === -Infinity ? 0 : agg.max; break;
      default: value = agg.sum;
    }
  } else if ((prop?.type === 'select' || prop?.type === 'status') && data.selectCounts[prop.id]) {
    value = Object.keys(data.selectCounts[prop.id]).length; subtext = 'distinct values';
  } else if (prop?.type === 'checkbox') {
    value = data.checked; subtext = `${Math.round((data.checked / Math.max(data.checked + data.unchecked, 1)) * 100)}% of total`;
  }
  return { value, subtext };
}

function renderStatWidget(widget: DashboardWidget, idx: number, prop: SchemaProperty | null, data: ComputedData, total: number) {
  const { value, subtext } = resolveStatValue(prop, data, widget, total);
  return (
    <div className="p-4 h-full flex items-start gap-3">
      <StatIconBadge color={STAT_COLORS[idx % STAT_COLORS.length]}>{STAT_ICONS[idx % STAT_ICONS.length]}</StatIconBadge>
      <div className="flex-1 min-w-0">
        <div className="text-2xl font-bold text-ink tabular-nums leading-none mb-1">{formatNumber(value)}</div>
        <div className="text-xs text-ink-secondary truncate">{widget.title}</div>
        {subtext && <div className="text-[10px] text-ink-muted mt-0.5">{subtext}</div>}
      </div>
    </div>
  );
}

// ─── Chart widget sub-styles ─────────────────────────────────────────────────

function renderDonutStyle(widget: DashboardWidget, chartData: ChartItem[]) {
  return (
    <div className="p-5 h-full flex flex-col">
      <h3 className="text-sm font-semibold text-ink mb-4">{widget.title}</h3>
      <div className="flex-1 flex items-center justify-center gap-6">
        <DonutChart data={chartData} size={widget.height === 2 ? 140 : 100} />
        <div className="flex flex-col gap-1.5">
          {chartData.slice(0, 6).map((item, i) => (
            <div key={item.label} className="flex items-center gap-2 text-xs">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <span className="text-ink-body-light truncate max-w-[100px]">{item.label}</span>
              <span className="text-ink-muted tabular-nums ml-auto">{item.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function renderHorizontalBarStyle(widget: DashboardWidget, chartData: ChartItem[], total: number) {
  return (
    <div className="p-5 h-full flex flex-col">
      <h3 className="text-sm font-semibold text-ink mb-4">{widget.title}</h3>
      <div className="flex-1 flex flex-col gap-2.5 overflow-auto">
        {chartData.map((item, i) => {
          const pct = total > 0 ? (item.count / total) * 100 : 0;
          return (
            <div key={item.label}>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-ink-body font-medium truncate">{item.label}</span>
                <span className="text-ink-muted tabular-nums ml-2">{item.count} ({Math.round(pct)}%)</span>
              </div>
              <div className="w-full bg-surface-tertiary rounded-full h-2.5">
                <div className="h-2.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function renderStackedBarStyle(widget: DashboardWidget, chartData: ChartItem[], total: number) {
  return (
    <div className="p-5 h-full flex flex-col">
      <h3 className="text-sm font-semibold text-ink mb-4">{widget.title}</h3>
      <div className="flex-1 flex flex-col justify-center gap-4">
        <div className="w-full h-8 rounded-lg overflow-hidden flex">
          {chartData.map((item, i) => {
            const pct = total > 0 ? (item.count / total) * 100 : 0;
            return (
              <div key={item.label} className="h-full transition-all hover:opacity-80"
                style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                title={`${item.label}: ${item.count} (${Math.round(pct)}%)`} />
            );
          })}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {chartData.map((item, i) => (
            <div key={item.label} className="flex items-center gap-1.5 text-xs">
              <div className="w-2.5 h-2.5 rounded shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <span className="text-ink-body-light">{item.label}</span>
              <span className="text-ink-muted tabular-nums">{Math.round((item.count / total) * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function renderProgressStyle(widget: DashboardWidget, chartData: ChartItem[], total: number) {
  return (
    <div className="p-5 h-full flex flex-col">
      <h3 className="text-sm font-semibold text-ink mb-4">{widget.title}</h3>
      <div className="flex-1 flex items-center justify-center">
        <div className={`grid gap-4 ${chartData.length <= 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
          {chartData.slice(0, 8).map((item, i) => {
            const pct = total > 0 ? (item.count / total) * 100 : 0;
            return (
              <div key={item.label} className="flex flex-col items-center gap-1">
                <ProgressRing pct={pct} color={COLORS[i % COLORS.length]} size={48} />
                <span className="text-[10px] text-ink-secondary truncate max-w-[60px] text-center">{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function renderDefaultBarChart(widget: DashboardWidget, chartData: ChartItem[], total: number) {
  if (widget.height === 2) {
    return (
      <div className="p-5 h-full flex flex-col">
        <h3 className="text-sm font-semibold text-ink mb-4">{widget.title}</h3>
        <div className="flex-1 flex gap-6">
          <div className="flex-shrink-0 flex items-center justify-center"><DonutChart data={chartData} size={120} /></div>
          <div className="flex-1 flex flex-col gap-2 overflow-auto">
            {chartData.map((item, i) => {
              const pct = total > 0 ? (item.count / total) * 100 : 0;
              return (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className={`px-1.5 py-0.5 rounded font-medium ${item.color}`}>{item.label}</span>
                    <span className="text-ink-secondary tabular-nums">{item.count} ({Math.round(pct)}%)</span>
                  </div>
                  <div className="w-full bg-surface-tertiary rounded-full h-2">
                    <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
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
    <div className="p-4 h-full flex flex-col">
      <h3 className="text-xs font-semibold text-ink mb-3">{widget.title}</h3>
      <div className="flex items-end gap-2 flex-1">
        {chartData.slice(0, 8).map((item, i) => {
          const maxCount = Math.max(...chartData.map(d => d.count));
          const pct = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
          return (
            <div key={item.label} className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
              <span className="text-[10px] font-semibold text-ink-body tabular-nums">{item.count}</span>
              <div className="w-full rounded-t transition-all hover:opacity-80" style={{ height: `${Math.max(pct, 8)}%`, backgroundColor: COLORS[i % COLORS.length] }} />
              <span className="text-[8px] text-ink-secondary truncate max-w-full">{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Chart widget dispatcher ─────────────────────────────────────────────────

function renderSelectChart(
  widget: DashboardWidget, chartData: ChartItem[], total: number,
  pages: { properties: Record<string, unknown> }[], propsMap: Record<string, SchemaProperty>,
) {
  const style = widget.chartStyle || 'bar';
  if (style === 'donut') return renderDonutStyle(widget, chartData);
  if (style === 'horizontal_bar') return renderHorizontalBarStyle(widget, chartData, total);
  if (style === 'stacked_bar') return renderStackedBarStyle(widget, chartData, total);
  if (style === 'area') return (
    <div className="p-5 h-full flex flex-col">
      <h3 className="text-sm font-semibold text-ink mb-3">{widget.title}</h3>
      <div className="flex-1 flex items-end"><AreaChartSVG data={chartData} /></div>
    </div>
  );
  if (style === 'multi_line') return (
    <div className="p-5 h-full flex flex-col">
      <h3 className="text-sm font-semibold text-ink mb-3">{widget.title}</h3>
      <div className="flex-1 flex items-end"><MultiLineChart data={chartData} pages={pages} propsMap={propsMap} /></div>
    </div>
  );
  if (style === 'progress') return renderProgressStyle(widget, chartData, total);
  return renderDefaultBarChart(widget, chartData, total);
}

function renderNumberChart(widget: DashboardWidget, agg: { sum: number; count: number; min: number; max: number }) {
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

// ─── Table widget ────────────────────────────────────────────────────────────

function renderTableWidget(
  widget: DashboardWidget, prop: SchemaProperty | null,
  pages: { id: string; icon?: string; properties: Record<string, unknown> }[],
  openPage: (id: string) => void, getPageTitle: (p: unknown) => string,
) {
  const tablePages = pages.slice(0, 20);
  return (
    <div className="p-5 h-full flex flex-col">
      <h3 className="text-sm font-semibold text-ink mb-3">{widget.title}</h3>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line">
              <th className="text-left py-1.5 text-xs text-ink-secondary font-medium">Name</th>
              {prop && <th className="text-right py-1.5 text-xs text-ink-secondary font-medium">{prop.name}</th>}
            </tr>
          </thead>
          <tbody>
            {tablePages.map(page => (
              <tr key={page.id} className="border-b border-line-light hover:bg-hover-surface cursor-pointer" onClick={() => openPage(page.id)}>
                <td className="py-1.5 text-ink truncate max-w-[200px]">
                  {page.icon && <span className="mr-1">{page.icon}</span>}
                  {getPageTitle(page) || 'Untitled'}
                </td>
                {prop && <td className="py-1.5 text-right text-ink-body-light tabular-nums">{formatCellValue(page.properties[prop.id], prop)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main dispatcher ─────────────────────────────────────────────────────────

export function renderWidget(
  widget: DashboardWidget, idx: number,
  pages: { id: string; icon?: string; updatedAt: string; properties: Record<string, unknown> }[],
  propsMap: Record<string, SchemaProperty>,
  data: ComputedData,
  openPage: (id: string) => void,
  getPageTitle: (page: unknown) => string,
) {
  const prop = widget.propertyId ? propsMap[widget.propertyId] || null : null;

  if (widget.type === 'stat') return renderStatWidget(widget, idx, prop, data, pages.length);

  if (widget.type === 'chart') {
    if (!prop) return <EmptyWidget title={widget.title} message="No property configured" />;
    if ((prop.type === 'select' || prop.type === 'status') && data.selectCounts[prop.id]) {
      const chartData = Object.values(data.selectCounts[prop.id]).sort((a, b) => b.count - a.count);
      const total = chartData.reduce((s, d) => s + d.count, 0);
      return renderSelectChart(widget, chartData, total, pages, propsMap);
    }
    if (prop.type === 'number' && data.numberAggs[prop.id]) return renderNumberChart(widget, data.numberAggs[prop.id]);
    return <EmptyWidget title={widget.title} message="No data for this property" />;
  }

  if (widget.type === 'list') {
    const recent = [...pages].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 10);
    return (
      <div className="p-5 h-full flex flex-col">
        <h3 className="text-sm font-semibold text-ink mb-3">{widget.title}</h3>
        <div className="flex-1 overflow-auto"><RecentList pages={recent} openPage={openPage} getPageTitle={getPageTitle} /></div>
      </div>
    );
  }

  if (widget.type === 'table') return renderTableWidget(widget, prop, pages, openPage, getPageTitle);

  return <EmptyWidget title={widget.title} message="Unknown widget type" />;
}
