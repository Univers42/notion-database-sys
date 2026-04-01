import React, { useMemo } from 'react';
import { useDatabaseStore } from '../../store/useDatabaseStore';
import { useActiveViewId } from '../../hooks/useDatabaseScope';
import { BarChart3 } from 'lucide-react';

type ChartType = 'vertical_bar' | 'horizontal_bar' | 'line' | 'donut' | 'pie' | 'number';

const CHART_COLORS = [
  'var(--color-chart-1)', 'var(--color-chart-2)', 'var(--color-chart-3)', 'var(--color-chart-4)', 'var(--color-chart-5)',
  'var(--color-chart-6)', 'var(--color-chart-7)', 'var(--color-chart-8)', 'var(--color-chart-9)', 'var(--color-chart-10)',
];

export function ChartView() {
  const activeViewId = useActiveViewId();
  const { views, databases, getPagesForView } = useDatabaseStore();
  const view = activeViewId ? views[activeViewId] : null;
  const database = view ? databases[view.databaseId] : null;

  const settings = view?.settings || {};
  const chartType: ChartType = (settings.chartType as ChartType) || 'vertical_bar';
  const xAxisProperty = settings.xAxisProperty;
  const yAxisProperty = settings.yAxisProperty;
  const yAxisAggregation = settings.yAxisAggregation || 'count';

  const pages = view ? getPagesForView(view.id) : [];

  // Compute chart data
  const chartData = useMemo(() => {
    if (!database || !xAxisProperty) return [];

    const xProp = database.properties[xAxisProperty];
    if (!xProp) return [];

    // Group pages by x-axis value
    const grouped: Record<string, { label: string; values: number[]; color: string }> = {};

    pages.forEach(page => {
      const xVal = page.properties[xAxisProperty];
      let label: string;
      let colorClass = '';

      if (xProp.type === 'select') {
        const opt = xProp.options?.find(o => o.id === xVal);
        label = opt?.value || 'None';
        colorClass = opt?.color || '';
      } else if (xProp.type === 'checkbox') {
        label = xVal ? 'Checked' : 'Unchecked';
      } else {
        label = xVal != null ? String(xVal) : 'None';
      }

      if (!grouped[label]) {
        grouped[label] = { label, values: [], color: colorClass };
      }

      if (yAxisProperty && database.properties[yAxisProperty]) {
        const yVal = page.properties[yAxisProperty];
        if (typeof yVal === 'number') {
          grouped[label].values.push(yVal);
        } else if (typeof yVal === 'string' && !isNaN(Number(yVal))) {
          grouped[label].values.push(Number(yVal));
        }
      }
      grouped[label].values.push(1); // always push 1 for count
    });

    return Object.entries(grouped).map(([label, data], i) => {
      let value: number;
      if (yAxisAggregation === 'count') {
        value = data.values.length / (yAxisProperty ? 2 : 1); // count pages
      } else {
        const nums = yAxisProperty ? data.values.filter((_, idx) => idx % 2 === 0) : data.values;
        if (yAxisAggregation === 'sum') value = nums.reduce((s, n) => s + n, 0);
        else if (yAxisAggregation === 'average') value = nums.length ? nums.reduce((s, n) => s + n, 0) / nums.length : 0;
        else value = nums.length;
      }

      return { label, value, color: CHART_COLORS[i % CHART_COLORS.length] };
    }).sort((a, b) => b.value - a.value);
  }, [pages, database, xAxisProperty, yAxisProperty, yAxisAggregation]);

  if (!view || !database) return null;

  if (!xAxisProperty) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-surface-primary">
        <div className="text-center text-ink-muted max-w-sm">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 text-ink-disabled" />
          <p className="font-medium mb-1">Configure your chart</p>
          <p className="text-sm">Open view settings to select an X-axis property for charting.</p>
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...chartData.map(d => d.value), 1);
  const total = chartData.reduce((s, d) => s + d.value, 0);

  // Number chart type
  if (chartType === 'number') {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-surface-primary">
        <div className="text-center">
          <div className="text-6xl font-bold text-ink tabular-nums">{total.toLocaleString()}</div>
          <div className="text-sm text-ink-secondary mt-2">Total {yAxisAggregation} &middot; {pages.length} records</div>
        </div>
      </div>
    );
  }

  // Vertical bar chart
  if (chartType === 'vertical_bar') {
    const barWidth = Math.max(24, Math.min(64, 600 / chartData.length));
    const chartWidth = Math.max(600, chartData.length * (barWidth + 16));
    const chartHeight = 300;

    return (
      <div className="flex-1 overflow-auto p-8 bg-surface-primary">
        <div className="flex flex-col items-center">
          <svg width={chartWidth} height={chartHeight + 60} className="overflow-visible">
            {/* Y-axis grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map(pct => (
              <g key={pct}>
                <line x1={40} y1={chartHeight * (1 - pct) + 10} x2={chartWidth - 20} y2={chartHeight * (1 - pct) + 10}
                  stroke="var(--color-chart-grid)" strokeWidth={1} />
                <text x={36} y={chartHeight * (1 - pct) + 14} textAnchor="end" fontSize={11} fill="var(--color-chart-tick)">
                  {Math.round(maxValue * pct)}
                </text>
              </g>
            ))}

            {/* Bars */}
            {chartData.map((d, i) => {
              const barHeight = (d.value / maxValue) * chartHeight;
              const x = 50 + i * (barWidth + 16);
              const y = chartHeight - barHeight + 10;

              return (
                <g key={d.label}>
                  <rect x={x} y={y} width={barWidth} height={barHeight}
                    fill={d.color} rx={4} className="transition-all duration-200 hover:opacity-80" />
                  <text x={x + barWidth / 2} y={chartHeight + 28}
                    textAnchor="middle" fontSize={11} fill="var(--color-chart-label)" className="select-none">
                    {d.label.length > 10 ? d.label.slice(0, 10) + '…' : d.label}
                  </text>
                  <text x={x + barWidth / 2} y={y - 6}
                    textAnchor="middle" fontSize={11} fill="var(--color-chart-axis)" fontWeight={600}>
                    {d.value % 1 === 0 ? d.value : d.value.toFixed(1)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  }

  // Horizontal bar chart
  if (chartType === 'horizontal_bar') {
    const barHeight = 28;
    const chartWidth = 500;
    const labelWidth = 120;

    return (
      <div className="flex-1 overflow-auto p-8 bg-surface-primary">
        <div className="max-w-2xl mx-auto">
          <svg width={chartWidth + labelWidth + 60} height={chartData.length * (barHeight + 8) + 20}>
            {chartData.map((d, i) => {
              const barW = (d.value / maxValue) * chartWidth;
              const y = i * (barHeight + 8) + 10;

              return (
                <g key={d.label}>
                  <text x={labelWidth - 8} y={y + barHeight / 2 + 4}
                    textAnchor="end" fontSize={12} fill="var(--color-chart-axis)">
                    {d.label.length > 16 ? d.label.slice(0, 16) + '…' : d.label}
                  </text>
                  <rect x={labelWidth} y={y} width={barW} height={barHeight}
                    fill={d.color} rx={4} className="transition-all duration-200 hover:opacity-80" />
                  <text x={labelWidth + barW + 8} y={y + barHeight / 2 + 4}
                    fontSize={12} fill="var(--color-chart-axis)" fontWeight={600}>
                    {d.value % 1 === 0 ? d.value : d.value.toFixed(1)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  }

  // Line chart
  if (chartType === 'line') {
    const chartWidth = Math.max(600, chartData.length * 80);
    const chartHeight = 300;
    const padding = { top: 20, right: 20, bottom: 50, left: 50 };
    const innerW = chartWidth - padding.left - padding.right;
    const innerH = chartHeight - padding.top - padding.bottom;

    const points = chartData.map((d, i) => ({
      x: padding.left + (i / (chartData.length - 1 || 1)) * innerW,
      y: padding.top + innerH - (d.value / maxValue) * innerH,
      ...d,
    }));

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaD = pathD + ` L ${points[points.length - 1]?.x || 0} ${padding.top + innerH} L ${points[0]?.x || 0} ${padding.top + innerH} Z`;

    return (
      <div className="flex-1 overflow-auto p-8 bg-surface-primary">
        <div className="flex flex-col items-center">
          <svg width={chartWidth} height={chartHeight}>
            <defs>
              <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.2} />
                <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
              </linearGradient>
            </defs>
            {/* Grid */}
            {[0, 0.25, 0.5, 0.75, 1].map(pct => (
              <g key={pct}>
                <line x1={padding.left} y1={padding.top + innerH * (1 - pct)}
                  x2={padding.left + innerW} y2={padding.top + innerH * (1 - pct)}
                  stroke="var(--color-chart-grid)" strokeWidth={1} />
                <text x={padding.left - 8} y={padding.top + innerH * (1 - pct) + 4}
                  textAnchor="end" fontSize={11} fill="var(--color-chart-tick)">
                  {Math.round(maxValue * pct)}
                </text>
              </g>
            ))}
            {/* Area fill */}
            {points.length > 1 && <path d={areaD} fill="url(#lineGrad)" />}
            {/* Line */}
            {points.length > 1 && <path d={pathD} fill="none" stroke="var(--color-chart-1)" strokeWidth={2.5} />}
            {/* Points */}
            {points.map((p, i) => (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r={4} fill="var(--color-chart-1)" stroke="white" strokeWidth={2} />
                <text x={p.x} y={padding.top + innerH + 20} textAnchor="middle" fontSize={11} fill="var(--color-chart-label)">
                  {p.label.length > 8 ? p.label.slice(0, 8) + '…' : p.label}
                </text>
                <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize={11} fill="var(--color-chart-axis)" fontWeight={600}>
                  {p.value % 1 === 0 ? p.value : p.value.toFixed(1)}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    );
  }

  // Donut / Pie chart
  if (chartType === 'donut' || chartType === 'pie') {
    const isDonut = chartType === 'donut';
    const size = 300;
    const cx = size / 2;
    const cy = size / 2;
    const outerR = size / 2 - 10;
    const innerR = isDonut ? outerR * 0.55 : 0;

    let startAngle = -Math.PI / 2;
    const slices = chartData.map(d => {
      const angle = (d.value / total) * Math.PI * 2;
      const slice = { ...d, startAngle, endAngle: startAngle + angle };
      startAngle += angle;
      return slice;
    });

    const arcPath = (_start: number, end: number, r: number) => {
      const x2 = cx + r * Math.cos(end);
      const y2 = cy + r * Math.sin(end);
      const large = end - _start > Math.PI ? 1 : 0;
      return `A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
    };

    return (
      <div className="flex-1 overflow-auto p-8 bg-surface-primary">
        <div className="flex items-center justify-center gap-12">
          <svg width={size} height={size}>
            {slices.map((slice, i) => {
              const sx = cx + outerR * Math.cos(slice.startAngle);
              const sy = cy + outerR * Math.sin(slice.startAngle);
              const outerArc = arcPath(slice.startAngle, slice.endAngle, outerR);

              let d: string;
              if (innerR > 0) {
                const ix = cx + innerR * Math.cos(slice.endAngle);
                const iy = cy + innerR * Math.sin(slice.endAngle);
                const innerArc = arcPath(slice.endAngle, slice.startAngle, innerR);
                d = `M ${sx} ${sy} ${outerArc} L ${ix} ${iy} ${innerArc} L ${sx} ${sy} Z`;
              } else {
                d = `M ${cx} ${cy} L ${sx} ${sy} ${outerArc} Z`;
              }

              return (
                <path key={i} d={d} fill={slice.color} stroke="white" strokeWidth={2}
                  className="transition-all duration-200 hover:opacity-80 cursor-pointer" />
              );
            })}
            {isDonut && (
              <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={24} fontWeight={700} fill="var(--color-chart-axis)">
                {total}
              </text>
            )}
          </svg>

          {/* Legend */}
          <div className="flex flex-col gap-2">
            {chartData.map((d, i) => (
              <div key={d.label} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: d.color }} />
                <span className="text-sm text-ink-body">{d.label}</span>
                <span className="text-sm text-ink-muted tabular-nums ml-1">{d.value}</span>
                <span className="text-xs text-ink-muted">({Math.round((d.value / total) * 100)}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
