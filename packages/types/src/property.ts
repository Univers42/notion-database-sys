/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   property.ts                                        :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 15:07:31 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 15:07:32 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

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

export interface SelectOption {
  id: string;
  value: string;
  color: string;
}

export interface StatusGroup {
  id: string;
  label: string;
  color: string;
  optionIds: string[];
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
  limit?: number;
}

export interface CustomFieldConfig {
  dataType: 'string' | 'integer' | 'float' | 'boolean' | 'timestamp' | 'json';
  defaultValue?: unknown;
  precision?: number;
  maxLength?: number;
}
