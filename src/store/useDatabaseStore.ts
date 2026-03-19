import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
  DatabaseSchema, Page, ViewConfig, PropertyType, ViewSettings,
  SelectOption, Filter, Sort, Grouping, Block, SchemaProperty,
  FilterOperator, StatusGroup
} from '../types/database';
import { DB_PRODUCTS, productDatabase, productPages, productViews } from './productSeed';
import {
  DB_PROJECTS, projectDatabase, projectPages, projectViews,
  reverseRelationProps, reverseRelationData,
} from './relationSeed';

// Initialize WASM formula engine (async, non-blocking)
import { initFormulaEngine, evalFormula, isWasmReady } from '../lib/engine/bridge';
initFormulaEngine().catch(() => {});

// ─── Formula result cache ─────────────────────────────────────────────────────
// Key: `${expression}::${pageId}::${updatedAt}` → result
// Invalidated automatically when page.updatedAt changes (any property edit).
const formulaCache = new Map<string, any>();
const FORMULA_CACHE_MAX = 10000;

function getCachedFormula(expression: string, pageId: string, updatedAt: string): any | undefined {
  return formulaCache.get(`${expression}::${pageId}::${updatedAt}`);
}

function setCachedFormula(expression: string, pageId: string, updatedAt: string, value: any): void {
  if (formulaCache.size >= FORMULA_CACHE_MAX) {
    // Evict oldest 25%
    const keys = formulaCache.keys();
    const evictCount = FORMULA_CACHE_MAX / 4;
    for (let i = 0; i < evictCount; i++) {
      const k = keys.next();
      if (k.done) break;
      formulaCache.delete(k.value);
    }
  }
  formulaCache.set(`${expression}::${pageId}::${updatedAt}`, value);
}

// ─── getPagesForView cache ────────────────────────────────────────────────────
// Invalidated by reference equality on pages/views + searchQuery string.
let pagesForViewCache: {
  pagesRef: Record<string, any> | null;
  viewsRef: Record<string, any> | null;
  searchQuery: string;
  results: Map<string, any[]>;
} = { pagesRef: null, viewsRef: null, searchQuery: '', results: new Map() };

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
// INITIAL DATA — 4 DATABASES WITH RICH SEED DATA
// ═══════════════════════════════════════════════════════════════════════════════

const DB_TASKS = 'db-tasks';
const DB_CRM = 'db-crm';
const DB_CONTENT = 'db-content';
const DB_INVENTORY = 'db-inventory';

