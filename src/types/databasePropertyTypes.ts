/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   databasePropertyTypes.ts                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/02 14:40:08 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 13:58:30 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/** Groups select options under a labeled status category. */
export interface StatusGroup {
  id: string;
  label: string;
  color: string;
  /** Option IDs belonging to this group. */
  optionIds: string[];
}

/** Metadata for a file attached to a page property. */
export interface FileAttachment {
  id: string;
  name: string;
  url: string;
  /** MIME category used for display/icon purposes. */
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
  | 'count';

export type RollupDisplayAs = 'number' | 'bar' | 'ring';

/** Configuration for a rollup property. */
export interface RollupConfig {
  /** ID of the relation property to traverse. */
  relationPropertyId: string;
  /** Property ID on the related database to aggregate. */
  targetPropertyId: string;
  function: RollupFunction;
  displayAs?: RollupDisplayAs;
}

/** Configuration for a relation property linking two databases. */
export interface RelationConfig {
  /** Target database ID this relation points to. */
  databaseId: string;
  type: 'one_way' | 'two_way';
  /** Property ID on the target database for two-way relations. */
  reversePropertyId?: string;
  limit?: number;
}

/** Configuration for a custom/user-defined field type. */
export interface CustomFieldConfig {
  dataType: 'string' | 'integer' | 'float' | 'boolean' | 'timestamp' | 'json';
  defaultValue?: unknown;
  /** Decimal precision for float fields. */
  precision?: number;
  maxLength?: number;
}
