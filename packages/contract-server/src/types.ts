/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   types.ts                                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/06 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 18:13:14 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/** Heterogeneous property value accepted by Notion-like pages. */
export type PropertyValue = unknown;

/** Property types understood by the contract server. */
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

/** Select/status option metadata. */
export interface SelectOption {
  id: string;
  value: string;
  color: string;
}

/** Schema property definition persisted in the meta collection. */
export interface SchemaProperty {
  id: string;
  name: string;
  type: PropertyType;
  icon?: string;
  options?: SelectOption[];
  statusGroups?: unknown[];
  formulaConfig?: unknown;
  rollupConfig?: unknown;
  relationConfig?: unknown;
  buttonConfig?: unknown;
  customConfig?: unknown;
  prefix?: string;
  autoIncrement?: number;
}

/** Database schema definition persisted in the meta collection. */
export interface DatabaseSchema {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  properties: Record<string, SchemaProperty>;
  titlePropertyId: string;
}

/** Page document returned by contract endpoints. */
export interface Page {
  id: string;
  databaseId: string;
  icon?: string;
  cover?: string;
  properties: Record<string, PropertyValue>;
  content: unknown[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastEditedBy: string;
  archived?: boolean;
  parentPageId?: string;
}

/** View configuration persisted in the meta collection. */
export interface ViewConfig {
  id: string;
  databaseId: string;
  name: string;
  type: string;
  filters: unknown[];
  filterConjunction: 'and' | 'or';
  sorts: unknown[];
  grouping?: unknown;
  subGrouping?: unknown;
  visibleProperties: string[];
  settings: Record<string, unknown>;
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

/** Meta document stored in MongoDB's _meta collection. */
export interface MetaState {
  _id: 'notion-state';
  databases: NotionState['databases'];
  views: NotionState['views'];
  fieldMaps: Record<string, Record<string, string>>;
  updatedAt: string;
}

/** Standard ok response for mutation endpoints. */
export interface OkResponse {
  ok: true;
}

/** Standard error response for all endpoints. */
export interface ErrorResponse {
  error: string;
  code?: string;
}
