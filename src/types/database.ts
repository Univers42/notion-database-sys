/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   database.ts                                        :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/02 14:40:06 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 18:48:26 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { Block } from '@notion-db/contract-types';
export type {
  AutofillConfig,
  AutomationAction,
  AutomationRule,
  AutomationRuleV2,
  AutomationTrigger,
  Block,
  BlockType,
  ButtonConfig,
  ConditionalColorRule,
  CustomFieldConfig,
  DashboardWidget,
  DashboardStatConfig,
  DashboardChartConfig,
  DashboardRecordsConfig,
  DashboardViewWidget,
  DashboardRow,
  DashboardStack,
  DashboardGlobalFilter,
  DatabaseSchema,
  FileAttachment,
  Filter,
  FilterOperator,
  FormulaConfig,
  Grouping,
  Page,
  PlaceValue,
  ProgramStep,
  ProgramValue,
  PropertyType,
  PropertyValue,
  RelationConfig,
  RollupConfig,
  RollupDisplayAs,
  RollupFunction,
  SchemaProperty,
  SelectOption,
  Sort,
  StatusGroup,
  SubGrouping,
  ViewConfig,
  ViewSettings,
  ViewType,
} from '@notion-db/contract-types';

export interface PageTemplate {
  id: string;
  databaseId: string;
  name: string;
  icon?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- default properties are heterogeneous
  defaultProperties: Record<string, any>;
  defaultContent: Block[];
}