const initialDatabases: Record<string, DatabaseSchema> = {
  [DB_TASKS]: {
    id: DB_TASKS,
    name: 'Tasks & Projects',
    icon: '📋',
    titlePropertyId: 'prop-title',
    properties: {
      'prop-title': { id: 'prop-title', name: 'Task Name', type: 'title' },
      'prop-status': {
        id: 'prop-status', name: 'Status', type: 'status',
        options: [
          { id: 'opt-todo', value: 'To Do', color: 'bg-gray-200 text-gray-800' },
          { id: 'opt-in-progress', value: 'In Progress', color: 'bg-blue-200 text-blue-800' },
          { id: 'opt-review', value: 'In Review', color: 'bg-yellow-200 text-yellow-800' },
          { id: 'opt-done', value: 'Done', color: 'bg-green-200 text-green-800' },
          { id: 'opt-blocked', value: 'Blocked', color: 'bg-red-200 text-red-800' }
        ],
        statusGroups: [
          { id: 'sg-todo', label: 'To Do', color: 'bg-gray-200 text-gray-800', optionIds: ['opt-todo'] },
          { id: 'sg-progress', label: 'In Progress', color: 'bg-blue-200 text-blue-800', optionIds: ['opt-in-progress', 'opt-review', 'opt-blocked'] },
          { id: 'sg-done', label: 'Done', color: 'bg-green-200 text-green-800', optionIds: ['opt-done'] }
        ]
      },
      'prop-priority': {
        id: 'prop-priority', name: 'Priority', type: 'select',
        options: [
          { id: 'pri-low', value: 'Low', color: 'bg-gray-100 text-gray-700' },
          { id: 'pri-med', value: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
          { id: 'pri-high', value: 'High', color: 'bg-orange-100 text-orange-800' },
          { id: 'pri-urgent', value: 'Urgent', color: 'bg-red-100 text-red-800' }
        ]
      },
      'prop-tags': {
        id: 'prop-tags', name: 'Tags', type: 'multi_select',
        options: [
          { id: 'tag-bug', value: 'Bug', color: 'bg-red-100 text-red-800' },
          { id: 'tag-feature', value: 'Feature', color: 'bg-purple-100 text-purple-800' },
          { id: 'tag-design', value: 'Design', color: 'bg-pink-100 text-pink-800' },
          { id: 'tag-infra', value: 'Infrastructure', color: 'bg-cyan-100 text-cyan-800' },
          { id: 'tag-docs', value: 'Documentation', color: 'bg-indigo-100 text-indigo-800' }
        ]
      },
      'prop-assignee': { id: 'prop-assignee', name: 'Assignee', type: 'person' },
      'prop-due': { id: 'prop-due', name: 'Due Date', type: 'date' },
      'prop-done': { id: 'prop-done', name: 'Completed', type: 'checkbox' },
      'prop-points': { id: 'prop-points', name: 'Story Points', type: 'number' },
      'prop-created': { id: 'prop-created', name: 'Created', type: 'created_time' },
      'prop-task-id': { id: 'prop-task-id', name: 'Task ID', type: 'id', prefix: 'TASK-', autoIncrement: 9 },
    }
  },
  [DB_CRM]: {
    id: DB_CRM,
    name: 'CRM / Contacts',
    icon: '👥',
    titlePropertyId: 'prop-name',
    properties: {
      'prop-name': { id: 'prop-name', name: 'Contact Name', type: 'title' },
      'prop-company': { id: 'prop-company', name: 'Company', type: 'text' },
      'prop-stage': {
        id: 'prop-stage', name: 'Stage', type: 'select',
        options: [
          { id: 'crm-lead', value: 'Lead', color: 'bg-yellow-100 text-yellow-800' },
          { id: 'crm-qualified', value: 'Qualified', color: 'bg-blue-100 text-blue-800' },
          { id: 'crm-proposal', value: 'Proposal', color: 'bg-purple-100 text-purple-800' },
          { id: 'crm-negotiation', value: 'Negotiation', color: 'bg-orange-100 text-orange-800' },
          { id: 'crm-customer', value: 'Customer', color: 'bg-green-100 text-green-800' },
          { id: 'crm-lost', value: 'Lost', color: 'bg-red-100 text-red-800' }
        ]
      },
      'prop-value': { id: 'prop-value', name: 'Deal Value ($)', type: 'number' },
      'prop-email': { id: 'prop-email', name: 'Email', type: 'email' },
      'prop-phone': { id: 'prop-phone', name: 'Phone', type: 'phone' },
      'prop-last-contact': { id: 'prop-last-contact', name: 'Last Contact', type: 'date' },
      'prop-vip': { id: 'prop-vip', name: 'VIP', type: 'checkbox' },
      'prop-source': {
        id: 'prop-source', name: 'Source', type: 'select',
        options: [
          { id: 'src-web', value: 'Website', color: 'bg-blue-100 text-blue-800' },
          { id: 'src-ref', value: 'Referral', color: 'bg-green-100 text-green-800' },
          { id: 'src-cold', value: 'Cold Outreach', color: 'bg-gray-100 text-gray-800' }
        ]
      },
    }
  },
  [DB_CONTENT]: {
    id: DB_CONTENT,
    name: 'Content Calendar',
    icon: '📝',
    titlePropertyId: 'prop-title',
    properties: {
      'prop-title': { id: 'prop-title', name: 'Title', type: 'title' },
      'prop-platform': {
        id: 'prop-platform', name: 'Platform', type: 'multi_select',
        options: [
          { id: 'plat-tw', value: 'Twitter', color: 'bg-blue-100 text-blue-800' },
          { id: 'plat-li', value: 'LinkedIn', color: 'bg-blue-200 text-blue-900' },
          { id: 'plat-yt', value: 'YouTube', color: 'bg-red-100 text-red-800' },
          { id: 'plat-blog', value: 'Blog', color: 'bg-green-100 text-green-800' },
          { id: 'plat-news', value: 'Newsletter', color: 'bg-violet-100 text-violet-800' }
        ]
      },
      'prop-status': {
        id: 'prop-status', name: 'Status', type: 'select',
        options: [
          { id: 'con-idea', value: 'Idea', color: 'bg-gray-200 text-gray-800' },
          { id: 'con-draft', value: 'Drafting', color: 'bg-yellow-100 text-yellow-800' },
          { id: 'con-review', value: 'In Review', color: 'bg-orange-100 text-orange-800' },
          { id: 'con-scheduled', value: 'Scheduled', color: 'bg-blue-100 text-blue-800' },
          { id: 'con-pub', value: 'Published', color: 'bg-green-200 text-green-800' }
        ]
      },
      'prop-date': { id: 'prop-date', name: 'Publish Date', type: 'date' },
      'prop-author': { id: 'prop-author', name: 'Author', type: 'person' },
      'prop-approved': { id: 'prop-approved', name: 'Approved', type: 'checkbox' },
      'prop-url': { id: 'prop-url', name: 'URL', type: 'url' },
    }
  },
  [DB_INVENTORY]: {
    id: DB_INVENTORY,
    name: 'Asset Inventory',
    icon: '📦',
    titlePropertyId: 'prop-name',
    properties: {
      'prop-name': { id: 'prop-name', name: 'Asset Name', type: 'title' },
      'prop-category': {
        id: 'prop-category', name: 'Category', type: 'select',
        options: [
          { id: 'cat-hw', value: 'Hardware', color: 'bg-gray-200 text-gray-800' },
          { id: 'cat-sw', value: 'Software', color: 'bg-blue-100 text-blue-800' },
          { id: 'cat-furn', value: 'Furniture', color: 'bg-yellow-100 text-yellow-800' },
          { id: 'cat-vehicle', value: 'Vehicle', color: 'bg-green-100 text-green-800' }
        ]
      },
      'prop-serial': { id: 'prop-serial', name: 'Serial Number', type: 'text' },
      'prop-price': { id: 'prop-price', name: 'Price ($)', type: 'number' },
      'prop-purchase': { id: 'prop-purchase', name: 'Purchase Date', type: 'date' },
      'prop-active': { id: 'prop-active', name: 'In Service', type: 'checkbox' },
      'prop-location': { id: 'prop-location', name: 'Location', type: 'place' },
      'prop-inv-id': { id: 'prop-inv-id', name: 'Asset ID', type: 'id', prefix: 'INV-', autoIncrement: 6 },
    }
  },
  [DB_PRODUCTS]: productDatabase,
  [DB_PROJECTS]: projectDatabase,
};

// Merge reverse-relation properties into existing databases
for (const [dbId, props] of Object.entries(reverseRelationProps)) {
  if (initialDatabases[dbId]) {
    Object.assign(initialDatabases[dbId].properties, props);
  }
}

const now = new Date().toISOString();
const d = (daysOffset: number) => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString();
};

