// ─── Schema — database property definitions ─────────────────────────────────

import type { ObjectId } from './common';
import type {
  PropertyType, SelectOption, StatusGroup,
  FormulaConfig, RollupConfig, RelationConfig,
  ButtonConfig, CustomFieldConfig,
} from './property';

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
  workspaceId?: ObjectId;
}
