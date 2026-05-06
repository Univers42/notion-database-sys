/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   property.ts                                        :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 15:07:31 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 19:01:06 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/** Domain property type literals for persisted workspace models. */
export type DomainPropertyType =
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

/** Domain select/status option metadata. */
export interface DomainSelectOption {
  id: string;
  value: string;
  color: string;
}

/** Domain status group metadata. */
export interface DomainStatusGroup {
  id: string;
  label: string;
  color: string;
  optionIds: string[];
}

/** Domain file attachment metadata. */
export interface DomainFileAttachment {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'pdf' | 'doc' | 'other';
  size?: number;
}

/** Domain button property behavior configuration. */
export interface DomainButtonConfig {
  label: string;
  action: 'open_url' | 'copy' | 'notify';
  url?: string;
}

/** Domain place property value. */
export interface DomainPlaceValue {
  address: string;
  lat?: number;
  lng?: number;
}

/** Domain formula expression configuration. */
export interface DomainFormulaConfig {
  expression: string;
}

/** Domain rollup aggregation function literals. */
export type DomainRollupFunction =
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

/** Domain rollup display mode literals. */
export type DomainRollupDisplayAs = 'number' | 'bar' | 'ring';

/** Domain rollup property configuration. */
export interface DomainRollupConfig {
  relationPropertyId: string;
  targetPropertyId: string;
  function: DomainRollupFunction;
  displayAs?: DomainRollupDisplayAs;
}

/** Domain relation property configuration. */
export interface DomainRelationConfig {
  databaseId: string;
  type: 'one_way' | 'two_way';
  reversePropertyId?: string;
  limit?: number;
}

/** Domain custom field configuration. */
export interface DomainCustomFieldConfig {
  dataType: 'string' | 'integer' | 'float' | 'boolean' | 'timestamp' | 'json';
  defaultValue?: unknown;
  precision?: number;
  maxLength?: number;
}
