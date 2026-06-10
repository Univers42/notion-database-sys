/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   chartTypes.ts                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/10 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── chartTypes — contracts for the pure chart aggregation engine ───────────

import type { SchemaProperty, PropertyValue } from '../../types/database';

/** Aggregation functions supported by the chart engine. */
export type ChartAggregation = 'count' | 'sum' | 'average' | 'min' | 'max' | 'median';

/** X-axis ordering modes (Notion parity). */
export type ChartSortMode = 'ascending' | 'descending' | 'manual';

/** Concrete date bucket granularities. */
export type DateGranularity = 'day' | 'week' | 'month' | 'quarter' | 'year';

/** Date bucket setting — 'auto' picks a granularity from the data span. */
export type DateBucketSetting = 'auto' | DateGranularity;

/** Minimal page shape the engine needs (id + property bag). */
export interface ChartPageLike {
  id: string;
  properties: Record<string, PropertyValue>;
}

/** One resolved grouping key for a page (a page may yield several). */
export interface GroupKey {
  key: string;
  label: string;
  color: string;
}

/** Full input for a client-side chart computation. */
export interface ChartEngineInput {
  pages: readonly ChartPageLike[];
  xProp: SchemaProperty;
  /** Numeric property aggregated on the Y axis; undefined → count of items. */
  yProp?: SchemaProperty;
  aggregation: ChartAggregation;
  /** Breakdown property — produces stacked/multi-series output. */
  groupByProp?: SchemaProperty;
  sort?: ChartSortMode;
  dateBucket?: DateBucketSetting;
  omitZero?: boolean;
  cumulative?: boolean;
  hiddenGroups?: readonly string[];
  manualGroupOrder?: readonly string[];
  /** Optional label resolver for relation/person keys (page titles, names). */
  labelResolver?: (propId: string, key: string) => string | undefined;
}

/** Raw collected cell: numeric samples + contributing page ids. */
export interface ChartCell {
  nums: number[];
  pageIds: string[];
}

/** A category (x group) inside the pre-aggregated matrix. */
export interface MatrixCategory {
  key: string;
  label: string;
  color: string;
  values: Map<string, number>;
  pageIds: Map<string, string[]>;
}

/**
 * Pre-aggregated matrix — the shared entry point for both the client engine
 * and the server (BaaS op=aggregate) path, so sorting/caps/cumulative and
 * visibility behave identically regardless of where numbers were computed.
 */
export interface AggregatedMatrix {
  categories: Map<string, MatrixCategory>;
  seriesMeta: Map<string, { label: string; color: string }>;
  isDateAxis: boolean;
}

/** One renderable series (single 'value' series when no breakdown). */
export interface ChartSeriesDef {
  key: string;
  label: string;
  color: string;
}

/** One renderable x category with per-series values and drilldown ids. */
export interface ChartCategory {
  key: string;
  label: string;
  color: string;
  values: Record<string, number>;
  pageIds: Record<string, string[]>;
  total: number;
}

/** Final engine output consumed by chart components. */
export interface ChartResult {
  categories: ChartCategory[];
  series: ChartSeriesDef[];
  total: number;
  truncatedGroups: boolean;
  truncatedSeries: boolean;
}

/** Options for the assemble stage (subset of ChartEngineInput). */
export interface AssembleOptions {
  sort?: ChartSortMode;
  omitZero?: boolean;
  cumulative?: boolean;
  hiddenGroups?: readonly string[];
  manualGroupOrder?: readonly string[];
}

/** Notion parity caps: charts display at most 200 groups / 50 subgroups. */
export const MAX_GROUPS = 200;
export const MAX_SUBGROUPS = 50;

/** Key/label of the synthetic fold-in category/series beyond the caps. */
export const OVERFLOW_KEY = '__other__';
export const OVERFLOW_LABEL = 'Other';

/** Key for the unassigned ("No <prop>") group. */
export const NONE_KEY = '__none__';

/** Series key used when there is no breakdown property. */
export const VALUE_SERIES_KEY = 'value';

/** Property types whose values are dates (bucketable x axes). */
export const DATE_PROP_TYPES: readonly string[] = [
  'date', 'created_time', 'last_edited_time', 'due_date',
];

/** Empty result constant for missing/invalid configuration. */
export const EMPTY_CHART_RESULT: ChartResult = {
  categories: [],
  series: [],
  total: 0,
  truncatedGroups: false,
  truncatedSeries: false,
};
