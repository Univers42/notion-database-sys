// ═══════════════════════════════════════════════════════════════════════════════
// NOTION DATABASE SYSTEM — TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════
// Mental Model:
//   Database (schema) → Pages (rows) → Properties (cells) + Content (blocks)
//   Views are lenses over the SAME data — never duplicated.
//   Any mutation propagates to every view instantly via Zustand reactivity.
// ═══════════════════════════════════════════════════════════════════════════════

// ─── PROPERTY TYPES ──────────────────────────────────────────────────────────

export type PropertyType =
  | 'title'         // Every database has exactly one title property
  | 'text'
  | 'number'
  | 'select'
  | 'multi_select'
  | 'status'        // Kanban-friendly status with groups: To Do / In Progress / Done
  | 'date'
  | 'checkbox'
  | 'person'        // People picker (avatar + name)
  | 'user'          // Legacy / compat alias for person
  | 'url'
  | 'email'
  | 'phone'
  | 'files_media'   // File attachments + images
  | 'relation'
  | 'formula'
  | 'rollup'
  | 'button'        // Action button (label + optional URL)
  | 'place'         // Location / address with optional lat/lng
  | 'id'            // Auto-increment unique ID
  | 'created_time'
  | 'last_edited_time'
  | 'created_by'
  | 'last_edited_by'
  | 'assigned_to'   // People picker for task assignment (avatar group)
  | 'due_date'      // Deadline-aware date with overdue/urgent coloring
  | 'custom';       // Database-engine typed field (string, integer, float, boolean, timestamp, json)

// ─── BLOCK SYSTEM (page content) ────────────────────────────────────────────

export type BlockType =
  | 'paragraph'
  | 'heading_1'
  | 'heading_2'
  | 'heading_3'
  | 'heading_4'
  | 'heading_5'
  | 'heading_6'
  | 'bulleted_list'
  | 'numbered_list'
  | 'to_do'
  | 'toggle'
  | 'code'
  | 'quote'
  | 'callout'
  | 'divider'
  | 'image'
  | 'video'
  | 'audio'
  | 'file'
  | 'bookmark'
  | 'page'
  | 'link_to_page'
  | 'table_block'
  | 'column'
  | 'table_of_contents'
  | 'equation'
  | 'spacer'
  | 'embed'
  | 'breadcrumb'
  | 'synced_block'
  | 'table_view'
  | 'board_view'
  | 'gallery_view'
  | 'list_view'
  | 'database_inline'
  | 'database_full_page';

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
  // Column layout
  columns?: Block[][];
  columnRatios?: number[];
  // Spacer
  spacerHeight?: number;
  // Equation
  expression?: string;
  // Synced block
  syncedBlockId?: string;
}

// ─── SELECT OPTIONS ──────────────────────────────────────────────────────────

export interface SelectOption {
  id: string;
  value: string;
  color: string;
}

// ─── PROPERTY CONFIG TYPES ───────────────────────────────────────────────────

export interface StatusGroup {
  id: string;
  label: string;        // "To Do" | "In Progress" | "Done"
  color: string;        // Tailwind class
  optionIds: string[];  // Which SelectOptions belong to this group
}

export interface FileAttachment {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'pdf' | 'doc' | 'other';
  size?: number;
}

export interface ButtonConfig {
  label: string;
  action: 'open_url' | 'copy' | 'notify';
  url?: string;
}

export interface PlaceValue {
  address: string;
  lat?: number;
  lng?: number;
}

export interface FormulaConfig {
  expression: string;
}

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
  // Legacy compat
  | 'count';

export type RollupDisplayAs = 'number' | 'bar' | 'ring';

export interface RollupConfig {
  relationPropertyId: string;
  targetPropertyId: string;
  function: RollupFunction;
  displayAs?: RollupDisplayAs;
}

export interface RelationConfig {
  databaseId: string;
  type: 'one_way' | 'two_way';
  reversePropertyId?: string;
  limit?: number;  // undefined = no limit, 1 = single relation
}

export interface CustomFieldConfig {
  dataType: 'string' | 'integer' | 'float' | 'boolean' | 'timestamp' | 'json';
  defaultValue?: any;
  precision?: number;    // For float types
  maxLength?: number;    // For string types
}

// ─── SCHEMA PROPERTY ─────────────────────────────────────────────────────────

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
  prefix?: string;         // For ID type: "TASK-", "INV-"
  autoIncrement?: number;  // For ID type: next value
}

// ─── DATABASE SCHEMA ─────────────────────────────────────────────────────────

export interface DatabaseSchema {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  properties: Record<string, SchemaProperty>;
  titlePropertyId: string;
}

// ─── PAGE ────────────────────────────────────────────────────────────────────

export interface Page {
  id: string;
  databaseId: string;
  icon?: string;
  cover?: string;
  properties: Record<string, any>;
  content: Block[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastEditedBy: string;
  archived?: boolean;
  parentPageId?: string;
}

// ─── VIEW TYPE ───────────────────────────────────────────────────────────────

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

// ─── FILTER ──────────────────────────────────────────────────────────────────

export type FilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'is_empty'
  | 'is_not_empty'
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equal'
  | 'less_than_or_equal'
  | 'is_before'
  | 'is_after'
  | 'is_on_or_before'
  | 'is_on_or_after'
  | 'is_between'
  | 'is_relative_to_today'
  | 'is_checked'
  | 'is_not_checked';

export interface Filter {
  id: string;
  propertyId: string;
  operator: FilterOperator;
  value: any;
}

// ─── SORT ────────────────────────────────────────────────────────────────────

export interface Sort {
  id: string;
  propertyId: string;
  direction: 'asc' | 'desc';
}

// ─── GROUPING ────────────────────────────────────────────────────────────────

export interface Grouping {
  propertyId: string;
  hiddenGroups?: string[];
  sort?: 'alphabetical' | 'manual';
}

export interface SubGrouping {
  propertyId: string;
}

// ─── DASHBOARD WIDGETS ───────────────────────────────────────────────────────

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

// ─── VIEW SETTINGS ───────────────────────────────────────────────────────────

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

// ─── VIEW CONFIG ─────────────────────────────────────────────────────────────

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

// ─── TEMPLATE ────────────────────────────────────────────────────────────────

export interface PageTemplate {
  id: string;
  databaseId: string;
  name: string;
  icon?: string;
  defaultProperties: Record<string, any>;
  defaultContent: Block[];
}
