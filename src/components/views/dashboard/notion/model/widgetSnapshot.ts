// ─── widgetSnapshot — what a dashboard widget shows, as plain text ───────────
// The host's "Ask AI" quotes it into its assistant's composer, where the user
// reads and edits it before anything is sent. Only what the widget already
// shows the viewer goes in: a chart's drawn groups, a records list's rows and
// its one shown value, or an embedded view's records and visible properties.
// Values that are ids (people, relations, files) are left out: they say
// nothing to a reader, and a person's id is not the widget's content.

import type {
  DashboardViewWidget, Page, SchemaProperty, ViewConfig, ViewSettings,
} from '../../../../../types/database';
import { EMPTY_CHART_RESULT, type ChartResult } from '../../../../../lib/chart/chartTypes';
import { formatCellValue } from '../../../../../utils/format';
import { sortRecords } from './widgetEntries';

/** Records quoted at most; the host caps the size of the quote as well. */
export const SNAPSHOT_MAX_RECORDS = 25;
/** Properties quoted per record at most, besides its title. */
export const SNAPSHOT_MAX_PROPERTIES = 5;
/** Characters of one value at most. */
const MAX_VALUE_CHARS = 120;

const ID_VALUED: ReadonlySet<SchemaProperty['type']> = new Set([
  'person', 'user', 'assigned_to', 'created_by', 'last_edited_by', 'relation', 'files_media', 'button', 'custom',
]);

function oneLine(text: string, max: number): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

/** A cell as words, or null when it is empty or holds ids. */
export function snapshotValue(raw: unknown, property: SchemaProperty): string | null {
  if (ID_VALUED.has(property.type)) return null;
  // Words, not the cell's ✓/— marks: an unchecked box is information too.
  if (property.type === 'checkbox') return raw ? 'yes' : 'no';
  if (property.type === 'multi_select') {
    if (!Array.isArray(raw) || raw.length === 0) return null;
    const labels = raw.map(id => property.options?.find(option => option.id === id)?.value ?? String(id));
    return oneLine(labels.join(', '), MAX_VALUE_CHARS);
  }
  if (raw !== null && typeof raw === 'object') return null;
  const text = formatCellValue(raw, property);
  return text === '—' ? null : oneLine(text, MAX_VALUE_CHARS) || null;
}

export interface SnapshotInput<R> {
  /** The view's visible property ids, in their order. */
  visibleProperties: readonly string[];
  properties: Readonly<Record<string, SchemaProperty>>;
  /** The view's records as the widget shows them (view and dashboard filters applied). */
  records: readonly R[];
  /** The records behind them, when the widget shows only the first ones. */
  total?: number;
  titleOf: (record: R) => string;
  valueOf: (record: R, propertyId: string) => unknown;
}

/** One line per item up to the cap, then how many were left out. */
function cappedLines<T>(items: readonly T[], line: (item: T) => string): string[] {
  const lines = items.slice(0, SNAPSHOT_MAX_RECORDS).map(line);
  if (items.length > SNAPSHOT_MAX_RECORDS) lines.push(`… and ${(items.length - SNAPSHOT_MAX_RECORDS).toLocaleString()} more`);
  return lines;
}

/** The record count, then one line per record: its title and its visible values. */
export function widgetSnapshot<R>({ visibleProperties, properties, records, total = records.length, titleOf, valueOf }: SnapshotInput<R>): string {
  const shown = visibleProperties
    .map(id => properties[id])
    // Ids are dropped BEFORE the cap, so they take no room from the words.
    .filter((property): property is SchemaProperty => Boolean(property) && property.type !== 'title' && !ID_VALUED.has(property.type))
    .slice(0, SNAPSHOT_MAX_PROPERTIES);
  const noun = total === 1 ? 'record' : 'records';
  const head = total > records.length
    ? `${records.length.toLocaleString()} of ${total.toLocaleString()} ${noun}`
    : `${total.toLocaleString()} ${noun}`;
  return [head, ...cappedLines(records, record => {
    const cells = shown.flatMap(property => {
      const text = snapshotValue(valueOf(record, property.id), property);
      return text ? [`${property.name}: ${text}`] : [];
    });
    const title = oneLine(titleOf(record), MAX_VALUE_CHARS) || 'Untitled';
    return cells.length > 0 ? `- ${title} — ${cells.join('; ')}` : `- ${title}`;
  })].join('\n');
}

