import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  DatabaseSchema, Page, ViewConfig, PropertyType, ViewSettings,
  SelectOption, Filter, Sort, Grouping, Block, SchemaProperty,
} from '../types/database';
import { initFormulaEngine, evalFormula, isWasmReady } from '../lib/engine/bridge';
import { getCachedFormula, setCachedFormula } from './formulaCache';
import { evaluateFilter, compareValues } from './filterEngine';
import { buildInitialState } from './seedData';

initFormulaEngine().catch(() => {});

// ─── getPagesForView cache ────────────────────────────────────────────────────
let pagesForViewCache: {
  pagesRef: Record<string, unknown> | null;
  viewsRef: Record<string, unknown> | null;
  searchQuery: string;
  results: Map<string, Page[]>;
} = { pagesRef: null, viewsRef: null, searchQuery: '', results: new Map() };

const initialState = buildInitialState();

// ═══════════════════════════════════════════════════════════════════════════════
// STATE INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

interface DatabaseState {
  databases: Record<string, DatabaseSchema>;
  pages: Record<string, Page>;
  views: Record<string, ViewConfig>;
  activeViewId: string | null;
  openPageId: string | null;             // Page currently open in modal
  searchQuery: string;                    // Global search

  // ─── Database CRUD ─────────────────────────────────────────
  renameDatabase: (databaseId: string, name: string) => void;
  updateDatabaseIcon: (databaseId: string, icon: string) => void;

  // ─── Page CRUD ─────────────────────────────────────────────
  addPage: (databaseId: string, properties?: Record<string, any>) => string;
  updatePageProperty: (pageId: string, propertyId: string, value: any) => void;
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

  // ─── Inline Database Creation ───────────────────────────────
  createInlineDatabase: (name?: string) => { databaseId: string; viewId: string };

  // ─── View CRUD ─────────────────────────────────────────────
  addView: (view: Omit<ViewConfig, 'id'>) => void;
  updateView: (viewId: string, updates: Partial<ViewConfig>) => void;
  updateViewSettings: (viewId: string, settings: Partial<ViewSettings>) => void;
  deleteView: (viewId: string) => void;
  duplicateView: (viewId: string) => void;
  setActiveView: (viewId: string) => void;

  // ─── Filter / Sort / Group ─────────────────────────────────
  addFilter: (viewId: string, filter: Omit<Filter, 'id'>) => void;
  updateFilter: (viewId: string, filterId: string, updates: Partial<Filter>) => void;
  removeFilter: (viewId: string, filterId: string) => void;
  clearFilters: (viewId: string) => void;
  addSort: (viewId: string, sort: Omit<Sort, 'id'>) => void;
  updateSort: (viewId: string, sortId: string, updates: Partial<Sort>) => void;
  removeSort: (viewId: string, sortId: string) => void;
  clearSorts: (viewId: string) => void;
  setGrouping: (viewId: string, grouping: Grouping | undefined) => void;

  // ─── Property Management ───────────────────────────────────
  addProperty: (databaseId: string, name: string, type: PropertyType) => void;
  insertPropertyAt: (databaseId: string, name: string, type: PropertyType, viewId: string, afterPropId: string | null) => void;
  updateProperty: (databaseId: string, propertyId: string, updates: Partial<SchemaProperty>) => void;
  deleteProperty: (databaseId: string, propertyId: string) => void;
  togglePropertyVisibility: (viewId: string, propertyId: string) => void;
  hideAllProperties: (viewId: string) => void;
  reorderProperties: (viewId: string, propertyIds: string[]) => void;
  addSelectOption: (databaseId: string, propertyId: string, option: SelectOption) => void;

  // ─── UI State ──────────────────────────────────────────────
  openPage: (pageId: string | null) => void;
  setSearchQuery: (query: string) => void;

  // ─── Computed Helpers ──────────────────────────────────────
  getPagesForView: (viewId: string) => Page[];
  getPageTitle: (page: Page) => string;
  getGroupedPages: (viewId: string) => { groupId: string; groupLabel: string; groupColor: string; pages: Page[] }[];
  resolveFormula: (databaseId: string, page: Page, expression: string) => any;
  resolveRollup: (databaseId: string, page: Page, propertyId: string) => any;

