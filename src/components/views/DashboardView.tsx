import React, { useMemo } from 'react';
import { useDatabaseStore } from '../../store/useDatabaseStore';
import { DashboardWidget, SchemaProperty } from '../../types/database';
import { Hash, TrendingUp, Users, CheckCircle, Clock, BarChart3, ArrowUpRight, Activity, PieChart, List, TableIcon } from 'lucide-react';
import { format, isThisWeek, parseISO } from 'date-fns';
import { FormulaAnalyticsDashboard } from './FormulaAnalyticsDashboard';
import { RelationRollupDashboard } from './RelationRollupDashboard';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#ef4444', '#6366f1', '#14b8a6', '#f97316'];
const STAT_COLORS: ('blue' | 'purple' | 'green' | 'amber' | 'pink' | 'cyan')[] = ['blue', 'purple', 'green', 'amber', 'pink', 'cyan'];

export function DashboardView() {
  const { activeViewId, views, databases, getPagesForView, openPage, getPageTitle } = useDatabaseStore();
  const view = activeViewId ? views[activeViewId] : null;
  const database = view ? databases[view.databaseId] : null;

  // Route to Formula Analytics dashboard when flagged
  if (view?.settings?.formulaAnalytics) {
    return <FormulaAnalyticsDashboard />;
  }

  // Route to Relation & Rollup Analytics dashboard when flagged
  if (view?.settings?.relationAnalytics) {
    return <RelationRollupDashboard />;
  }

  const pages = view ? getPagesForView(view.id) : [];
  const allProps = database ? Object.values(database.properties) : [];
  const propsMap = database ? database.properties : {};

  // Precompute all aggregation data
  const computedData = useMemo(() => {
    if (!database) return { numberAggs: {}, selectCounts: {}, checked: 0, unchecked: 0, recentCount: 0 };

    let checked = 0, unchecked = 0;
    const numberAggs: Record<string, { sum: number; count: number; min: number; max: number }> = {};
    const selectCounts: Record<string, Record<string, { count: number; color: string; label: string }>> = {};

    const recentCount = pages.filter(p => {
      try { return isThisWeek(parseISO(p.updatedAt)); } catch { return false; }
    }).length;

    pages.forEach(page => {
      allProps.forEach(prop => {
        const val = page.properties[prop.id];
        if (prop.type === 'checkbox') { if (val) checked++; else unchecked++; }
        if (prop.type === 'number' && typeof val === 'number') {
          if (!numberAggs[prop.id]) numberAggs[prop.id] = { sum: 0, count: 0, min: Infinity, max: -Infinity };
          numberAggs[prop.id].sum += val;
          numberAggs[prop.id].count++;
          numberAggs[prop.id].min = Math.min(numberAggs[prop.id].min, val);
          numberAggs[prop.id].max = Math.max(numberAggs[prop.id].max, val);
        }
        if ((prop.type === 'select' || prop.type === 'status') && val) {
          if (!selectCounts[prop.id]) selectCounts[prop.id] = {};
          const opt = prop.options?.find(o => o.id === val);
          const label = opt?.value || val;
          if (!selectCounts[prop.id][label]) selectCounts[prop.id][label] = { count: 0, color: opt?.color || '', label };
          selectCounts[prop.id][label].count++;
        }
      });
    });

    return { numberAggs, selectCounts, checked, unchecked, recentCount };
  }, [pages, database, allProps]);

  if (!view || !database) return null;

  const settings = view.settings || {};
  const widgets: DashboardWidget[] = settings.widgets || [];

  // ─── WIDGET-DRIVEN MODE ─── If widgets are configured, render from config
  if (widgets.length > 0) {
    return (
      <div className="flex-1 overflow-auto p-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          {/* Render widgets in a CSS grid with 4 columns */}
          <div className="grid grid-cols-4 gap-4 auto-rows-min">
            {widgets.map((widget, idx) => (
              <div key={widget.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                style={{
                  gridColumn: `span ${Math.min(widget.width, 4)}`,
                  minHeight: widget.height === 2 ? '320px' : '140px',
                }}>
                {renderWidget(widget, idx, pages, propsMap, computedData, openPage, getPageTitle)}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── FALLBACK: AUTO-DETECT MODE ─── (no widgets configured)
  const checkboxProps = allProps.filter(p => p.type === 'checkbox');
  const numberProps = allProps.filter(p => p.type === 'number');
  const selectProps = allProps.filter(p => p.type === 'select' || p.type === 'status');
  const mainSelectProp = selectProps.sort((a, b) =>
    Object.keys(computedData.selectCounts[b.id] || {}).length - Object.keys(computedData.selectCounts[a.id] || {}).length
  )[0];
  const mainSelectData = mainSelectProp && computedData.selectCounts[mainSelectProp.id]
    ? Object.values(computedData.selectCounts[mainSelectProp.id]).sort((a, b) => b.count - a.count) : [];
  const recentPages = [...pages].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 8);

  return (
    <div className="flex-1 overflow-auto p-6 bg-gray-50">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        {/* Auto KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={<Hash className="w-5 h-5" />} label="Total Records" value={pages.length} color="blue" />
          <StatCard icon={<Clock className="w-5 h-5" />} label="Updated This Week" value={computedData.recentCount} color="purple" />
          {checkboxProps.length > 0 ? (
            <StatCard icon={<CheckCircle className="w-5 h-5" />} label="Completed" value={computedData.checked}
              subtext={`${pages.length > 0 ? Math.round((computedData.checked / Math.max(computedData.checked + computedData.unchecked, 1)) * 100) : 0}%`}
              color="green" />
          ) : (
            <StatCard icon={<Users className="w-5 h-5" />} label="Properties" value={allProps.length} color="green" />
          )}
          {numberProps[0] && computedData.numberAggs[numberProps[0].id] ? (
            <StatCard icon={<TrendingUp className="w-5 h-5" />} label={`Total ${numberProps[0].name}`}
              value={computedData.numberAggs[numberProps[0].id].sum} color="amber" />
          ) : (
            <StatCard icon={<BarChart3 className="w-5 h-5" />} label="Categories" value={mainSelectData.length} color="amber" />
          )}
        </div>

        {/* Auto Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {mainSelectProp && mainSelectData.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">By {mainSelectProp.name}</h3>
              <BarChartWidget data={mainSelectData} total={pages.length} />
            </div>
          )}
          {numberProps.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Number Summary</h3>
              <NumberSummaryWidget numberProps={numberProps} numberAggs={computedData.numberAggs} />
            </div>
          )}
          <div className={`bg-white rounded-xl border border-gray-200 p-5 ${!mainSelectData.length && !numberProps.length ? 'lg:col-span-3' : ''}`}>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <RecentList pages={recentPages} openPage={openPage} getPageTitle={getPageTitle} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── WIDGET RENDERER ─────────────────────────────────────────────────────────

function renderWidget(
  widget: DashboardWidget,
  idx: number,
  pages: any[],
  propsMap: Record<string, SchemaProperty>,
  data: { numberAggs: Record<string, any>; selectCounts: Record<string, any>; checked: number; unchecked: number; recentCount: number },
  openPage: (id: string) => void,
  getPageTitle: (page: any) => string,
) {
  const prop = widget.propertyId ? propsMap[widget.propertyId] : null;

  // ── STAT WIDGET ──
  if (widget.type === 'stat') {
    let value = 0;
    let subtext = '';

    if (!widget.propertyId || widget.aggregation === 'count') {
      value = pages.length;
    } else if (prop?.type === 'number' && data.numberAggs[prop.id]) {
      const agg = data.numberAggs[prop.id];
      switch (widget.aggregation) {
        case 'sum': value = agg.sum; break;
        case 'average': value = Number((agg.sum / agg.count).toFixed(1)); subtext = `from ${agg.count} records`; break;
        case 'min': value = agg.min === Infinity ? 0 : agg.min; break;
        case 'max': value = agg.max === -Infinity ? 0 : agg.max; break;
        default: value = agg.sum;
      }
    } else if ((prop?.type === 'select' || prop?.type === 'status') && data.selectCounts[prop.id]) {
      value = Object.keys(data.selectCounts[prop.id]).length;
      subtext = 'distinct values';
    } else if (prop?.type === 'checkbox') {
      value = data.checked;
      subtext = `${Math.round((data.checked / Math.max(data.checked + data.unchecked, 1)) * 100)}% of total`;
    }

    const statIcons = [
      <Hash className="w-5 h-5" />, <TrendingUp className="w-5 h-5" />,
      <Activity className="w-5 h-5" />, <BarChart3 className="w-5 h-5" />,
      <PieChart className="w-5 h-5" />, <Users className="w-5 h-5" />,
    ];
    const color = STAT_COLORS[idx % STAT_COLORS.length];

    return (
      <div className="p-4 h-full flex items-start gap-3">
        <StatIconBadge color={color}>{statIcons[idx % statIcons.length]}</StatIconBadge>
        <div className="flex-1 min-w-0">
          <div className="text-2xl font-bold text-gray-900 tabular-nums leading-none mb-1">{formatNumber(value)}</div>
          <div className="text-xs text-gray-500 truncate">{widget.title}</div>
          {subtext && <div className="text-[10px] text-gray-400 mt-0.5">{subtext}</div>}
        </div>
      </div>
    );
  }

  // ── CHART WIDGET ──
  if (widget.type === 'chart') {
    if (!prop) return <EmptyWidget title={widget.title} message="No property configured" />;
    const style = widget.chartStyle || 'bar';

    if ((prop.type === 'select' || prop.type === 'status') && data.selectCounts[prop.id]) {
      const chartData = Object.values(data.selectCounts[prop.id] as Record<string, { count: number; color: string; label: string }>)
        .sort((a, b) => b.count - a.count);
      const total = chartData.reduce((s, d) => s + d.count, 0);

      // ── DONUT ──
      if (style === 'donut') {
        return (
          <div className="p-5 h-full flex flex-col">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">{widget.title}</h3>
            <div className="flex-1 flex items-center justify-center gap-6">
              <DonutChart data={chartData} size={widget.height === 2 ? 140 : 100} />
              <div className="flex flex-col gap-1.5">
                {chartData.slice(0, 6).map((item, i) => (
                  <div key={item.label} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-gray-600 truncate max-w-[100px]">{item.label}</span>
                    <span className="text-gray-400 tabular-nums ml-auto">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      }

      // ── HORIZONTAL BAR ──
      if (style === 'horizontal_bar') {
        return (
          <div className="p-5 h-full flex flex-col">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">{widget.title}</h3>
            <div className="flex-1 flex flex-col gap-2.5 overflow-auto">
              {chartData.map((item, i) => {
                const pct = total > 0 ? (item.count / total) * 100 : 0;
                return (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-gray-700 font-medium truncate">{item.label}</span>
                      <span className="text-gray-400 tabular-nums ml-2">{item.count} ({Math.round(pct)}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div className="h-2.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      // ── STACKED BAR ──
      if (style === 'stacked_bar') {
        return (
          <div className="p-5 h-full flex flex-col">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">{widget.title}</h3>
            <div className="flex-1 flex flex-col justify-center gap-4">
              {/* Stacked bar */}
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
              {/* Legend */}
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {chartData.map((item, i) => (
                  <div key={item.label} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-gray-600">{item.label}</span>
                    <span className="text-gray-400 tabular-nums">{Math.round((item.count / total) * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      }

      // ── AREA CHART (SVG) ──
      if (style === 'area') {
        return (
          <div className="p-5 h-full flex flex-col">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">{widget.title}</h3>
            <div className="flex-1 flex items-end">
              <AreaChartSVG data={chartData} />
            </div>
          </div>
        );
      }

      // ── MULTI-LINE CHART (smooth curves, date-like axis) ──
      if (style === 'multi_line') {
        return (
          <div className="p-5 h-full flex flex-col">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">{widget.title}</h3>
            <div className="flex-1 flex items-end">
              <MultiLineChart data={chartData} pages={pages} propsMap={propsMap} />
            </div>
          </div>
        );
      }

      // ── PROGRESS RINGS ──
      if (style === 'progress') {
        return (
          <div className="p-5 h-full flex flex-col">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">{widget.title}</h3>
            <div className="flex-1 flex items-center justify-center">
              <div className={`grid gap-4 ${chartData.length <= 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
                {chartData.slice(0, 8).map((item, i) => {
                  const pct = total > 0 ? (item.count / total) * 100 : 0;
                  return (
                    <div key={item.label} className="flex flex-col items-center gap-1">
                      <ProgressRing pct={pct} color={COLORS[i % COLORS.length]} size={48} />
                      <span className="text-[10px] text-gray-500 truncate max-w-[60px] text-center">{item.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      }

      // ── DEFAULT: BAR CHART ── (includes height variants)
      if (widget.height === 2) {
        return (
          <div className="p-5 h-full flex flex-col">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">{widget.title}</h3>
            <div className="flex-1 flex gap-6">
              <div className="flex-shrink-0 flex items-center justify-center">
                <DonutChart data={chartData} size={120} />
              </div>
              <div className="flex-1 flex flex-col gap-2 overflow-auto">
                {chartData.map((item, i) => {
                  const pct = total > 0 ? (item.count / total) * 100 : 0;
                  return (
                    <div key={item.label}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className={`px-1.5 py-0.5 rounded font-medium ${item.color}`}>{item.label}</span>
                        <span className="text-gray-500 tabular-nums">{item.count} ({Math.round(pct)}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
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

      // Small bar chart (1-height)
      return (
        <div className="p-4 h-full flex flex-col">
          <h3 className="text-xs font-semibold text-gray-900 mb-3">{widget.title}</h3>
          <div className="flex items-end gap-2 flex-1">
            {chartData.slice(0, 8).map((item, i) => {
              const maxCount = Math.max(...chartData.map(d => d.count));
              const pct = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
              return (
                <div key={item.label} className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
                  <span className="text-[10px] font-semibold text-gray-700 tabular-nums">{item.count}</span>
                  <div className="w-full rounded-t transition-all hover:opacity-80" style={{ height: `${Math.max(pct, 8)}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-[8px] text-gray-500 truncate max-w-full">{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // Number property chart: show number_grid or default stats
    if (prop.type === 'number' && data.numberAggs[prop.id]) {
      const agg = data.numberAggs[prop.id];
      return (
        <div className="p-5 h-full flex flex-col">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">{widget.title}</h3>
          <div className="grid grid-cols-4 gap-3 text-center flex-1 items-center">
            {[
              { label: 'Sum', val: agg.sum },
              { label: 'Average', val: Number((agg.sum / agg.count).toFixed(1)) },
              { label: 'Min', val: agg.min === Infinity ? 0 : agg.min },
              { label: 'Max', val: agg.max === -Infinity ? 0 : agg.max },
            ].map(s => (
              <div key={s.label} className="bg-gray-50 rounded-lg p-3">
                <div className="text-xl font-bold text-gray-900 tabular-nums">{formatNumber(s.val)}</div>
                <div className="text-[10px] text-gray-400 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="text-[10px] text-gray-400 mt-2 text-center">{agg.count} records with values</div>
        </div>
      );
    }

    return <EmptyWidget title={widget.title} message="No data for this property" />;
  }

  // ── LIST WIDGET ──
  if (widget.type === 'list') {
    const recentPages = [...pages].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 10);
    return (
      <div className="p-5 h-full flex flex-col">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">{widget.title}</h3>
        <div className="flex-1 overflow-auto">
          <RecentList pages={recentPages} openPage={openPage} getPageTitle={getPageTitle} />
        </div>
      </div>
    );
  }

  // ── TABLE WIDGET ──
  if (widget.type === 'table') {
    const tablePages = pages.slice(0, 20);
    const tableProp = prop;
    return (
      <div className="p-5 h-full flex flex-col">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">{widget.title}</h3>
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-1.5 text-xs text-gray-500 font-medium">Name</th>
                {tableProp && <th className="text-right py-1.5 text-xs text-gray-500 font-medium">{tableProp.name}</th>}
              </tr>
            </thead>
            <tbody>
              {tablePages.map(page => (
                <tr key={page.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => openPage(page.id)}>
                  <td className="py-1.5 text-gray-900 truncate max-w-[200px]">
                    {page.icon && <span className="mr-1">{page.icon}</span>}
                    {getPageTitle(page) || 'Untitled'}
                  </td>
                  {tableProp && (
                    <td className="py-1.5 text-right text-gray-600 tabular-nums">
                      {formatCellValue(page.properties[tableProp.id], tableProp)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return <EmptyWidget title={widget.title} message="Unknown widget type" />;
}

// ─── HELPER COMPONENTS ───────────────────────────────────────────────────────

function DonutChart({ data, size = 120 }: { data: { count: number; color: string; label: string }[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return null;

  const radius = size / 2 - 10;
  const circumference = 2 * Math.PI * radius;
  let cumulativePercent = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {data.map((item, i) => {
        const percent = item.count / total;
        const strokeDasharray = `${circumference * percent} ${circumference * (1 - percent)}`;
        const rotation = cumulativePercent * 360 - 90;
        cumulativePercent += percent;
        return (
          <circle key={i} cx={size / 2} cy={size / 2} r={radius} fill="none"
            stroke={COLORS[i % COLORS.length]} strokeWidth={16}
            strokeDasharray={strokeDasharray}
            transform={`rotate(${rotation} ${size / 2} ${size / 2})`}
            className="transition-all duration-500" />
        );
      })}
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="middle"
        className="text-lg font-bold fill-gray-900">{total}</text>
    </svg>
  );
}

function BarChartWidget({ data, total }: { data: { count: number; color: string; label: string }[]; total: number }) {
  return (
    <div className="flex flex-col gap-3">
      {data.map((item, i) => {
        const pct = total > 0 ? (item.count / total) * 100 : 0;
        return (
          <div key={item.label}>
            <div className="flex justify-between text-sm mb-1">
              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${item.color}`}>{item.label}</span>
              <span className="text-gray-500 tabular-nums">{item.count} ({Math.round(pct)}%)</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function NumberSummaryWidget({ numberProps, numberAggs }: { numberProps: SchemaProperty[]; numberAggs: Record<string, any> }) {
  return (
    <div className="flex flex-col gap-4">
      {numberProps.map(prop => {
        const d = numberAggs[prop.id];
        if (!d || d.count === 0) return null;
        return (
          <div key={prop.id} className="border-b border-gray-100 last:border-0 pb-3 last:pb-0">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">{prop.name}</div>
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { label: 'Sum', val: d.sum },
                { label: 'Avg', val: Number((d.sum / d.count).toFixed(1)) },
                { label: 'Min', val: d.min === Infinity ? '-' : d.min },
                { label: 'Max', val: d.max === -Infinity ? '-' : d.max },
              ].map(s => (
                <div key={s.label}>
                  <div className="text-lg font-bold text-gray-900 tabular-nums">{typeof s.val === 'number' ? s.val.toLocaleString() : s.val}</div>
                  <div className="text-[10px] text-gray-400">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RecentList({ pages, openPage, getPageTitle }: { pages: any[]; openPage: (id: string) => void; getPageTitle: (p: any) => string }) {
  return (
    <div className="flex flex-col gap-1">
      {pages.map(page => {
        const title = getPageTitle(page);
        return (
          <div key={page.id} onClick={() => openPage(page.id)}
            className="flex items-center justify-between py-2 px-2 hover:bg-gray-50 rounded-lg cursor-pointer group transition-colors">
            <div className="flex items-center gap-2 overflow-hidden">
              {page.icon ? <span className="text-sm">{page.icon}</span> : <div className="w-4 h-4 rounded bg-gray-200" />}
              <span className="text-sm text-gray-900 truncate">{title || 'Untitled'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 shrink-0">{format(parseISO(page.updatedAt), 'MMM d')}</span>
              <ArrowUpRight className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        );
      })}
      {pages.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">No recent activity</p>}
    </div>
  );
}

function AreaChartSVG({ data }: { data: { count: number; label: string }[] }) {
  if (data.length === 0) return null;
  const maxCount = Math.max(...data.map(d => d.count));
  const width = 300;
  const height = 140;
  const padding = { top: 12, right: 12, bottom: 28, left: 12 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const points = data.map((d, i) => ({
    x: padding.left + (i / Math.max(data.length - 1, 1)) * innerW,
    y: padding.top + innerH - (maxCount > 0 ? (d.count / maxCount) * innerH : 0),
    label: d.label,
    count: d.count,
  }));

  // Catmull-Rom to cubic bezier smooth curve
  const smoothLine = (pts: { x: number; y: number }[]): string => {
    if (pts.length < 2) return '';
    if (pts.length === 2) return `M${pts[0].x} ${pts[0].y} L${pts[1].x} ${pts[1].y}`;
    let path = `M${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      path += ` C${cp1x.toFixed(1)} ${cp1y.toFixed(1)} ${cp2x.toFixed(1)} ${cp2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return path;
  };

  const linePath = smoothLine(points);
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + innerH} L ${points[0].x} ${padding.top + innerH} Z`;

  // Y-axis grid lines
  const gridLines = [0.25, 0.5, 0.75, 1].map(f => padding.top + innerH * (1 - f));

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id="areaGradSmooth" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* Grid lines */}
      {gridLines.map((y, i) => (
        <line key={i} x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="3 3" />
      ))}
      {/* Area fill */}
      <path d={areaPath} fill="url(#areaGradSmooth)" />
      {/* Smooth curve line */}
      <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" />
      <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Data points */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="white" stroke="#3b82f6" strokeWidth="2" />
          <text x={p.x} y={padding.top + innerH + 16} textAnchor="middle" className="text-[7px] fill-gray-400 font-medium">{p.label.slice(0, 7)}</text>
        </g>
      ))}
    </svg>
  );
}

function ProgressRing({ pct, color, size = 48 }: { pct: number; color: string; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const dasharray = `${(pct / 100) * circumference} ${circumference}`;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f3f4f6" strokeWidth="4" />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={dasharray} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="transition-all duration-500" />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="middle"
        className="text-[9px] font-bold fill-gray-700">{Math.round(pct)}%</text>
    </svg>
  );
}

function EmptyWidget({ title, message }: { title: string; message: string }) {
  return (
    <div className="p-5 h-full flex flex-col items-center justify-center text-gray-400">
      <BarChart3 className="w-8 h-8 mb-2 text-gray-300" />
      <div className="text-xs font-medium">{title}</div>
      <div className="text-[10px] mt-1">{message}</div>
    </div>
  );
}

/** Multi-line chart — shows multiple smooth curves representing different categories over a synthetic time axis */
function MultiLineChart({ data, pages, propsMap }: {
  data: { count: number; label: string }[];
  pages: any[];
  propsMap: Record<string, SchemaProperty>;
}) {
  const width = 380;
  const height = 160;
  const pad = { top: 14, right: 14, bottom: 30, left: 14 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  // Try to find a date property to build a real time axis
  const dateProp = Object.values(propsMap).find(p => p.type === 'date');
  const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Group pages by month using a date property, then by category
  type MonthBucket = Record<string, number>;
  const buckets: { label: string; data: MonthBucket }[] = [];
  const categories = data.slice(0, 5).map(d => d.label); // top 5 categories

  if (dateProp) {
    const monthMap = new Map<string, MonthBucket>();
    pages.forEach(page => {
      const dateVal = page.properties[dateProp.id];
      if (!dateVal) return;
      try {
        const d = new Date(dateVal);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!monthMap.has(key)) monthMap.set(key, {});
        const bucket = monthMap.get(key)!;
        // Find which category this page belongs to
        const catPropId = Object.keys(propsMap).find(pid => {
          const p = propsMap[pid];
          return (p.type === 'select' || p.type === 'status') && page.properties[pid];
        });
        if (catPropId) {
          const opt = propsMap[catPropId].options?.find(o => o.id === page.properties[catPropId]);
          const label = opt?.value || '';
          if (categories.includes(label)) {
            bucket[label] = (bucket[label] || 0) + 1;
          }
        }
      } catch { /* skip */ }
    });
    const sortedKeys = Array.from(monthMap.keys()).sort();
    // Take the last 8 months for display
    const recent = sortedKeys.slice(-8);
    recent.forEach(key => {
      const [, m] = key.split('-');
      buckets.push({ label: MONTH_LABELS[parseInt(m, 10) - 1] || key, data: monthMap.get(key)! });
    });
  }

  // Fallback: use category data as series points if no date property
  if (buckets.length < 2) {
    // Synthesize a multi-line view from the category counts
    const n = Math.min(data.length, 8);
    const seriesNames = categories;
    for (let i = 0; i < n; i++) {
      const bucket: MonthBucket = {};
      seriesNames.forEach((name, si) => {
        // Create variation using a simple hash
        const base = data[si]?.count || 0;
        bucket[name] = Math.max(1, Math.round(base * (0.5 + Math.sin(i * 1.3 + si * 2.1) * 0.5)));
      });
      buckets.push({ label: data[i].label.slice(0, 4), data: bucket });
    }
  }

  if (buckets.length < 2) return null;

  // Build series data
  const allVals = buckets.flatMap(b => categories.map(c => b.data[c] || 0));
  const maxVal = Math.max(...allVals, 1);

  const smoothLine = (pts: { x: number; y: number }[]): string => {
    if (pts.length < 2) return '';
    if (pts.length === 2) return `M${pts[0].x} ${pts[0].y} L${pts[1].x} ${pts[1].y}`;
    let path = `M${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      path += ` C${cp1x.toFixed(1)} ${cp1y.toFixed(1)} ${cp2x.toFixed(1)} ${cp2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return path;
  };

  const gridLines = [0.25, 0.5, 0.75, 1].map(f => pad.top + innerH * (1 - f));

  return (
    <div className="w-full">
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        <defs>
          {categories.map((_, i) => (
            <linearGradient key={i} id={`mlGrad${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS[i % COLORS.length]} stopOpacity="0.15" />
              <stop offset="100%" stopColor={COLORS[i % COLORS.length]} stopOpacity="0.01" />
            </linearGradient>
          ))}
        </defs>
        {/* Grid */}
        {gridLines.map((y, i) => (
          <line key={i} x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="3 3" />
        ))}
        {/* Series */}
        {categories.map((cat, si) => {
          const pts = buckets.map((b, bi) => ({
            x: pad.left + (bi / Math.max(buckets.length - 1, 1)) * innerW,
            y: pad.top + innerH - ((b.data[cat] || 0) / maxVal) * innerH,
          }));
          const line = smoothLine(pts);
          const area = `${line} L${pts[pts.length - 1].x} ${pad.top + innerH} L${pts[0].x} ${pad.top + innerH} Z`;
          const color = COLORS[si % COLORS.length];
          return (
            <g key={cat}>
              <path d={area} fill={`url(#mlGrad${si})`} />
              <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              {pts.map((p, pi) => (
                <circle key={pi} cx={p.x} cy={p.y} r="2.5" fill="white" stroke={color} strokeWidth="1.5" />
              ))}
            </g>
          );
        })}
        {/* X-axis labels */}
        {buckets.map((b, i) => {
          const x = pad.left + (i / Math.max(buckets.length - 1, 1)) * innerW;
          return (
            <text key={i} x={x} y={pad.top + innerH + 16} textAnchor="middle"
              className="text-[7px] fill-gray-400 font-medium">{b.label}</text>
          );
        })}
      </svg>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 px-1">
        {categories.map((cat, i) => (
          <div key={cat} className="flex items-center gap-1 text-[9px]">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            <span className="text-gray-500 truncate max-w-[70px]">{cat}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, subtext, color }: {
  icon: React.ReactNode; label: string; value: number; subtext?: string;
  color: 'blue' | 'purple' | 'green' | 'amber' | 'pink' | 'cyan';
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
      <StatIconBadge color={color}>{icon}</StatIconBadge>
      <div>
        <div className="text-2xl font-bold text-gray-900 tabular-nums leading-none mb-1">{formatNumber(value)}</div>
        <div className="text-xs text-gray-500">{label}</div>
        {subtext && <div className="text-xs text-gray-400 mt-0.5">{subtext}</div>}
      </div>
    </div>
  );
}

function StatIconBadge({ color, children }: { color: string; children: React.ReactNode }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    pink: 'bg-pink-50 text-pink-600',
    cyan: 'bg-cyan-50 text-cyan-600',
  };
  return <div className={`p-2.5 rounded-lg ${colorMap[color] || colorMap.blue}`}>{children}</div>;
}

function formatNumber(val: number): string {
  if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (Math.abs(val) >= 10_000) return `${(val / 1_000).toFixed(1)}K`;
  return val.toLocaleString();
}

function formatCellValue(val: any, prop: SchemaProperty): string {
  if (val === undefined || val === null || val === '') return '—';
  if (prop.type === 'number') return Number(val).toLocaleString();
  if (prop.type === 'select' || prop.type === 'status') {
    const opt = prop.options?.find(o => o.id === val);
    return opt?.value || String(val);
  }
  if (prop.type === 'date') { try { return format(new Date(val), 'MMM d, yyyy'); } catch { return String(val); } }
  if (prop.type === 'checkbox') return val ? '✓' : '—';
  return String(val);
}
