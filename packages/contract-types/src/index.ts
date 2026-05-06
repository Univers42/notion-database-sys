/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   index.ts                                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/06 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 19:24:16 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/** Property type literals accepted by schema properties. */
export const PROPERTY_TYPES = [
  'title',
  'text',
  'number',
  'select',
  'multi_select',
  'status',
  'date',
  'checkbox',
  'person',
  'user',
  'url',
  'email',
  'phone',
  'files_media',
  'relation',
  'formula',
  'rollup',
  'button',
  'place',
  'id',
  'created_time',
  'last_edited_time',
  'created_by',
  'last_edited_by',
  'assigned_to',
  'due_date',
  'custom',
] as const;

/** Block type literals accepted by page content blocks. */
export const BLOCK_TYPES = [
  'paragraph',
  'heading_1',
  'heading_2',
  'heading_3',
  'heading_4',
  'heading_5',
  'heading_6',
  'bulleted_list',
  'numbered_list',
  'to_do',
  'toggle',
  'code',
  'quote',
  'callout',
  'divider',
  'image',
  'video',
  'audio',
  'file',
  'bookmark',
  'page',
  'link_to_page',
  'table_block',
  'column',
  'table_of_contents',
  'equation',
  'spacer',
  'embed',
  'breadcrumb',
  'synced_block',
  'table_view',
  'board_view',
  'gallery_view',
  'list_view',
  'database_inline',
  'database_full_page',
] as const;

/** View type literals accepted by database view configuration. */
export const VIEW_TYPES = [
  'table',
  'board',
  'calendar',
  'timeline',
  'gallery',
  'list',
  'chart',
  'feed',
  'map',
  'dashboard',
] as const;

/** Filter operator literals accepted by view filters. */
export const FILTER_OPERATORS = [
  'equals',
  'not_equals',
  'contains',
  'not_contains',
  'starts_with',
  'ends_with',
  'is_empty',
  'is_not_empty',
  'greater_than',
  'less_than',
  'greater_than_or_equal',
  'less_than_or_equal',
  'is_before',
  'is_after',
  'is_on_or_before',
  'is_on_or_after',
  'is_between',
  'is_relative_to_today',
  'is_checked',
  'is_not_checked',
] as const;

/** Heterogeneous property value stored in page properties. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PropertyValue = any;

/** Property types understood by the ObjectDatabase contract. */
export type PropertyType = typeof PROPERTY_TYPES[number];

/** Block types understood by the ObjectDatabase contract. */
export type BlockType = typeof BLOCK_TYPES[number];

/** View types understood by the ObjectDatabase contract. */
export type ViewType = typeof VIEW_TYPES[number];

/** Filter operators understood by view filter configuration. */
export type FilterOperator = typeof FILTER_OPERATORS[number];

/** Groups select options under a labeled status category. */
export interface StatusGroup {
  id: string;
  label: string;
  color: string;
  optionIds: string[];
}

/** Metadata for a file attached to a page property. */
export interface FileAttachment {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'pdf' | 'doc' | 'other';
  size?: number;
}

/** Button property behavior configuration. */
export interface ButtonConfig {
  label: string;
  action: 'open_url' | 'copy' | 'notify';
  url?: string;
}

/** Geographic place value for place properties. */
export interface PlaceValue {
  address: string;
  lat?: number;
  lng?: number;
}

/** Formula property expression configuration. */
export interface FormulaConfig {
  expression: string;
}

/** Rollup aggregation function literals. */
export type RollupFunction =
  | 'show_original'
  | 'show_unique'
  | 'count_all'
  | 'count_values'
  | 'count_unique_values'
  | 'count_empty'
  | 'count_not_empty'
  | 'percent_empty'
  | 'percent_not_empty'
  | 'sum'
  | 'average'
  | 'median'
  | 'min'
  | 'max'
  | 'range'
  | 'count';

/** Rollup display mode literals. */
export type RollupDisplayAs = 'number' | 'bar' | 'ring';

/** Configuration for a rollup property. */
export interface RollupConfig {
  relationPropertyId: string;
  targetPropertyId: string;
  function: RollupFunction;
  displayAs?: RollupDisplayAs;
}

/** Configuration for a relation property linking two databases. */
export interface RelationConfig {
  databaseId: string;
  type: 'one_way' | 'two_way';
  reversePropertyId?: string;
  limit?: number;
}

/** Configuration for a custom field type. */
export interface CustomFieldConfig {
  dataType: 'string' | 'integer' | 'float' | 'boolean' | 'timestamp' | 'json';
  defaultValue?: unknown;
  precision?: number;
  maxLength?: number;
}

/** Option metadata for select-like properties. */
export interface SelectOption {
  id: string;
  value: string;
  color: string;
}

/** Schema property definition persisted and sent over the contract. */
export interface SchemaProperty {
  id: string;
  name: string;
  type: PropertyType;
  icon?: string;
  options?: SelectOption[];
  statusGroups?: StatusGroup[];
  formulaConfig?: FormulaConfig;
  rollupConfig?: RollupConfig;
  relationConfig?: RelationConfig;
  buttonConfig?: ButtonConfig;
  customConfig?: CustomFieldConfig;
  prefix?: string;
  autoIncrement?: number;
}

/** Database schema definition returned by loadState. */
export interface DatabaseSchema {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  properties: Record<string, SchemaProperty>;
  titlePropertyId: string;
}

