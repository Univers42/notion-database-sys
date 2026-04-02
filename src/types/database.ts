/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   database.ts                                        :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/02 14:40:06 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/02 20:02:37 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// Database core type definitions

/**
 * Heterogeneous property value — covers every property type stored in a Page.
 * Use `unknown` to enforce explicit narrowing at read-sites while allowing
 * any value to be passed in at write-sites.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PropertyValue = any;

// Re-export filter and view types for backward compatibility
export type { FilterOperator, Filter, Sort, Grouping, SubGrouping } from './filters';
export type {
  ViewType, ViewConfig, ViewSettings, DashboardWidget,
} from './views';

export type PropertyType =
  | 'title'
  | 'text'
  | 'number'
  | 'select'
  | 'multi_select'
  | 'status'
  | 'date'
  | 'checkbox'
  | 'person'
  | 'user'
  | 'url'
  | 'email'
  | 'phone'
  | 'files_media'
  | 'relation'
  | 'formula'
  | 'rollup'
  | 'button'
  | 'place'
  | 'id'
  | 'created_time'
  | 'last_edited_time'
  | 'created_by'
  | 'last_edited_by'
  | 'assigned_to'
  | 'due_date'
  | 'custom';

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
  columns?: Block[][];
  columnRatios?: number[];
  spacerHeight?: number;
  expression?: string;
  syncedBlockId?: string;
}

export interface SelectOption {
  id: string;
  value: string;
  color: string;
}

import type { StatusGroup, ButtonConfig, FormulaConfig,
  RollupConfig, RelationConfig, CustomFieldConfig,
} from './databasePropertyTypes';
export type { StatusGroup, FileAttachment, ButtonConfig, PlaceValue, FormulaConfig,
  RollupFunction, RollupDisplayAs, RollupConfig, RelationConfig, CustomFieldConfig,
} from './databasePropertyTypes';

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

export interface DatabaseSchema {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  properties: Record<string, SchemaProperty>;
  titlePropertyId: string;
}

export interface Page {
  id: string;
  databaseId: string;
  icon?: string;
  cover?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- property values are heterogeneous across property types
  properties: Record<string, any>;
  content: Block[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastEditedBy: string;
  archived?: boolean;
  parentPageId?: string;
}

export interface PageTemplate {
  id: string;
  databaseId: string;
  name: string;
  icon?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- default properties are heterogeneous
  defaultProperties: Record<string, any>;
  defaultContent: Block[];
}
