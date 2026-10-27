/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   widgetEntries.ts                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/10/27 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/10/27 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { DashboardChartConfig, DashboardRecordsConfig, Page, SchemaProperty } from '../../../../../types/database';
import { compareValues } from '../../../../../lib/filter/compareValues';
import { numberProperties } from './dashboardViewOps';

type Properties = Record<string, SchemaProperty> | readonly SchemaProperty[];

const DATE_TYPES: ReadonlySet<string> = new Set(['date', 'created_time', 'last_edited_time']);
const CHART_TYPES: ReadonlySet<string> = new Set(['select', 'status', ...DATE_TYPES]);
const RECORDS_LIMIT = 10;

export interface ChartEntry { label: string; chart: DashboardChartConfig; }
export interface RecordsEntry { label: string; records: DashboardRecordsConfig; }

/** Every Chart presentation a database's columns allow, for the picker and the widget menu. */
export function chartEntries(properties: Properties): ChartEntry[] {
  return Object.values(properties).filter(p => CHART_TYPES.has(p.type)).map(prop => ({
    label: `Chart · ${prop.name}`,
    chart: { chartType: 'vertical_bar', xAxisProperty: prop.id, yAxisAggregation: 'count' } as DashboardChartConfig,
  }));
}

/** Every Records presentation a database's columns allow, for the picker and the widget menu. */
export function recordEntries(properties: Properties): RecordsEntry[] {
  const all = Object.values(properties);
  const sortedBy = (prop: SchemaProperty, direction: 'asc' | 'desc'): DashboardRecordsConfig =>
    ({ sortPropertyId: prop.id, direction, limit: RECORDS_LIMIT, showPropertyId: prop.id });
  return [
    { label: 'Recently edited', records: { direction: 'desc', limit: RECORDS_LIMIT } },
    ...numberProperties(all).map(prop => ({ label: `Top by ${prop.name}`, records: sortedBy(prop, 'desc') })),
    ...all.filter(p => DATE_TYPES.has(p.type)).flatMap(prop => [
      { label: `Earliest ${prop.name}`, records: sortedBy(prop, 'asc') },
      { label: `Latest ${prop.name}`, records: sortedBy(prop, 'desc') },
    ]),
  ];
}

/** The rows a Records widget lists. Rows without the sort value go last in both
 *  directions, so "Earliest Due" starts with the next due date, not the undated. */
export function sortRecords(pages: readonly Page[], records: DashboardRecordsConfig,
  readValue: (page: Page, propertyId: string) => unknown): Page[] {
  const { sortPropertyId, direction } = records;
  return [...pages].sort((a, b) => (sortPropertyId
    ? compareValues(readValue(a, sortPropertyId), readValue(b, sortPropertyId), direction)
    : compareValues(a.updatedAt, b.updatedAt, direction))).slice(0, records.limit);
}
