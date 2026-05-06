/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   types.ts                                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/06 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 17:45:41 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type {
  DatabaseSchema, Page, PropertyType, SchemaProperty, ViewConfig,
} from '../types/database';
import type { ExtendedDatabaseState } from '../store/useDatabaseStore';

/** Serializable snapshot used to bootstrap an ObjectDatabase instance. */
export interface NotionState {
  databases: Record<string, DatabaseSchema>;
  pages: Record<string, Page>;
  views: Record<string, ViewConfig>;
}

/** Portable document filter supported by every ObjectDatabase adapter. */
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

/** Query object for finding pages without coupling callers to a backend. */
export interface PageQuery {
  databaseId?: string;
  filter?: DocFilter;
  sort?: { propertyId: string; direction: 'asc' | 'desc' }[];
  limit?: number;
}

/** Realtime change event emitted by adapters that support subscriptions. */
export type ChangeEvent =
  | { type: 'page-changed'; pageId: string; changes: Partial<Page['properties']> }
  | { type: 'page-inserted'; page: Page }
  | { type: 'page-deleted'; pageId: string }
  | { type: 'schema-changed'; databaseId: string }
  | { type: 'state-replaced' };

/** Document-shaped persistence contract for ObjectDatabase hosts. */
export interface ObjectDatabaseAdapter {
  loadState(): Promise<NotionState>;
  findPages(query: PageQuery): Promise<Page[]>;
  getPage(id: string): Promise<Page | null>;
  insertPage(databaseId: string, page: Omit<Page, 'id'>): Promise<Page>;
  patchPage(id: string, changes: Partial<Page['properties']>): Promise<Page>;
  deletePage(id: string): Promise<void>;
  addProperty(databaseId: string, prop: SchemaProperty): Promise<void>;
  removeProperty(databaseId: string, propertyId: string): Promise<void>;
  changePropertyType(
    databaseId: string,
    propertyId: string,
    newType: PropertyType,
  ): Promise<void>;
  subscribe?(callback: (event: ChangeEvent) => void): () => void;
}

/** Props accepted by the embeddable ObjectDatabase root component. */
export interface ObjectDatabaseProps {
  mode?: 'page' | 'inline';
  databaseId?: string;
  adapter?: ObjectDatabaseAdapter;
  theme?: 'light' | 'dark' | (string & {});
  initialView?: string | null;
  onPageOpen?: (pageId: string | null) => void;
  className?: string;
}

/** Imperative handle exposed by ObjectDatabase refs. */
export interface ObjectDatabaseInstance {
  refresh: () => Promise<void>;
  getState: () => ExtendedDatabaseState;
  openPage: (pageId: string | null) => void;
}
