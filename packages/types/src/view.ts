/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   view.ts                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 15:07:48 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 22:31:03 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { Timestamps } from './common.js';
import type { FilterNode, Filter, Sort, Grouping, SubGrouping } from './filter.js';

export type ViewType =
  | 'table'
  | 'board'
  | 'calendar'
  | 'timeline'
  | 'gallery'
  | 'list'
  | 'chart'
  | 'feed'
  | 'map'
  | 'dashboard';
export interface DashboardWidget {
  id: string;
  type: 'stat' | 'chart' | 'table' | 'list';
  title: string;
  propertyId?: string;
  aggregation?: 'count' | 'sum' | 'average' | 'min' | 'max';
  chartStyle?: 'bar' | 'donut' | 'horizontal_bar' | 'stacked_bar' | 'area' | 'progress' | 'number_grid' | 'multi_line';
  width: 1 | 2 | 3 | 4;
  height: 1 | 2;
}

export interface ViewSettings {
  icon?: string;
  showTitle?: boolean;
  showPageIcon?: boolean;
  wrapContent?: boolean;
  loadLimit?: number;
  openPagesIn?: 'side_peek' | 'center_peek' | 'full_page';

  // Table
  showVerticalLines?: boolean;
  showRowNumbers?: boolean;
  columnWidths?: Record<string, number>;
  columnOrder?: string[];

  // Board
  colorColumns?: boolean;
  cardPreview?: 'none' | 'page_cover' | 'page_properties' | 'page_content';
  cardSize?: 'small' | 'medium' | 'large' | 'xl';
  cardLayout?: 'compact' | 'list';

  // Calendar
  wrapPageTitles?: boolean;
  showCalendarBy?: string;
  showCalendarAs?: 'month' | 'week';
  showWeekends?: boolean;

  // Timeline
  showTimelineBy?: string;
  timelineEndBy?: string;
  separateStartEndDates?: boolean;
  showTable?: boolean;
  zoomLevel?: 'day' | 'week' | 'month';

  // Gallery
  fitMedia?: boolean;

  // Chart
  chartType?: 'vertical_bar' | 'horizontal_bar' | 'line' | 'donut' | 'pie' | 'number';
  xAxisProperty?: string;
  xAxisSort?: 'ascending' | 'descending' | 'manual';
  xAxisOmitZero?: boolean;
  xAxisTitle?: string;
  yAxisProperty?: string;
  yAxisAggregation?: 'count' | 'sum' | 'average';
  yAxisGroupBy?: string;
  yAxisRange?: 'auto' | '0-100' | '0-1000' | 'custom';
  yAxisTitle?: string;
  yAxisCumulative?: boolean;
  showReferenceLine?: boolean;
  referenceLineValue?: number | null;
  colorPalette?: string;
  showLegend?: boolean;
  showGridLines?: boolean;
  showDataLabels?: boolean;
  roundedBars?: boolean;
  smoothLine?: boolean;
  showDataSourceTitle?: boolean;
  viewIcon?: string;
  calendarMode?: string;

  // Feed
  wrapProperties?: boolean;
  showAuthorByline?: boolean;

  // Map
  mapBy?: string;

  // Dashboard
  widgets?: DashboardWidget[];
  formulaAnalytics?: boolean;
  relationAnalytics?: boolean;
}

export interface FieldConfig {
  propertyId: string;
  visible: boolean;
  width?: number;
  order: number;
}

export interface ViewConfig extends Timestamps {
  _id: string;
  databaseId: string;
  workspaceId: string;
  createdBy: string;
  name: string;
  type: ViewType;

  /** AST-based filter tree — new canonical filter format */
  filterTree?: FilterNode;
  /** Legacy flat filters — kept for backward compatibility */
  filters: Filter[];
  filterConjunction: 'and' | 'or';

  sorts: Sort[];
  grouping?: Grouping;
  subGrouping?: SubGrouping;
  visibleProperties: string[];
  fieldConfigs?: FieldConfig[];
  settings: ViewSettings;
}

export interface UserViewOverride extends Timestamps {
  _id: string;
  viewId: string;
  userId: string;
  workspaceId: string;

  /** Only the fields the user has customized — merged on top of base view */
  overrides: {
    filterTree?: FilterNode;
    filters?: Filter[];
    filterConjunction?: 'and' | 'or';
    sorts?: Sort[];
    grouping?: Grouping;
    subGrouping?: SubGrouping;
    visibleProperties?: string[];
    fieldConfigs?: FieldConfig[];
    settings?: Partial<ViewSettings>;
  };
}
