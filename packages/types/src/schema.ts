/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   schema.ts                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 15:07:35 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 22:31:03 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type {
  PropertyType, SelectOption, StatusGroup,
  FormulaConfig, RollupConfig, RelationConfig,
  ButtonConfig, CustomFieldConfig,
} from './property.js';

/** A single property definition within a database schema */
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

/**
 * DatabaseSchema — the metadata definition of a user-created database.
 * This is embedded in the parent page/database document (not standalone).
 */
export interface DatabaseSchema {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  properties: Record<string, SchemaProperty>;
  titlePropertyId: string;
  workspaceId?: string;
}
