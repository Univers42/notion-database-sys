/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   types.ts                                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/06 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/10 00:36:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { ObjectDatabaseAdapter } from '@notion-db/contract-types';
import type React from 'react';
export {
  AdapterError,
} from '@notion-db/contract-types';
export type {
  Block,
  ChangeEvent,
  DatabaseSchema,
  DocFilter,
  Filter,
  Grouping,
  NotionState,
  ObjectDatabaseAdapter,
  Page,
  PageQuery,
  PropertyType,
  SchemaProperty,
  Sort,
  SubGrouping,
  ViewConfig,
} from '@notion-db/contract-types';
import type { ExtendedDatabaseState } from '../store/useDatabaseStore';

/** Host-rendered replacement for the built-in ObjectDatabase page peek/modal. */
export type ObjectDatabasePageRenderer = (
  pageId: string,
  state: ExtendedDatabaseState,
  onClose: () => void,
) => React.ReactNode;

/** One template entry shown in the database "New" dropdown. */
export interface ObjectDatabaseTemplateSummary {
  id: string;
  title: string;
  icon?: string;
  isDefault: boolean;
}

/**
 * Host-supplied controller for the database templates dropdown. The templates
 * themselves are REAL records owned by the host (e.g. osionos_pages flagged
 * is_template) — this component is purely presentational over them.
 */
export interface ObjectDatabaseTemplatesController {
  list: ObjectDatabaseTemplateSummary[];
  /** Create a new page from a template and open it. */
  onCreateFrom: (templateId: string) => void;
  /** Open a template for editing (template-edit mode). */
  onOpen: (templateId: string) => void;
  /** Create a new blank template and open it for editing. */
  onNew: () => void;
  onSetDefault: (templateId: string) => void;
  onDuplicate: (templateId: string) => void;
  onDelete: (templateId: string) => void;
}

/**
 * One sub-item beneath a record row. The component renders it as a real table row
 * aligned to the columns: the title sits (indented) in the title column. When
 * `pageId` resolves to a row already in this table's state, the other columns are
 * filled from that row (real child records); otherwise only the title shows
 * (notes, which have no source columns).
 */
export interface ObjectDatabaseSubItemRow {
  id: string;
  title: string;
  icon?: string;
  pageId?: string;
}

/**
 * Host-supplied controller for Notion-style row sub-items. When present, each
 * table row gains an expand chevron; expanding renders the row's sub-items as
 * column-aligned child rows. The component owns the expand state + the per-row
 * data cache; the host owns fetching the data, opening a sub-item, and creating
 * one.
 */
export interface ObjectDatabaseSubItemsController {
  /** Fetch a record row's sub-items (the component calls this on first expand). */
  fetchRows: (recordId: string) => Promise<ObjectDatabaseSubItemRow[]>;
  /** Open a sub-item as a page. */
  openRow: (subItemId: string) => void;
  /** Create a new sub-item under the record row. */
  createRow: (recordId: string) => Promise<void>;
}

/** Props accepted by the embeddable ObjectDatabase root component. */
export interface ObjectDatabaseProps {
  mode?: 'page' | 'inline';
  databaseId?: string;
  adapter?: ObjectDatabaseAdapter;
  theme?: 'light' | 'dark' | (string & {});
  initialView?: string | null;
  onPageOpen?: (pageId: string | null) => void;
  renderPage?: ObjectDatabasePageRenderer;
  className?: string;
  chrome?: 'full' | 'single-view';
  /** Host-supplied templates controller; when present the "New" button splits. */
  templates?: ObjectDatabaseTemplatesController;
  /** Host-supplied sub-items controller; when present rows gain an expand chevron. */
  subItems?: ObjectDatabaseSubItemsController;
}

/** Imperative handle exposed by ObjectDatabase refs. */
export interface ObjectDatabaseInstance {
  refresh: () => Promise<void>;
  getState: () => ExtendedDatabaseState;
  openPage: (pageId: string | null) => void;
}
