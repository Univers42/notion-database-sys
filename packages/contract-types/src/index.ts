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
  /** Legacy single action — superseded by `actions` when present. */
  action: 'open_url' | 'copy' | 'notify';
  url?: string;
  /** Notion-parity action list run on click (edit property, add page,
   *  open URL, notify, webhook). */
  actions?: AutomationAction[];
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
  nullable?: boolean;
  options?: SelectOption[];
  statusGroups?: StatusGroup[];
  formulaConfig?: FormulaConfig;
  rollupConfig?: RollupConfig;
  relationConfig?: RelationConfig;
  buttonConfig?: ButtonConfig;
  customConfig?: CustomFieldConfig;
  prefix?: string;
  autoIncrement?: number;
  /** Date properties: the paired END property forming an interval with this
   *  START. Values stay two plain ISO date columns (data-plane friendly: maps
   *  to `daterange(start, end, '[]')` in Postgres); the table cell renders the
   *  pair as "start → end" and the timeline drags write both. */
  endPropertyId?: string;
  /** Date properties: display + behavior settings from the date panel. Values
   *  stay ISO strings; these only govern how they render and remind. */
  dateFormat?: string;
  dateIncludeTime?: boolean;
  dateRemind?: string;
}

/** A data source linked into a database container (Notion model: a database
 *  holds one or more sources; each view shows exactly one of them). */
export interface DataSourceRef {
  id: string;
  name: string;
  kind: 'live' | 'known' | 'workspace';
  addedAt?: string;
}

/** Database schema definition returned by loadState. */
export interface DatabaseSchema {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  properties: Record<string, SchemaProperty>;
  titlePropertyId: string;
  /** Sources linked through "Manage data sources" (the container record). */
  dataSources?: DataSourceRef[];
  /** Database lock: schema and view edits are disabled while set. */
  locked?: boolean;
  /** Template page the "New" button seeds from by default. */
  defaultTemplateId?: string;
  /** User's header tab order (view ids). Persisted with the database so the
   *  order survives a reload on any device — an explicit array, because an
   *  object's key order is not preserved through JSONB/JSON round-trips. Views
   *  absent from it fall to the end in creation order. */
  viewOrder?: string[];
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
  /** Template pages seed new records and are hidden from every view. */
  isTemplate?: boolean;
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

/** KPI aggregation a dashboard widget shows instead of its embedded view
 *  (Notion "Number" widget — count/sum/avg over the backing view's records,
 *  so view filters AND dashboard global filters both apply). */
export interface DashboardStatConfig {
  fn: 'count' | 'sum' | 'avg' | 'min' | 'max';
  /** Number property the fn aggregates (count needs none). */
  propertyId?: string;
}

/** Dashboard widget referencing an existing database view (Notion model). */
export interface DashboardViewWidget {
  id: string;
  viewId: string;
  title?: string;
  /** Hide the card title bar outside edit mode (clean tile look). */
  hideTitle?: boolean;
  /** Present → render as a Number/KPI tile instead of the embedded view. */
  stat?: DashboardStatConfig;
  /** Own height in px. Absent → aligned to the row height (group-resizable). */
  height?: number;
}

/** One column of a dashboard row: a vertical stack of widget cards. The
 *  column fills the row height unless it carries its own `height` (detached
 *  from the group bar); members split the column height by shares. */
export interface DashboardStack {
  /** Cards top → bottom. */
  widgetIds: string[];
  /** Height fractions per card, summing to 1. Absent → equal shares. */
  shares?: number[];
  /** Own column height in px. Absent → aligned to the row height. */
  height?: number;
}

/** One dashboard row: up to 4 COLUMNS, widths are fractions summing to 1.
 *  `widgetIds` stays the flat list (stacks flattened) for legacy readers. */
export interface DashboardRow {
  id: string;
  widgetIds: string[];
  widths: number[];
  height: number;
  /** Column stacks; absent → every widget is its own single-card column. */
  stacks?: DashboardStack[];
}

/** One automation action (set_property writes back, notify toasts via
 *  realtime, webhook POSTs server-side — HTTPS-only, SSRF-guarded). */
export interface AutomationAction {
  /** open_url and add_page are BUTTON-only actions; rules ignore them. */
  type: 'set_property' | 'notify' | 'webhook' | 'open_url' | 'add_page';
  column?: string;
  value?: unknown;
  message?: string;
  url?: string;
  /** add_page: database receiving the new page (absent = same database). */
  targetDatabaseId?: string;
  /** add_page: property values seeded onto the created page. */
  properties?: Record<string, unknown>;
}

/** A database automation: trigger → optional condition → actions. Live
 *  mounts store rules SERVER-side (they fire for every client); local
 *  databases evaluate them client-side on this session's mutations. */
export interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  /** Table/collection the rule watches (live mounts; local DBs use the db id). */
  table: string;
  trigger: 'row_added' | 'row_updated' | 'row_deleted';
  /** row_updated only: fire when THIS property changed (absent = any). */
  watchColumn?: string;
  condition?: { column: string; operator: FilterOperator; value?: unknown };
  actions: AutomationAction[];
}