const AGGREGATION_WORDS: Record<NonNullable<ViewSettings['yAxisAggregation']>, string> = {
  count: 'Count', sum: 'Sum', average: 'Average', min: 'Minimum', max: 'Maximum', median: 'Median',
};

type ChartAxes = Pick<ViewSettings, 'xAxisProperty' | 'yAxisProperty' | 'yAxisAggregation' | 'yAxisGroupBy' | 'yAxisCumulative'>;

/** What a chart measures, from its settings: the value over the groups. */
export function chartMeasure(axes: ChartAxes, properties: Readonly<Record<string, SchemaProperty>>): string {
  const y = axes.yAxisProperty ? properties[axes.yAxisProperty] : undefined;
  // useChartData's rule: no y property counts records, a y property sums by default.
  const value = y ? `${AGGREGATION_WORDS[axes.yAxisAggregation ?? 'sum']} of ${y.name}` : 'Count of records';
  const x = properties[axes.xAxisProperty ?? '']?.name ?? 'group';
  const split = axes.yAxisGroupBy ? properties[axes.yAxisGroupBy]?.name : undefined;
  return `${value} by ${x}${split ? `, split by ${split}` : ''}${axes.yAxisCumulative ? ', running total' : ''}`;
}

function amount(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/** A chart as it is drawn: what it measures, then one line per group, split per series when there are several. */
export function chartSnapshot(result: ChartResult, measure: string): string {
  if (result.categories.length === 0) return `${measure}\nNo data`;
  const split = result.series.length > 1;
  return [measure, ...cappedLines(result.categories, category => {
    const parts = split
      ? result.series.flatMap(series => (category.values[series.key] ? [`${series.label} ${amount(category.values[series.key])}`] : []))
      : [];
    const label = oneLine(category.label, MAX_VALUE_CHARS) || 'Empty';
    return `- ${label}: ${amount(category.total)}${parts.length > 0 ? ` (${parts.join(', ')})` : ''}`;
  })].join('\n');
}

export interface WidgetQuoteInput {
  widget: Pick<DashboardViewWidget, 'chart' | 'records'>;
  view: Pick<ViewConfig, 'visibleProperties' | 'settings'>;
  properties: Readonly<Record<string, SchemaProperty>>;
  /** The view's records, view and dashboard filters applied. */
  pages: readonly Page[];
  /** What the widget's chart drew; null before it drew. */
  chartResult: ChartResult | null;
  titleOf: (page: Page) => string;
  valueOf: (page: Page, propertyId: string) => unknown;
}

/** The quote of a widget, built from what its body draws: a chart's groups,
 *  a records list's sorted first rows, else the embedded view's records. */
export function widgetQuote({ widget, view, properties, pages, chartResult, titleOf, valueOf }: WidgetQuoteInput): string {
  if (widget.chart) {
    return chartSnapshot(chartResult ?? EMPTY_CHART_RESULT, chartMeasure({ ...view.settings, ...widget.chart }, properties));
  }
  if (widget.records) {
    const { showPropertyId } = widget.records;
    return widgetSnapshot({
      visibleProperties: showPropertyId ? [showPropertyId] : [],
      properties,
      records: sortRecords(pages, widget.records, valueOf),
      total: pages.length,
      titleOf,
      valueOf,
    });
  }
  return widgetSnapshot({ visibleProperties: view.visibleProperties, properties, records: pages, titleOf, valueOf });
}