const initialPages: Record<string, Page> = {
  // ─── Tasks ───
  't1': { id: 't1', databaseId: DB_TASKS, icon: '🎨', properties: { 'prop-title': 'Design Database Schema', 'prop-status': 'opt-done', 'prop-priority': 'pri-high', 'prop-tags': ['tag-design'], 'prop-assignee': 'Alice', 'prop-due': d(-4), 'prop-done': true, 'prop-points': 5, 'prop-task-id': 'TASK-1' }, content: [{ id: 'b1', type: 'paragraph', content: 'Define the core data structures for the database system.' }], createdAt: d(-10), updatedAt: d(-1), createdBy: 'Alice', lastEditedBy: 'Alice' },
  't2': { id: 't2', databaseId: DB_TASKS, icon: '⚙️', properties: { 'prop-title': 'Implement View Engine', 'prop-status': 'opt-in-progress', 'prop-priority': 'pri-urgent', 'prop-tags': ['tag-feature'], 'prop-assignee': 'Bob', 'prop-due': d(2), 'prop-done': false, 'prop-points': 13, 'prop-task-id': 'TASK-2' }, content: [{ id: 'b2', type: 'paragraph', content: 'Build the core view engine that powers table, board, calendar, timeline, gallery, list views.' }], createdAt: d(-7), updatedAt: now, createdBy: 'Bob', lastEditedBy: 'Bob' },
  't3': { id: 't3', databaseId: DB_TASKS, icon: '🐛', properties: { 'prop-title': 'Fix Drag-and-Drop Bug', 'prop-status': 'opt-todo', 'prop-priority': 'pri-med', 'prop-tags': ['tag-bug'], 'prop-assignee': 'Charlie', 'prop-due': d(5), 'prop-done': false, 'prop-points': 3, 'prop-task-id': 'TASK-3' }, content: [], createdAt: d(-3), updatedAt: d(-3), createdBy: 'Charlie', lastEditedBy: 'Charlie' },
  't4': { id: 't4', databaseId: DB_TASKS, icon: '📖', properties: { 'prop-title': 'Write API Documentation', 'prop-status': 'opt-todo', 'prop-priority': 'pri-low', 'prop-tags': ['tag-docs'], 'prop-assignee': 'Alice', 'prop-due': d(10), 'prop-done': false, 'prop-points': 2, 'prop-task-id': 'TASK-4' }, content: [], createdAt: d(-2), updatedAt: d(-2), createdBy: 'Alice', lastEditedBy: 'Alice' },
  't5': { id: 't5', databaseId: DB_TASKS, icon: '🚀', properties: { 'prop-title': 'Deploy to Production', 'prop-status': 'opt-blocked', 'prop-priority': 'pri-high', 'prop-tags': ['tag-infra'], 'prop-assignee': 'Bob', 'prop-due': d(7), 'prop-done': false, 'prop-points': 8, 'prop-task-id': 'TASK-5' }, content: [], createdAt: d(-1), updatedAt: d(-1), createdBy: 'Bob', lastEditedBy: 'Bob' },
  't6': { id: 't6', databaseId: DB_TASKS, icon: '🧪', properties: { 'prop-title': 'Write Integration Tests', 'prop-status': 'opt-review', 'prop-priority': 'pri-med', 'prop-tags': ['tag-feature', 'tag-infra'], 'prop-assignee': 'Diana', 'prop-due': d(3), 'prop-done': false, 'prop-points': 5, 'prop-task-id': 'TASK-6' }, content: [], createdAt: d(-5), updatedAt: now, createdBy: 'Diana', lastEditedBy: 'Diana' },
  't7': { id: 't7', databaseId: DB_TASKS, icon: '🎯', properties: { 'prop-title': 'Performance Optimization', 'prop-status': 'opt-in-progress', 'prop-priority': 'pri-high', 'prop-tags': ['tag-infra'], 'prop-assignee': 'Eve', 'prop-due': d(4), 'prop-done': false, 'prop-points': 8, 'prop-task-id': 'TASK-7' }, content: [], createdAt: d(-4), updatedAt: now, createdBy: 'Eve', lastEditedBy: 'Eve' },
  't8': { id: 't8', databaseId: DB_TASKS, icon: '💅', properties: { 'prop-title': 'UI Polish Pass', 'prop-status': 'opt-todo', 'prop-priority': 'pri-med', 'prop-tags': ['tag-design'], 'prop-assignee': 'Alice', 'prop-due': d(8), 'prop-done': false, 'prop-points': 3, 'prop-task-id': 'TASK-8' }, content: [], createdAt: d(-1), updatedAt: d(-1), createdBy: 'Alice', lastEditedBy: 'Alice' },

  // ─── CRM ───
  'c1': { id: 'c1', databaseId: DB_CRM, icon: '🏢', properties: { 'prop-name': 'Acme Corporation', 'prop-company': 'Acme Inc', 'prop-stage': 'crm-customer', 'prop-value': 50000, 'prop-email': 'contact@acme.com', 'prop-phone': '+1-555-0100', 'prop-last-contact': d(-2), 'prop-vip': true, 'prop-source': 'src-ref' }, content: [], createdAt: d(-30), updatedAt: d(-2), createdBy: 'Alice', lastEditedBy: 'Alice' },
  'c2': { id: 'c2', databaseId: DB_CRM, icon: '🌐', properties: { 'prop-name': 'Globex Industries', 'prop-company': 'Globex Corp', 'prop-stage': 'crm-lead', 'prop-value': 120000, 'prop-email': 'sales@globex.com', 'prop-phone': '+1-555-0200', 'prop-last-contact': d(-1), 'prop-vip': false, 'prop-source': 'src-web' }, content: [], createdAt: d(-14), updatedAt: d(-1), createdBy: 'Bob', lastEditedBy: 'Bob' },
  'c3': { id: 'c3', databaseId: DB_CRM, properties: { 'prop-name': 'Initech Systems', 'prop-company': 'Initech LLC', 'prop-stage': 'crm-proposal', 'prop-value': 15000, 'prop-email': 'info@initech.com', 'prop-phone': '+1-555-0300', 'prop-last-contact': d(-5), 'prop-vip': false, 'prop-source': 'src-cold' }, content: [], createdAt: d(-20), updatedAt: d(-5), createdBy: 'Charlie', lastEditedBy: 'Charlie' },
  'c4': { id: 'c4', databaseId: DB_CRM, properties: { 'prop-name': 'Soylent Corp', 'prop-company': 'Soylent Corp', 'prop-stage': 'crm-lost', 'prop-value': 80000, 'prop-email': 'hello@soylent.com', 'prop-phone': '+1-555-0400', 'prop-last-contact': d(-40), 'prop-vip': false, 'prop-source': 'src-ref' }, content: [], createdAt: d(-60), updatedAt: d(-40), createdBy: 'Alice', lastEditedBy: 'Alice' },
  'c5': { id: 'c5', databaseId: DB_CRM, icon: '⭐', properties: { 'prop-name': 'Umbrella Corp', 'prop-company': 'Umbrella Corp', 'prop-stage': 'crm-negotiation', 'prop-value': 250000, 'prop-email': 'deals@umbrella.com', 'prop-phone': '+1-555-0500', 'prop-last-contact': d(0), 'prop-vip': true, 'prop-source': 'src-web' }, content: [], createdAt: d(-7), updatedAt: now, createdBy: 'Bob', lastEditedBy: 'Bob' },
  'c6': { id: 'c6', databaseId: DB_CRM, properties: { 'prop-name': 'Cyberdyne Tech', 'prop-company': 'Cyberdyne', 'prop-stage': 'crm-qualified', 'prop-value': 45000, 'prop-email': 'sales@cyberdyne.io', 'prop-last-contact': d(-3), 'prop-vip': false, 'prop-source': 'src-web' }, content: [], createdAt: d(-10), updatedAt: d(-3), createdBy: 'Diana', lastEditedBy: 'Diana' },

  // ─── Content ───
  'ct1': { id: 'ct1', databaseId: DB_CONTENT, icon: '✍️', properties: { 'prop-title': '10 Tips for React Performance', 'prop-platform': ['plat-tw', 'plat-li'], 'prop-status': 'con-pub', 'prop-date': d(-8), 'prop-author': 'Alice', 'prop-approved': true, 'prop-url': 'https://blog.example.com/react-tips' }, content: [{ id: 'b3', type: 'paragraph', content: 'React performance optimization guide covering memoization, virtualization, and code splitting strategies.' }], createdAt: d(-15), updatedAt: d(-8), createdBy: 'Alice', lastEditedBy: 'Alice' },
  'ct2': { id: 'ct2', databaseId: DB_CONTENT, properties: { 'prop-title': 'State Management in 2026', 'prop-platform': ['plat-blog'], 'prop-status': 'con-draft', 'prop-date': d(3), 'prop-author': 'Bob', 'prop-approved': false }, content: [], createdAt: d(-5), updatedAt: d(-1), createdBy: 'Bob', lastEditedBy: 'Bob' },
  'ct3': { id: 'ct3', databaseId: DB_CONTENT, properties: { 'prop-title': 'Vite vs Webpack Deep Dive', 'prop-platform': ['plat-yt'], 'prop-status': 'con-idea', 'prop-date': d(15), 'prop-author': 'Charlie', 'prop-approved': false }, content: [], createdAt: d(-2), updatedAt: d(-2), createdBy: 'Charlie', lastEditedBy: 'Charlie' },
  'ct4': { id: 'ct4', databaseId: DB_CONTENT, icon: '📧', properties: { 'prop-title': 'Monthly Product Update', 'prop-platform': ['plat-news'], 'prop-status': 'con-review', 'prop-date': d(1), 'prop-author': 'Diana', 'prop-approved': false }, content: [], createdAt: d(-3), updatedAt: now, createdBy: 'Diana', lastEditedBy: 'Diana' },
  'ct5': { id: 'ct5', databaseId: DB_CONTENT, properties: { 'prop-title': 'TypeScript 6.0 First Look', 'prop-platform': ['plat-blog', 'plat-tw'], 'prop-status': 'con-scheduled', 'prop-date': d(5), 'prop-author': 'Alice', 'prop-approved': true }, content: [], createdAt: d(-1), updatedAt: d(-1), createdBy: 'Alice', lastEditedBy: 'Alice' },

  // ─── Inventory ───
  'i1': { id: 'i1', databaseId: DB_INVENTORY, icon: '💻', properties: { 'prop-name': 'MacBook Pro M3', 'prop-category': 'cat-hw', 'prop-serial': 'C02X12345', 'prop-price': 2499, 'prop-purchase': d(-90), 'prop-active': true, 'prop-location': { address: 'Office A — Building 1, Floor 2' }, 'prop-inv-id': 'INV-1' }, content: [], createdAt: d(-90), updatedAt: d(-90), createdBy: 'Alice', lastEditedBy: 'Alice' },
  'i2': { id: 'i2', databaseId: DB_INVENTORY, icon: '🎨', properties: { 'prop-name': 'Figma Enterprise', 'prop-category': 'cat-sw', 'prop-serial': 'LIC-998877', 'prop-price': 540, 'prop-purchase': d(-60), 'prop-active': true, 'prop-location': { address: 'Cloud' }, 'prop-inv-id': 'INV-2' }, content: [], createdAt: d(-60), updatedAt: d(-60), createdBy: 'Alice', lastEditedBy: 'Alice' },
  'i3': { id: 'i3', databaseId: DB_INVENTORY, icon: '🪑', properties: { 'prop-name': 'Herman Miller Aeron', 'prop-category': 'cat-furn', 'prop-serial': 'HM-445566', 'prop-price': 1200, 'prop-purchase': d(-200), 'prop-active': true, 'prop-location': { address: 'Office B — Building 2, Floor 1' }, 'prop-inv-id': 'INV-3' }, content: [], createdAt: d(-200), updatedAt: d(-200), createdBy: 'Bob', lastEditedBy: 'Bob' },
  'i4': { id: 'i4', databaseId: DB_INVENTORY, icon: '🖥️', properties: { 'prop-name': 'Dell UltraSharp 32"', 'prop-category': 'cat-hw', 'prop-serial': 'DL-112233', 'prop-price': 899, 'prop-purchase': d(-120), 'prop-active': true, 'prop-location': { address: 'Office A — Building 1, Floor 2' }, 'prop-inv-id': 'INV-4' }, content: [], createdAt: d(-120), updatedAt: d(-120), createdBy: 'Charlie', lastEditedBy: 'Charlie' },
  'i5': { id: 'i5', databaseId: DB_INVENTORY, properties: { 'prop-name': 'Standing Desk Frame', 'prop-category': 'cat-furn', 'prop-serial': 'SD-778899', 'prop-price': 450, 'prop-purchase': d(-180), 'prop-active': false, 'prop-location': { address: 'Storage B-3' }, 'prop-inv-id': 'INV-5' }, content: [], createdAt: d(-180), updatedAt: d(-30), createdBy: 'Diana', lastEditedBy: 'Diana' },
  ...productPages,
  ...projectPages,
};