/** Rich content block embedded inside a page. */
export interface Block {
  id: string;
  type: BlockType;
  content: string;
  children?: Block[];
  checked?: boolean;
  language?: string;
  color?: string;
  url?: string;
  caption?: string;
  collapsed?: boolean;
  embedType?: string;
  tableData?: string[][];
  databaseId?: string;
  viewId?: string;
  columns?: Block[][];
  columnRatios?: number[];
  spacerHeight?: number;
  expression?: string;
  syncedBlockId?: string;
}

/** Page document returned and mutated through the contract. */
export interface Page {
  id: string;
  databaseId: string;
  icon?: string;
  cover?: string;
  properties: Record<string, PropertyValue>;
  content: Block[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastEditedBy: string;
  archived?: boolean;
  parentPageId?: string;
}

/** Represents a single filter condition on a property. */
export interface Filter {
  id: string;
  propertyId: string;
  operator: FilterOperator;
  value: unknown;
}

/** Sort configuration for a database view. */
export interface Sort {
  id: string;
  propertyId: string;
  direction: 'asc' | 'desc';
}

/** Grouping configuration for a database view. */
export interface Grouping {
  propertyId: string;
  hiddenGroups?: string[];
  sort?: 'alphabetical' | 'manual';
}

/** Sub-grouping configuration for a database view. */
export interface SubGrouping {
  propertyId: string;
}

/** Dashboard widget configuration for dashboard views. */
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

/** View display and behavior settings. */
export interface ViewSettings {
  icon?: string;
  showTitle?: boolean;
  showPageIcon?: boolean;
  wrapContent?: boolean;
  loadLimit?: number;
  openPagesIn?: 'side_peek' | 'center_peek' | 'full_page';
  showVerticalLines?: boolean;
  showRowNumbers?: boolean;
  columnWidths?: Record<string, number>;
  columnOrder?: string[];
  colorColumns?: boolean;
  cardPreview?: 'none' | 'page_cover' | 'page_properties' | 'page_content';
  cardSize?: 'small' | 'medium' | 'large' | 'xl';
  cardLayout?: 'compact' | 'list';
  wrapPageTitles?: boolean;
  showCalendarBy?: string;
  showCalendarAs?: 'month' | 'week';
  showWeekends?: boolean;
  showTimelineBy?: string;
  timelineEndBy?: string;
  separateStartEndDates?: boolean;
  showTable?: boolean;
  zoomLevel?: 'day' | 'week' | 'month';
  fitMedia?: boolean;
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
  wrapProperties?: boolean;
  showAuthorByline?: boolean;
  mapBy?: string;
  widgets?: DashboardWidget[];
  formulaAnalytics?: boolean;
  relationAnalytics?: boolean;
}

/** Complete configuration for a database view. */
export interface ViewConfig {
  id: string;
  databaseId: string;
  name: string;
  type: ViewType;
  filters: Filter[];
  filterConjunction: 'and' | 'or';
  sorts: Sort[];
  grouping?: Grouping;
  subGrouping?: SubGrouping;
  visibleProperties: string[];
  settings: ViewSettings;
}

/** Serializable application state returned by loadState. */
export interface NotionState {
  databases: Record<string, DatabaseSchema>;
  pages: Record<string, Page>;
  views: Record<string, ViewConfig>;
}

/** Portable document filter operators accepted by findPages. */
export type DocFilter = {
  [propertyId: string]: {
    eq?: unknown;
    neq?: unknown;
    in?: unknown[];
    nin?: unknown[];
    contains?: unknown;
    gt?: unknown;
    gte?: unknown;
    lt?: unknown;
    lte?: unknown;
    exists?: boolean;
  };
};

/** Query body accepted by findPages. */
export interface PageQuery {
  databaseId?: string;
  filter?: DocFilter;
  sort?: { propertyId: string; direction: 'asc' | 'desc' }[];
  limit?: number;
}

/** Realtime change event emitted by adapters and streamed over SSE. */
export type ChangeEvent =
  | { type: 'page-changed'; pageId: string; changes: Partial<Page['properties']>; databaseId?: string }
  | { type: 'page-inserted'; page: Page }
  | { type: 'page-deleted'; pageId: string; databaseId?: string }
  | { type: 'schema-changed'; databaseId: string }
  | { type: 'state-replaced' };

/** Document-shaped persistence contract for ObjectDatabase hosts. */
export interface ObjectDatabaseAdapter {
  loadState(): Promise<NotionState>;
  findPages(query: PageQuery): Promise<Page[]>;
  getPage(id: string): Promise<Page | null>;
  insertPage(databaseId: string, page: Omit<Page, 'id'>): Promise<Page>;
  patchPage(id: string, changes: Partial<Page['properties']>): Promise<Page>;
  deletePage(id: string): Promise<void>;
  addProperty(databaseId: string, prop: SchemaProperty): Promise<void>;
  removeProperty(databaseId: string, propertyId: string): Promise<void>;
  changePropertyType(databaseId: string, propertyId: string, newType: PropertyType): Promise<void>;
  subscribe?(callback: (event: ChangeEvent) => void): () => void;
}

/** Error thrown when an adapter receives or synthesizes an HTTP failure. */
export class AdapterError extends Error {
  /** Creates an adapter error with HTTP metadata for debuggers and hosts. */
  constructor(
    message: string,
    public readonly status: number,
    public readonly path: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'AdapterError';
  }
}
