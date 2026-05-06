/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   schema.ts                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 15:07:35 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 19:01:07 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type {
  DomainPropertyType, DomainSelectOption, DomainStatusGroup,
  DomainFormulaConfig, DomainRollupConfig, DomainRelationConfig,
  DomainButtonConfig, DomainCustomFieldConfig,
} from './property.js';

/** A single property definition within a database schema */
export interface DomainSchemaProperty {
  id: string;
  name: string;
  type: DomainPropertyType;
  icon?: string;
  options?: DomainSelectOption[];
  statusGroups?: DomainStatusGroup[];
  formulaConfig?: DomainFormulaConfig;
  rollupConfig?: DomainRollupConfig;
  relationConfig?: DomainRelationConfig;
  buttonConfig?: DomainButtonConfig;
  customConfig?: DomainCustomFieldConfig;
  prefix?: string;
  autoIncrement?: number;
}

/**
 * DatabaseSchema — the metadata definition of a user-created database.
 * This is embedded in the parent page/database document (not standalone).
 */
export interface DomainDatabaseSchema {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  properties: Record<string, DomainSchemaProperty>;
  titlePropertyId: string;
  workspaceId?: string;
}
