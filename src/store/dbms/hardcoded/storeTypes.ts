/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   storeTypes.ts                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:43:37 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/02 14:49:14 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── DatabaseState — public interface for the Zustand store ──────────────────

import type {
  DatabaseSchema, Page, ViewConfig, PropertyType, ViewSettings,
  SelectOption, Filter, Sort, Grouping, Block, SchemaProperty, PropertyValue,
} from '../../../types/database';

/** Zustand `set` helper — used in every store slice. */
export type StoreSet = (
  partial: Partial<DatabaseState> | ((state: DatabaseState) => Partial<DatabaseState>),
) => void;

/** Zustand `get` helper — used in every store slice. */
export type StoreGet = () => DatabaseState;

export interface DatabaseState {
  databases: Record<string, DatabaseSchema>;
  pages: Record<string, Page>;
  views: Record<string, ViewConfig>;
  activeViewId: string | null;
  openPageId: string | null;
  searchQuery: string;

  // Database CRUD
  renameDatabase: (databaseId: string, name: string) => void;
  updateDatabaseIcon: (databaseId: string, icon: string) => void;

  // Page CRUD
  addPage: (databaseId: string, properties?: Record<string, PropertyValue>) => string;
  updatePageProperty: (pageId: string, propertyId: string, value: PropertyValue) => void;
  deletePage: (pageId: string) => void;
  duplicatePage: (pageId: string) => void;
  updatePageContent: (pageId: string, content: Block[]) => void;
  changeBlockType: (pageId: string, blockId: string, newType: Block['type']) => void;
  insertBlock: (pageId: string, afterBlockId: string | null, block: Block) => void;
  deleteBlock: (pageId: string, blockId: string) => void;
  moveBlock: (pageId: string, blockId: string, targetIndex: number) => void;
  toggleBlockChecked: (pageId: string, blockId: string) => void;
  toggleBlockCollapsed: (pageId: string, blockId: string) => void;
  updateBlock: (pageId: string, blockId: string, updates: Partial<Block>) => void;

  // Inline Database Creation
  createInlineDatabase: (name?: string) => { databaseId: string; viewId: string };

  // View CRUD
  addView: (view: Omit<ViewConfig, 'id'>) => void;
  updateView: (viewId: string, updates: Partial<ViewConfig>) => void;
  updateViewSettings: (viewId: string, settings: Partial<ViewSettings>) => void;
  deleteView: (viewId: string) => void;
  duplicateView: (viewId: string) => void;
  setActiveView: (viewId: string) => void;

  // Filter / Sort / Group
  addFilter: (viewId: string, filter: Omit<Filter, 'id'>) => void;
  updateFilter: (viewId: string, filterId: string, updates: Partial<Filter>) => void;
  removeFilter: (viewId: string, filterId: string) => void;
  clearFilters: (viewId: string) => void;
  addSort: (viewId: string, sort: Omit<Sort, 'id'>) => void;
  setSort: (viewId: string, sort: Omit<Sort, 'id'>) => void;
  updateSort: (viewId: string, sortId: string, updates: Partial<Sort>) => void;
  removeSort: (viewId: string, sortId: string) => void;
  clearSorts: (viewId: string) => void;
  setGrouping: (viewId: string, grouping: Grouping | undefined) => void;

  // Property Management
  addProperty: (databaseId: string, name: string, type: PropertyType) => void;
  insertPropertyAt: (databaseId: string, name: string, type: PropertyType, viewId: string, afterPropId: string | null) => void;
  updateProperty: (databaseId: string, propertyId: string, updates: Partial<SchemaProperty>) => void;
  deleteProperty: (databaseId: string, propertyId: string) => void;
  togglePropertyVisibility: (viewId: string, propertyId: string) => void;
  hideAllProperties: (viewId: string) => void;
  reorderProperties: (viewId: string, propertyIds: string[]) => void;
  addSelectOption: (databaseId: string, propertyId: string, option: SelectOption) => void;

  // UI State
  openPage: (pageId: string | null) => void;
  setSearchQuery: (query: string) => void;

  // Computed Helpers
  getPagesForView: (viewId: string) => Page[];
  getPageTitle: (page: Page) => string;
  getGroupedPages: (viewId: string) => { groupId: string; groupLabel: string; groupColor: string; pages: Page[] }[];
  resolveFormula: (databaseId: string, page: Page, expression: string) => PropertyValue;
  resolveRollup: (databaseId: string, page: Page, propertyId: string) => PropertyValue;
  getSmartDefaults: (databaseId: string) => {
    suggestedView: string;
    suggestedGroupBy?: string;
    suggestedSortBy?: { propertyId: string; direction: 'asc' | 'desc' };
    suggestedCalendarBy?: string;
    suggestedTimelineBy?: string;
  };
}