// Merge reverse-relation data into existing pages
for (const [pageId, propPatch] of Object.entries(reverseRelationData)) {
  if (initialPages[pageId]) {
    Object.assign(initialPages[pageId].properties, propPatch);
  }
}

// Also add 'prop-project' to Tasks visible properties for the table view
// (done at view level below)

const initialViews: Record<string, ViewConfig> = {
  // ─── Tasks Views ───
  'v-tasks-table': { id: 'v-tasks-table', databaseId: DB_TASKS, name: 'All Tasks', type: 'table', filters: [], filterConjunction: 'and', sorts: [], visibleProperties: ['prop-title', 'prop-status', 'prop-priority', 'prop-tags', 'prop-assignee', 'prop-due', 'prop-done', 'prop-points', 'prop-project'], settings: { showVerticalLines: true } },
  'v-tasks-board': { id: 'v-tasks-board', databaseId: DB_TASKS, name: 'Board', type: 'board', filters: [], filterConjunction: 'and', sorts: [], grouping: { propertyId: 'prop-status' }, visibleProperties: ['prop-title', 'prop-priority', 'prop-tags', 'prop-assignee', 'prop-due', 'prop-points'], settings: { colorColumns: true, cardSize: 'medium' } },
  'v-tasks-timeline': { id: 'v-tasks-timeline', databaseId: DB_TASKS, name: 'Timeline', type: 'timeline', filters: [], filterConjunction: 'and', sorts: [], visibleProperties: ['prop-title', 'prop-status', 'prop-assignee'], settings: { showTable: true, zoomLevel: 'week' } },
  'v-tasks-list': { id: 'v-tasks-list', databaseId: DB_TASKS, name: 'List', type: 'list', filters: [], filterConjunction: 'and', sorts: [], grouping: { propertyId: 'prop-status' }, visibleProperties: ['prop-title', 'prop-status', 'prop-priority', 'prop-assignee', 'prop-due'], settings: { showPageIcon: true } },

  // ─── CRM Views ───
  'v-crm-table': { id: 'v-crm-table', databaseId: DB_CRM, name: 'All Contacts', type: 'table', filters: [], filterConjunction: 'and', sorts: [], visibleProperties: ['prop-name', 'prop-company', 'prop-stage', 'prop-value', 'prop-email', 'prop-phone', 'prop-last-contact', 'prop-vip', 'prop-source', 'prop-projects'], settings: { showVerticalLines: true } },
  'v-crm-board': { id: 'v-crm-board', databaseId: DB_CRM, name: 'Pipeline', type: 'board', filters: [], filterConjunction: 'and', sorts: [], grouping: { propertyId: 'prop-stage' }, visibleProperties: ['prop-name', 'prop-company', 'prop-value', 'prop-vip'], settings: { colorColumns: true, cardSize: 'medium' } },
  'v-crm-gallery': { id: 'v-crm-gallery', databaseId: DB_CRM, name: 'Gallery', type: 'gallery', filters: [], filterConjunction: 'and', sorts: [], visibleProperties: ['prop-name', 'prop-company', 'prop-stage', 'prop-value'], settings: { cardSize: 'medium', cardPreview: 'none' } },

  // ─── Content Views ───
  'v-content-calendar': { id: 'v-content-calendar', databaseId: DB_CONTENT, name: 'Calendar', type: 'calendar', filters: [], filterConjunction: 'and', sorts: [], visibleProperties: ['prop-title', 'prop-status', 'prop-platform'], settings: { showWeekends: true, showCalendarAs: 'month' } },
  'v-content-table': { id: 'v-content-table', databaseId: DB_CONTENT, name: 'Table', type: 'table', filters: [], filterConjunction: 'and', sorts: [], visibleProperties: ['prop-title', 'prop-platform', 'prop-status', 'prop-date', 'prop-author', 'prop-approved'], settings: { showVerticalLines: true } },
  'v-content-board': { id: 'v-content-board', databaseId: DB_CONTENT, name: 'Board', type: 'board', filters: [], filterConjunction: 'and', sorts: [], grouping: { propertyId: 'prop-status' }, visibleProperties: ['prop-title', 'prop-platform', 'prop-date', 'prop-author'], settings: { colorColumns: true } },

  // ─── Inventory Views ───
  'v-inv-table': { id: 'v-inv-table', databaseId: DB_INVENTORY, name: 'Assets', type: 'table', filters: [], filterConjunction: 'and', sorts: [], visibleProperties: ['prop-name', 'prop-category', 'prop-serial', 'prop-price', 'prop-purchase', 'prop-active', 'prop-location'], settings: { showVerticalLines: true } },
  'v-inv-gallery': { id: 'v-inv-gallery', databaseId: DB_INVENTORY, name: 'Gallery', type: 'gallery', filters: [], filterConjunction: 'and', sorts: [], visibleProperties: ['prop-name', 'prop-category', 'prop-price', 'prop-active'], settings: { cardSize: 'medium', cardPreview: 'none' } },
  'v-inv-chart': { id: 'v-inv-chart', databaseId: DB_INVENTORY, name: 'Chart', type: 'chart', filters: [], filterConjunction: 'and', sorts: [], visibleProperties: ['prop-name', 'prop-category', 'prop-price'], settings: { chartType: 'vertical_bar', xAxisProperty: 'prop-category', yAxisProperty: 'prop-price', yAxisAggregation: 'sum' } },
  'v-inv-dashboard': { id: 'v-inv-dashboard', databaseId: DB_INVENTORY, name: 'Dashboard', type: 'dashboard', filters: [], filterConjunction: 'and', sorts: [], visibleProperties: ['prop-name', 'prop-category', 'prop-price', 'prop-active'], settings: {} },
  ...productViews,
  ...projectViews,
};