/** One conditional-color rule: a filter condition + the color it applies.
 *  First matching rule wins (row tint, card accent, chart category color). */
export interface ConditionalColorRule {
  id: string;
  propertyId: string;
  operator: FilterOperator;
  value: unknown;
  /** Color token id (see conditionalColor lib), not a raw hex. */
  color: string;
}

/** Simple global filter applied across dashboard widgets (matched by name+type). */
export interface DashboardGlobalFilter {
  id: string;
  propertyName: string;
  propertyType: string;
  operator: FilterOperator;
  value: PropertyValue;
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
  /** Manual row order (page ids) — applied when the view has no user sorts;
   *  unranked pages follow in creation order. Written by row drag-reorder. */
  manualRowOrder?: string[];
  columnWidths?: Record<string, number>;
  columnOrder?: string[];
  colorColumns?: boolean;
  cardPreview?: 'none' | 'page_cover' | 'page_properties' | 'page_content';
  cardSize?: 'small' | 'medium' | 'large' | 'xl';
  cardLayout?: 'compact' | 'list';
  /** Gallery card arrangement: a wrapping grid (default) or a single horizontally
   *  scrolling row ("carousel" — show one row, scroll sideways for more). */
  galleryLayout?: 'grid' | 'carousel';
  wrapPageTitles?: boolean;
  showCalendarBy?: string;
  showCalendarAs?: 'month' | 'week';
  showWeekends?: boolean;
  /** Calendar: first day of the week (0 = Sunday, 1 = Monday, default). */
  weekStartsOn?: 0 | 1;
  /** Calendar month view: ISO week-number gutter. */
  showWeekNumbers?: boolean;
  showTimelineBy?: string;
  timelineEndBy?: string;
  separateStartEndDates?: boolean;
  showTable?: boolean;
  zoomLevel?: 'day' | 'week' | 'month';
  fitMedia?: boolean;
  /** Chart preset id — see chartTypeRegistry (legacy five + ECharts family). */
  chartType?: string;
  xAxisProperty?: string;
  xAxisSort?: 'ascending' | 'descending' | 'manual';
  xAxisOmitZero?: boolean;
  xAxisTitle?: string;
  yAxisProperty?: string;
  yAxisAggregation?: 'count' | 'sum' | 'average' | 'min' | 'max' | 'median';
  yAxisGroupBy?: string;
  yAxisRange?: 'auto' | '0-100' | '0-1000' | 'custom';
  yAxisRangeMin?: number;
  yAxisRangeMax?: number;
  yAxisTitle?: string;
  yAxisCumulative?: boolean;
  xAxisDateBucket?: 'auto' | 'day' | 'week' | 'month' | 'quarter' | 'year';
  chartHeight?: 'small' | 'medium' | 'large' | 'xl';
  gradientFill?: boolean;
  donutCenterValue?: boolean;
  colorByValue?: boolean;
  hiddenGroups?: string[];
  manualGroupOrder?: string[];
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
  /** Map view: how locations render — pins (default), clusters, heat, bubbles. */
  mapDisplayMode?: 'pins' | 'clusters' | 'heat' | 'bubbles';
  /** Map view: number property weighting heat intensity / bubble size (unset → count). */
  mapSizeBy?: string;
  widgets?: DashboardWidget[];
  formulaAnalytics?: boolean;
  relationAnalytics?: boolean;
  dashboardWidgets?: DashboardViewWidget[];
  dashboardRows?: DashboardRow[];
  dashboardFilters?: DashboardGlobalFilter[];
  /** Dashboard: stack rows earlier (count-aware) when widgets get too thin. */
  responsiveLayout?: boolean;
  /** How this view's TAB renders in the tabs row ("Display as"). */
  tabDisplay?: 'text_icon' | 'text' | 'icon';
  /** Grouped views: Notion-style in-place stacks (default) or a GitHub
   *  Projects-style "slice" panel on the left. */
  groupLayout?: 'stacked' | 'sidebar';
  /** Stacked groups the user minimized (persisted per view). */
  collapsedGroupIds?: string[];
  locked?: boolean;
  conditionalColors?: ConditionalColorRule[];
  /** Local-database automations (live mounts persist rules server-side). */
  automations?: AutomationRule[];
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
