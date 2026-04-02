/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   databasePropertyTypes.ts                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/02 14:40:08 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/02 14:40:09 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// Database property config type definitions
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