// ═══════════════════════════════════════════════════════════════════════════════
// FILTER ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

function evaluateFilter(page: Page, filter: Filter, property: SchemaProperty | undefined): boolean {
  const val = page.properties[filter.propertyId];
  const fv = filter.value;

  switch (filter.operator) {
    case 'equals':
      return val === fv;
    case 'not_equals':
      return val !== fv;
    case 'contains':
      if (typeof val === 'string') return val.toLowerCase().includes(String(fv).toLowerCase());
      if (Array.isArray(val)) return val.includes(fv);
      return false;
    case 'not_contains':
      if (typeof val === 'string') return !val.toLowerCase().includes(String(fv).toLowerCase());
      if (Array.isArray(val)) return !val.includes(fv);
      return true;
    case 'starts_with':
      return typeof val === 'string' && val.toLowerCase().startsWith(String(fv).toLowerCase());
    case 'ends_with':
      return typeof val === 'string' && val.toLowerCase().endsWith(String(fv).toLowerCase());
    case 'is_empty':
      return val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0);
    case 'is_not_empty':
      return val !== undefined && val !== null && val !== '' && !(Array.isArray(val) && val.length === 0);
    case 'greater_than':
      return typeof val === 'number' && val > Number(fv);
    case 'less_than':
      return typeof val === 'number' && val < Number(fv);
    case 'greater_than_or_equal':
      return typeof val === 'number' && val >= Number(fv);
    case 'less_than_or_equal':
      return typeof val === 'number' && val <= Number(fv);
    case 'is_before':
      return typeof val === 'string' && new Date(val) < new Date(fv);
    case 'is_after':
      return typeof val === 'string' && new Date(val) > new Date(fv);
    case 'is_checked':
      return val === true;
    case 'is_not_checked':
      return val !== true;
    default:
      return true;
  }
}