  // ─── Smart Defaults ───────────────────────────────────────
  getSmartDefaults: (databaseId: string) => {
    suggestedView: string;
    suggestedGroupBy?: string;
    suggestedSortBy?: { propertyId: string; direction: 'asc' | 'desc' };
    suggestedCalendarBy?: string;
    suggestedTimelineBy?: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STORE
// ═══════════════════════════════════════════════════════════════════════════════

export const useDatabaseStore = create<DatabaseState>((set, get) => ({
  databases: initialState.databases,
  pages: initialState.pages,
  views: initialState.views,
  activeViewId: 'v-prod-table',
  openPageId: null,
  searchQuery: '',

  // ─── DATABASE CRUD ─────────────────────────────────────────

  renameDatabase: (databaseId, name) => set((state) => ({
    databases: {
      ...state.databases,
      [databaseId]: { ...state.databases[databaseId], name }
    }
  })),

  updateDatabaseIcon: (databaseId, icon) => set((state) => ({
    databases: {
      ...state.databases,
      [databaseId]: { ...state.databases[databaseId], icon }
    }
  })),

  // ─── PAGE CRUD ─────────────────────────────────────────────

  addPage: (databaseId, properties = {}) => {
    const id = uuidv4();
    const db = get().databases[databaseId];
    if (!db) return id;

    // Initialize title if not provided
    if (db.titlePropertyId && !properties[db.titlePropertyId]) {
      properties[db.titlePropertyId] = '';
    }

    // Auto-populate ID type properties
    const dbUpdates: Record<string, SchemaProperty> = {};
    for (const prop of Object.values(db.properties)) {
      if (prop.type === 'id' && !properties[prop.id]) {
        const counter = prop.autoIncrement || 1;
        properties[prop.id] = `${prop.prefix || ''}${counter}`;
        dbUpdates[prop.id] = { ...prop, autoIncrement: counter + 1 };
      }
    }

    const newPage: Page = {
      id,
      databaseId,
      properties,
      content: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'You',
      lastEditedBy: 'You',
    };
    set((state) => {
      const updatedDb = Object.keys(dbUpdates).length > 0
        ? { ...state.databases, [databaseId]: { ...state.databases[databaseId], properties: { ...state.databases[databaseId].properties, ...Object.fromEntries(Object.entries(dbUpdates).map(([k, v]) => [k, v])) } } }
        : state.databases;
      return { pages: { ...state.pages, [id]: newPage }, databases: updatedDb };
    });
    return id;
  },

  updatePageProperty: (pageId, propertyId, value) => set((state) => {
    const page = state.pages[pageId];
    if (!page) return state;
    return {
      pages: {
        ...state.pages,
        [pageId]: {
          ...page,
          properties: { ...page.properties, [propertyId]: value },
          updatedAt: new Date().toISOString(),
          lastEditedBy: 'You',
        }
      }
    };
  }),

  deletePage: (pageId) => set((state) => {
    const newPages = { ...state.pages };
    delete newPages[pageId];
    return { pages: newPages, openPageId: state.openPageId === pageId ? null : state.openPageId };
  }),

  duplicatePage: (pageId) => {
    const state = get();
    const page = state.pages[pageId];
    if (!page) return;
    const id = uuidv4();
    const newPage: Page = {
      ...page,
      id,
      properties: { ...page.properties },
      content: [...page.content],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    // Append " (copy)" to title
    const db = state.databases[page.databaseId];
    if (db?.titlePropertyId && newPage.properties[db.titlePropertyId]) {
      newPage.properties[db.titlePropertyId] += ' (copy)';
    }
    set({ pages: { ...state.pages, [id]: newPage } });
  },

  updatePageContent: (pageId, content) => set((state) => {
    const page = state.pages[pageId];
    if (!page) return state;
    return {
      pages: {
        ...state.pages,
        [pageId]: { ...page, content, updatedAt: new Date().toISOString(), lastEditedBy: 'You' }
      }
    };
  }),

  changeBlockType: (pageId, blockId, newType) => set((state) => {
    const page = state.pages[pageId];
    if (!page || !page.content) return state;
    const content = page.content.map(b =>
      b.id === blockId ? { ...b, type: newType } : b
    );
    return { pages: { ...state.pages, [pageId]: { ...page, content, updatedAt: new Date().toISOString(), lastEditedBy: 'You' } } };
  }),

  insertBlock: (pageId, afterBlockId, block) => set((state) => {
    const page = state.pages[pageId];
    if (!page) return state;
    const content = [...(page.content || [])];
    if (afterBlockId === null) {
      content.unshift(block);
    } else {
      const idx = content.findIndex(b => b.id === afterBlockId);
      content.splice(idx + 1, 0, block);
    }
    return { pages: { ...state.pages, [pageId]: { ...page, content, updatedAt: new Date().toISOString(), lastEditedBy: 'You' } } };
  }),

  deleteBlock: (pageId, blockId) => set((state) => {
    const page = state.pages[pageId];
    if (!page || !page.content) return state;
    const content = page.content.filter(b => b.id !== blockId);
    return { pages: { ...state.pages, [pageId]: { ...page, content, updatedAt: new Date().toISOString(), lastEditedBy: 'You' } } };
  }),

  moveBlock: (pageId, blockId, targetIndex) => set((state) => {
    const page = state.pages[pageId];
    if (!page || !page.content) return state;
    const content = [...page.content];
    const fromIdx = content.findIndex(b => b.id === blockId);
    if (fromIdx === -1) return state;
    const [moved] = content.splice(fromIdx, 1);
    content.splice(targetIndex, 0, moved);
    return { pages: { ...state.pages, [pageId]: { ...page, content, updatedAt: new Date().toISOString(), lastEditedBy: 'You' } } };
  }),

  toggleBlockChecked: (pageId, blockId) => set((state) => {
    const page = state.pages[pageId];
    if (!page || !page.content) return state;
    const content = page.content.map(b =>
      b.id === blockId ? { ...b, checked: !b.checked } : b
    );
    return { pages: { ...state.pages, [pageId]: { ...page, content, updatedAt: new Date().toISOString(), lastEditedBy: 'You' } } };
  }),

  toggleBlockCollapsed: (pageId, blockId) => set((state) => {
    const page = state.pages[pageId];
    if (!page || !page.content) return state;
    const content = page.content.map(b =>
      b.id === blockId ? { ...b, collapsed: !b.collapsed } : b
    );
    return { pages: { ...state.pages, [pageId]: { ...page, content, updatedAt: new Date().toISOString(), lastEditedBy: 'You' } } };
  }),

  updateBlock: (pageId, blockId, updates) => set((state) => {
    const page = state.pages[pageId];
    if (!page || !page.content) return state;
    const content = page.content.map(b =>
      b.id === blockId ? { ...b, ...updates } : b
    );
    return { pages: { ...state.pages, [pageId]: { ...page, content, updatedAt: new Date().toISOString(), lastEditedBy: 'You' } } };
  }),

  // ─── INLINE DATABASE CREATION ──────────────────────────────

  createInlineDatabase: (name = 'Untitled Database') => {
    const dbId = `db-inline-${uuidv4().slice(0, 8)}`;
    const viewId = `v-${uuidv4().slice(0, 8)}`;
    const titlePropId = `prop-${uuidv4().slice(0, 6)}`;
    const tagsPropId = `prop-${uuidv4().slice(0, 6)}`;
    const statusPropId = `prop-${uuidv4().slice(0, 6)}`;

    const newDb: DatabaseSchema = {
      id: dbId,
      name,
      icon: '📊',
      titlePropertyId: titlePropId,
      properties: {
        [titlePropId]: { id: titlePropId, name: 'Name', type: 'title' },
        [tagsPropId]: {
          id: tagsPropId, name: 'Tags', type: 'multi_select',
          options: [
            { id: `opt-${uuidv4().slice(0, 6)}`, value: 'Tag 1', color: 'bg-accent-muted text-accent-text-bold' },
            { id: `opt-${uuidv4().slice(0, 6)}`, value: 'Tag 2', color: 'bg-success-surface-muted text-success-text-tag' },
          ],
        },
        [statusPropId]: {
          id: statusPropId, name: 'Status', type: 'select',
          options: [
            { id: `opt-${uuidv4().slice(0, 6)}`, value: 'Not started', color: 'bg-surface-muted text-ink-strong' },
            { id: `opt-${uuidv4().slice(0, 6)}`, value: 'In progress', color: 'bg-accent-subtle text-accent-text-bold' },
            { id: `opt-${uuidv4().slice(0, 6)}`, value: 'Done', color: 'bg-success-surface-medium text-success-text-tag' },
          ],
        },
      },
    };

    const newView: ViewConfig = {
      id: viewId,
      databaseId: dbId,
      name: 'Table',
      type: 'table',
      filters: [],
      filterConjunction: 'and',
      sorts: [],
      visibleProperties: [titlePropId, tagsPropId, statusPropId],
      settings: { showVerticalLines: true },
    };

    set((state) => ({
      databases: { ...state.databases, [dbId]: newDb },
      views: { ...state.views, [viewId]: newView },
    }));

    return { databaseId: dbId, viewId };
  },

  // ─── VIEW CRUD ─────────────────────────────────────────────

  addView: (view) => set((state) => {
    const id = `v-${uuidv4().slice(0, 8)}`;
    return {
      views: { ...state.views, [id]: { ...view, id } as ViewConfig },
      activeViewId: id
    };
  }),

  updateView: (viewId, updates) => set((state) => {
    const view = state.views[viewId];
    if (!view) return state;
    return { views: { ...state.views, [viewId]: { ...view, ...updates } } };
  }),

  updateViewSettings: (viewId, settings) => set((state) => {
    const view = state.views[viewId];
    if (!view) return state;
    return {
      views: {
        ...state.views,
        [viewId]: { ...view, settings: { ...view.settings, ...settings } }
      }
    };
  }),

  deleteView: (viewId) => set((state) => {
    const newViews = { ...state.views };
    delete newViews[viewId];
    const isActive = state.activeViewId === viewId;
    const firstRemaining = Object.keys(newViews)[0] || null;
    return { views: newViews, activeViewId: isActive ? firstRemaining : state.activeViewId };
  }),

  duplicateView: (viewId) => {
    const state = get();
    const view = state.views[viewId];
    if (!view) return;
    const id = `v-${uuidv4().slice(0, 8)}`;
    const newView: ViewConfig = {
      ...view,
      id,
      name: view.name + ' (copy)',
      filters: view.filters.map(f => ({ ...f, id: uuidv4() })),
      sorts: view.sorts.map(s => ({ ...s, id: uuidv4() })),
      settings: { ...view.settings },
    };
    set({ views: { ...state.views, [id]: newView }, activeViewId: id });
  },

  setActiveView: (viewId) => set({ activeViewId: viewId }),

  // ─── FILTER / SORT / GROUP ─────────────────────────────────

  addFilter: (viewId, filter) => set((state) => {
    const view = state.views[viewId];
    if (!view) return state;
    return {
      views: {
        ...state.views,
        [viewId]: { ...view, filters: [...view.filters, { ...filter, id: uuidv4() }] }
      }
    };
  }),

  updateFilter: (viewId, filterId, updates) => set((state) => {
    const view = state.views[viewId];
    if (!view) return state;
    return {
      views: {
        ...state.views,
        [viewId]: {
          ...view,
          filters: view.filters.map(f => f.id === filterId ? { ...f, ...updates } : f)
        }
      }
    };
  }),

  removeFilter: (viewId, filterId) => set((state) => {
    const view = state.views[viewId];
    if (!view) return state;
    return {
      views: {
        ...state.views,
        [viewId]: { ...view, filters: view.filters.filter(f => f.id !== filterId) }
      }
    };
  }),

  clearFilters: (viewId) => set((state) => {
    const view = state.views[viewId];
    if (!view) return state;
    return { views: { ...state.views, [viewId]: { ...view, filters: [] } } };
  }),

  addSort: (viewId, sort) => set((state) => {
    const view = state.views[viewId];
    if (!view) return state;
    return {
      views: {
        ...state.views,
        [viewId]: { ...view, sorts: [...view.sorts, { ...sort, id: uuidv4() }] }
      }
    };
  }),

  updateSort: (viewId, sortId, updates) => set((state) => {
    const view = state.views[viewId];
    if (!view) return state;
    return {
      views: {
        ...state.views,
        [viewId]: {
          ...view,
          sorts: view.sorts.map(s => s.id === sortId ? { ...s, ...updates } : s)
        }
      }
    };
  }),

  removeSort: (viewId, sortId) => set((state) => {
    const view = state.views[viewId];
    if (!view) return state;
    return {
      views: {
        ...state.views,
        [viewId]: { ...view, sorts: view.sorts.filter(s => s.id !== sortId) }
      }
    };
  }),

  clearSorts: (viewId) => set((state) => {
    const view = state.views[viewId];
    if (!view) return state;
    return { views: { ...state.views, [viewId]: { ...view, sorts: [] } } };
  }),

  setGrouping: (viewId, grouping) => set((state) => {
    const view = state.views[viewId];
    if (!view) return state;
    return { views: { ...state.views, [viewId]: { ...view, grouping } } };
  }),

  // ─── PROPERTY MANAGEMENT ───────────────────────────────────

  addProperty: (databaseId, name, type) => set((state) => {
    const db = state.databases[databaseId];
    if (!db) return state;
    const newPropId = `prop-${uuidv4().slice(0, 8)}`;
    const newProp: SchemaProperty = { id: newPropId, name, type };

    // Auto-add to active view's visible properties
    const updatedViews = { ...state.views };
    if (state.activeViewId) {
      const activeView = updatedViews[state.activeViewId];
      if (activeView && activeView.databaseId === databaseId) {
        updatedViews[state.activeViewId] = {
          ...activeView,
          visibleProperties: [...activeView.visibleProperties, newPropId]
        };
      }
    }

    return {
      databases: {
        ...state.databases,
        [databaseId]: { ...db, properties: { ...db.properties, [newPropId]: newProp } }
      },
      views: updatedViews
    };
  }),

  insertPropertyAt: (databaseId, name, type, viewId, afterPropId) => set((state) => {
    const db = state.databases[databaseId];
    if (!db) return state;
    const newPropId = `prop-${uuidv4().slice(0, 8)}`;
    const newProp: SchemaProperty = { id: newPropId, name, type };

    const updatedViews = { ...state.views };
    const view = updatedViews[viewId];
    if (view) {
      const visProps = [...view.visibleProperties];
      if (afterPropId === null) {
        visProps.unshift(newPropId); // insert at start
      } else {
        const idx = visProps.indexOf(afterPropId);
        visProps.splice(idx + 1, 0, newPropId);
      }
      updatedViews[viewId] = { ...view, visibleProperties: visProps };
    }

    return {
      databases: {
        ...state.databases,
        [databaseId]: { ...db, properties: { ...db.properties, [newPropId]: newProp } }
      },
      views: updatedViews
    };
  }),

  updateProperty: (databaseId, propertyId, updates) => set((state) => {
    const db = state.databases[databaseId];
    if (!db || !db.properties[propertyId]) return state;
    return {
      databases: {
        ...state.databases,
        [databaseId]: {
          ...db,
          properties: {
            ...db.properties,
            [propertyId]: { ...db.properties[propertyId], ...updates }
          }
        }
      }
    };
  }),

  deleteProperty: (databaseId, propertyId) => set((state) => {
    const db = state.databases[databaseId];
    if (!db) return state;
    const { [propertyId]: _, ...remainingProps } = db.properties;

    // Remove from all views
    const updatedViews = { ...state.views };
    Object.keys(updatedViews).forEach(vId => {
      const v = updatedViews[vId];
      if (v.databaseId === databaseId) {
        updatedViews[vId] = {
          ...v,
          visibleProperties: v.visibleProperties.filter(id => id !== propertyId)
        };
      }
    });

    return {
      databases: { ...state.databases, [databaseId]: { ...db, properties: remainingProps } },
      views: updatedViews
    };
  }),

  togglePropertyVisibility: (viewId, propertyId) => set((state) => {
    const view = state.views[viewId];
    if (!view) return state;
    const isVisible = view.visibleProperties.includes(propertyId);
    return {
      views: {
        ...state.views,
        [viewId]: {
          ...view,
          visibleProperties: isVisible
            ? view.visibleProperties.filter(id => id !== propertyId)
            : [...view.visibleProperties, propertyId]
        }
      }
    };
  }),

  hideAllProperties: (viewId) => set((state) => {
    const view = state.views[viewId];
    if (!view) return state;
    const db = state.databases[view.databaseId];
    // Always keep the title property visible
    const titlePropId = db?.titlePropertyId;
    return {
      views: {
        ...state.views,
        [viewId]: { ...view, visibleProperties: titlePropId ? [titlePropId] : [] }
      }
    };
  }),

  reorderProperties: (viewId, propertyIds) => set((state) => {
    const view = state.views[viewId];
    if (!view) return state;
    return {
      views: { ...state.views, [viewId]: { ...view, visibleProperties: propertyIds } }
    };
  }),

  addSelectOption: (databaseId, propertyId, option) => set((state) => {
    const db = state.databases[databaseId];
    if (!db) return state;
    const prop = db.properties[propertyId];
    if (!prop || (prop.type !== 'select' && prop.type !== 'multi_select')) return state;
    return {
      databases: {
        ...state.databases,
        [databaseId]: {
          ...db,
          properties: {
            ...db.properties,
            [propertyId]: { ...prop, options: [...(prop.options || []), option] }
          }
        }
      }
    };
  }),

  // ─── UI STATE ──────────────────────────────────────────────

  openPage: (pageId) => set({ openPageId: pageId }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  // ─── COMPUTED HELPERS ──────────────────────────────────────

  getPageTitle: (page: Page) => {
    const state = get();
    const db = state.databases[page.databaseId];
    if (!db) return 'Untitled';
    const titlePropId = db.titlePropertyId;
    return page.properties[titlePropId] || 'Untitled';
  },

  getPagesForView: (viewId) => {
    const state = get();
    const view = state.views[viewId];
    if (!view) return [];
    const db = state.databases[view.databaseId];
    if (!db) return [];

    // ── Cache: invalidate when pages/views refs or searchQuery changes ──
    if (
      pagesForViewCache.pagesRef !== state.pages ||
      pagesForViewCache.viewsRef !== state.views ||
      pagesForViewCache.searchQuery !== state.searchQuery
    ) {
      pagesForViewCache = {
        pagesRef: state.pages,
        viewsRef: state.views,
        searchQuery: state.searchQuery,
        results: new Map(),
      };
    }
    const cached = pagesForViewCache.results.get(viewId);
    if (cached) return cached;

    let result = Object.values(state.pages)
      .filter(p => p.databaseId === view.databaseId && !p.archived);

    // Global search filter — resolves option IDs, relation page titles, etc.
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      result = result.filter(page => {
        return Object.entries(page.properties).some(([propId, val]) => {
          if (val == null || val === '') return false;
          const prop = db.properties[propId];
          if (!prop) {
            // Unknown property — fall back to raw string match
            return typeof val === 'string' && val.toLowerCase().includes(q);
          }
          switch (prop.type) {
            case 'select':
            case 'status': {
              const opt = prop.options?.find(o => o.id === val);
              return opt ? opt.value.toLowerCase().includes(q) : false;
            }
            case 'multi_select': {
              if (!Array.isArray(val)) return false;
              return val.some(id => {
                const opt = prop.options?.find(o => o.id === id);
                return opt ? opt.value.toLowerCase().includes(q) : false;
              });
            }
            case 'relation': {
              if (!Array.isArray(val)) return false;
              return val.some(rid => {
                const relPage = state.pages[rid];
                if (!relPage) return false;
                const relDb = state.databases[relPage.databaseId];
                const tpId = relDb?.titlePropertyId;
                if (!tpId) return false;
                const t = relPage.properties[tpId];
                return typeof t === 'string' && t.toLowerCase().includes(q);
              });
            }
            case 'checkbox':
              return (val ? 'true yes checked' : 'false no unchecked').includes(q);
            default: {
              if (typeof val === 'string') return val.toLowerCase().includes(q);
              if (Array.isArray(val)) return val.some(v => String(v).toLowerCase().includes(q));
              return String(val).toLowerCase().includes(q);
            }
          }
        });
      });
    }

    // Apply filters
    if (view.filters.length > 0) {
      result = result.filter(page => {
        const results = view.filters.map(filter => {
          const prop = db.properties[filter.propertyId];
          return evaluateFilter(page, filter, prop);
        });
        return view.filterConjunction === 'or'
          ? results.some(Boolean)
          : results.every(Boolean);
      });
    }

    // Apply sorts (multi-sort: first sort has highest priority)
    if (view.sorts.length > 0) {
      result.sort((a, b) => {
        for (const sort of view.sorts) {
          const cmp = compareValues(
            a.properties[sort.propertyId],
            b.properties[sort.propertyId],
            sort.direction
          );
          if (cmp !== 0) return cmp;
        }
        return 0;
      });
    }

    pagesForViewCache.results.set(viewId, result);
    return result;
  },

  getGroupedPages: (viewId) => {
    const state = get();
    const view = state.views[viewId];
    if (!view || !view.grouping) return [];
    const db = state.databases[view.databaseId];
    if (!db) return [];

    const pages = state.getPagesForView(viewId);
    const groupProp = db.properties[view.grouping.propertyId];
    if (!groupProp) return [];

    if ((groupProp.type === 'select' || groupProp.type === 'status') && groupProp.options) {
      const groups = [
        { groupId: '__unassigned__', groupLabel: 'No ' + groupProp.name, groupColor: 'bg-surface-muted text-ink-body', pages: [] as Page[] },
        ...groupProp.options.map(opt => ({
          groupId: opt.id,
          groupLabel: opt.value,
          groupColor: opt.color,
          pages: [] as Page[],
        }))
      ];

      const groupMap = new Map(groups.map(g => [g.groupId, g]));

      for (const page of pages) {
        const val = page.properties[view.grouping.propertyId];
        const group = groupMap.get(val) || groupMap.get('__unassigned__')!;
        group.pages.push(page);
      }

      // Filter hidden groups
      const hidden = view.grouping.hiddenGroups || [];
      return groups.filter(g => !hidden.includes(g.groupId));
    }

    if (groupProp.type === 'checkbox') {
      const checked: Page[] = [];
      const unchecked: Page[] = [];
      for (const page of pages) {
        if (page.properties[view.grouping.propertyId]) {
          checked.push(page);
        } else {
          unchecked.push(page);
        }
      }
      return [
        { groupId: 'unchecked', groupLabel: 'Unchecked', groupColor: 'bg-surface-muted text-ink-body', pages: unchecked },
        { groupId: 'checked', groupLabel: 'Checked', groupColor: 'bg-success-surface-medium text-success-text-tag', pages: checked },
      ];
    }

    // Fallback: group by unique values
    const groupMap = new Map<string, Page[]>();
    for (const page of pages) {
      const val = String(page.properties[view.grouping.propertyId] ?? 'Unassigned');
      if (!groupMap.has(val)) groupMap.set(val, []);
      groupMap.get(val)!.push(page);
    }
    return Array.from(groupMap.entries()).map(([key, pages]) => ({
      groupId: key,
      groupLabel: key,
      groupColor: 'bg-surface-muted text-ink-body',
      pages
    }));
  },

  resolveFormula: (databaseId, page, expression) => {
    // ═══ WASM-POWERED FORMULA ENGINE ═══
    // Uses Rust/WASM engine for blazing-fast evaluation,
    // with TypeScript fallback while WASM loads.

    // ── Check formula cache first ──
    const cached = getCachedFormula(expression, page.id, page.updatedAt);
    if (cached !== undefined) return cached;

    try {
      const state = get();
      const db = state.databases[databaseId];
      if (!db) return '#ERROR';

      // Build property map for the WASM engine
      const props: Record<string, any> = {};
      for (const schemaProp of Object.values(db.properties)) {
        const val = page.properties[schemaProp.id];
        props[schemaProp.name] = val === undefined ? null : val;
      }

      // Try WASM engine first
      try {
        if (isWasmReady()) {
          const result = evalFormula(expression, props);
          let formatted: any;
          // Format the result — only return if WASM produced a real value
          if (result instanceof Date) {
            formatted = result.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          } else if (typeof result === 'number' && isFinite(result)) {
            formatted = Math.round(result * 100) / 100;
          } else if (Array.isArray(result)) {
            formatted = result.join(', ');
          } else if (typeof result === 'boolean') {
            formatted = result;
          } else if (typeof result === 'string' && result !== '') {
            formatted = result;
          }
          if (formatted !== undefined) {
            setCachedFormula(expression, page.id, page.updatedAt, formatted);
            return formatted;
          }
          // WASM returned no usable result
        }
      } catch {
        // WASM evaluation failed
      }

      // No result from WASM engine
      return '';
    } catch {
      setCachedFormula(expression, page.id, page.updatedAt, '#ERROR');
      return '#ERROR';
    }
  },

  resolveRollup: (databaseId, page, propertyId) => {
    const state = get();
    const db = state.databases[databaseId];
    if (!db) return null;
    const prop = db.properties[propertyId];
    if (!prop?.rollupConfig) return null;

    const { relationPropertyId, targetPropertyId, function: fn } = prop.rollupConfig;
    const relatedPageIds: string[] = page.properties[relationPropertyId] || [];
    const relatedPages = relatedPageIds.map(id => state.pages[id]).filter(Boolean);
    const rawValues = relatedPages.map(p => p.properties[targetPropertyId]);
    const nonEmpty = rawValues.filter(v => v !== undefined && v !== null && v !== '' && v !== false);
    const numericValues = nonEmpty.map(Number).filter(n => !isNaN(n));

    switch (fn) {
      // ── Show ──
      case 'show_original': return rawValues;
      case 'show_unique': return [...new Set(rawValues.filter(v => v !== undefined && v !== null))];
      // ── Count ──
      case 'count':
      case 'count_all': return relatedPages.length;
      case 'count_values': return nonEmpty.length;
      case 'count_unique_values': return new Set(nonEmpty).size;
      case 'count_empty': return rawValues.length - nonEmpty.length;
      case 'count_not_empty': return nonEmpty.length;
      // ── Percent ──
      case 'percent_empty': return rawValues.length ? Math.round((rawValues.length - nonEmpty.length) / rawValues.length * 100) : 0;
      case 'percent_not_empty': return rawValues.length ? Math.round(nonEmpty.length / rawValues.length * 100) : 0;
      // ── Numeric aggregations ──
      case 'sum': return numericValues.reduce((a, b) => a + b, 0);
      case 'average': return numericValues.length ? Math.round(numericValues.reduce((a, b) => a + b, 0) / numericValues.length * 100) / 100 : 0;
      case 'median': {
        if (!numericValues.length) return 0;
        const sorted = [...numericValues].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      }
      case 'min': return numericValues.length ? Math.min(...numericValues) : 0;
      case 'max': return numericValues.length ? Math.max(...numericValues) : 0;
      case 'range': return numericValues.length ? Math.max(...numericValues) - Math.min(...numericValues) : 0;
      default: return null;
    }
  },

  // ─── SMART DEFAULTS ENGINE ─────────────────────────────────
  getSmartDefaults: (databaseId) => {
    const state = get();
    const db = state.databases[databaseId];
    if (!db) return { suggestedView: 'table' };

    const props = Object.values(db.properties);
    const hasStatus = props.some(p => p.type === 'status' || (p.type === 'select' && /status|stage|phase/i.test(p.name)));
    const hasDate = props.some(p => p.type === 'date');
    const selectProp = props.find(p => p.type === 'status' || p.type === 'select');
    const dateProp = props.find(p => p.type === 'date');

    let suggestedView = 'table';
    if (hasStatus) suggestedView = 'board';
    else if (hasDate) suggestedView = 'calendar';

    return {
      suggestedView,
      suggestedGroupBy: selectProp?.id,
      suggestedSortBy: dateProp ? { propertyId: dateProp.id, direction: 'asc' as const } : undefined,
      suggestedCalendarBy: dateProp?.id,
      suggestedTimelineBy: dateProp?.id,
    };
  },
}));