function compareValues(a: any, b: any, direction: 'asc' | 'desc'): number {
  const mult = direction === 'asc' ? 1 : -1;
  if (a === undefined || a === null) return 1;
  if (b === undefined || b === null) return -1;
  if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b) * mult;
  if (typeof a === 'number' && typeof b === 'number') return (a - b) * mult;
  if (typeof a === 'boolean' && typeof b === 'boolean') return ((a ? 1 : 0) - (b ? 1 : 0)) * mult;
  return String(a).localeCompare(String(b)) * mult;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STORE
// ═══════════════════════════════════════════════════════════════════════════════

export const useDatabaseStore = create<DatabaseState>((set, get) => ({
  databases: initialDatabases,
  pages: initialPages,
  views: initialViews,
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

    // Global search filter
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      result = result.filter(page => {
        return Object.values(page.properties).some(val => {
          if (typeof val === 'string') return val.toLowerCase().includes(q);
          if (Array.isArray(val)) return val.some(v => String(v).toLowerCase().includes(q));
          return String(val).toLowerCase().includes(q);
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
        { groupId: '__unassigned__', groupLabel: 'No ' + groupProp.name, groupColor: 'bg-gray-200 text-gray-700', pages: [] as Page[] },
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
        { groupId: 'unchecked', groupLabel: 'Unchecked', groupColor: 'bg-gray-200 text-gray-700', pages: unchecked },
        { groupId: 'checked', groupLabel: 'Checked', groupColor: 'bg-green-200 text-green-800', pages: checked },
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
      groupColor: 'bg-gray-200 text-gray-700',
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
