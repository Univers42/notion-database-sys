// ═══════════════════════════════════════════════════════════════════════════════
// RELATION SEED — Projects & Sprints database
// ═══════════════════════════════════════════════════════════════════════════════
// This database demonstrates:
//   • One-to-many relations (project → tasks, project → content pieces)
//   • Many-to-one relations (project → client from CRM)
//   • Self-relations (project → sub-projects)
//   • Two-way relations (bidirectional)
//   • 15+ rollup properties using every calculate function
//   • Rollup displayAs: number, bar, ring
//   • Edge cases: empty relations, single-value, null handling
// ═══════════════════════════════════════════════════════════════════════════════

import type {
  DatabaseSchema, Page, ViewConfig, RollupFunction, RollupDisplayAs,
} from '../types/database';

// ─── Database ID (exported so we can reference it elsewhere) ─────────────────
export const DB_PROJECTS = 'db-projects';

// ─── Helper: date offset from "now" ─────────────────────────────────────────
const now = new Date().toISOString();
const d = (daysOffset: number) => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString();
};

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMA — with relations & rollups
// ═══════════════════════════════════════════════════════════════════════════════

export const projectDatabase: DatabaseSchema = {
  id: DB_PROJECTS,
  name: 'Projects & Sprints',
  icon: '🚀',
  description: 'Cross-database relation & rollup showcase',
  titlePropertyId: 'proj-title',
  properties: {
    // ── Core properties ──
    'proj-title': { id: 'proj-title', name: 'Project', type: 'title' },
    'proj-status': {
      id: 'proj-status', name: 'Status', type: 'select',
      options: [
        { id: 'ps-planning',  value: 'Planning',   color: 'bg-gray-200 text-gray-800' },
        { id: 'ps-active',    value: 'Active',     color: 'bg-blue-200 text-blue-800' },
        { id: 'ps-hold',      value: 'On Hold',    color: 'bg-yellow-200 text-yellow-800' },
        { id: 'ps-completed', value: 'Completed',  color: 'bg-green-200 text-green-800' },
        { id: 'ps-cancelled', value: 'Cancelled',  color: 'bg-red-200 text-red-800' },
      ],
    },
    'proj-priority': {
      id: 'proj-priority', name: 'Priority', type: 'select',
      options: [
        { id: 'pp-low',    value: 'Low',    color: 'bg-gray-100 text-gray-700' },
        { id: 'pp-med',    value: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
        { id: 'pp-high',   value: 'High',   color: 'bg-orange-100 text-orange-800' },
        { id: 'pp-urgent', value: 'Urgent', color: 'bg-red-100 text-red-800' },
      ],
    },
    'proj-start': { id: 'proj-start', name: 'Start Date', type: 'date' },
    'proj-end':   { id: 'proj-end',   name: 'End Date',   type: 'date' },
    'proj-budget': { id: 'proj-budget', name: 'Budget ($)', type: 'number' },
    'proj-lead':   { id: 'proj-lead',   name: 'Project Lead', type: 'person' },

    // ══════════════════════════════════════════════════════════════════════════
    // RELATION PROPERTIES (4 cross-database + 1 self-relation)
    // ══════════════════════════════════════════════════════════════════════════

    // → Tasks (one-to-many, two-way)
    'proj-tasks': {
      id: 'proj-tasks', name: 'Tasks', type: 'relation',
      relationConfig: { databaseId: 'db-tasks', type: 'two_way', reversePropertyId: 'prop-project' },
    },
    // → CRM / Contacts (many-to-one, two-way — one client per project)
    'proj-client': {
      id: 'proj-client', name: 'Client', type: 'relation',
      relationConfig: { databaseId: 'db-crm', type: 'two_way', reversePropertyId: 'prop-projects', limit: 1 },
    },
    // → Content Calendar (one-to-many, one-way)
    'proj-content': {
      id: 'proj-content', name: 'Content', type: 'relation',
      relationConfig: { databaseId: 'db-content', type: 'one_way' },
    },
    // → Asset Inventory (one-to-many, two-way)
    'proj-equipment': {
      id: 'proj-equipment', name: 'Equipment', type: 'relation',
      relationConfig: { databaseId: 'db-inventory', type: 'two_way', reversePropertyId: 'prop-project-inv' },
    },
    // → Self-relation: sub-projects
    'proj-subprojects': {
      id: 'proj-subprojects', name: 'Sub-projects', type: 'relation',
      relationConfig: { databaseId: DB_PROJECTS, type: 'one_way' },
    },

    // ══════════════════════════════════════════════════════════════════════════
    // ROLLUP PROPERTIES — showcasing every calculate function
    // ══════════════════════════════════════════════════════════════════════════

    // ── From Tasks ──
    'proj-task-count': {
      id: 'proj-task-count', name: 'Task Count', type: 'rollup',
      rollupConfig: { relationPropertyId: 'proj-tasks', targetPropertyId: 'prop-title', function: 'count_all', displayAs: 'number' },
    },
    'proj-total-pts': {
      id: 'proj-total-pts', name: 'Total Points', type: 'rollup',
      rollupConfig: { relationPropertyId: 'proj-tasks', targetPropertyId: 'prop-points', function: 'sum', displayAs: 'number' },
    },
    'proj-avg-pts': {
      id: 'proj-avg-pts', name: 'Avg Points', type: 'rollup',
      rollupConfig: { relationPropertyId: 'proj-tasks', targetPropertyId: 'prop-points', function: 'average', displayAs: 'bar' },
    },
    'proj-max-pts': {
      id: 'proj-max-pts', name: 'Max Points', type: 'rollup',
      rollupConfig: { relationPropertyId: 'proj-tasks', targetPropertyId: 'prop-points', function: 'max', displayAs: 'number' },
    },
    'proj-min-pts': {
      id: 'proj-min-pts', name: 'Min Points', type: 'rollup',
      rollupConfig: { relationPropertyId: 'proj-tasks', targetPropertyId: 'prop-points', function: 'min', displayAs: 'number' },
    },
    'proj-pts-range': {
      id: 'proj-pts-range', name: 'Points Range', type: 'rollup',
      rollupConfig: { relationPropertyId: 'proj-tasks', targetPropertyId: 'prop-points', function: 'range', displayAs: 'number' },
    },
    'proj-pts-median': {
      id: 'proj-pts-median', name: 'Points Median', type: 'rollup',
      rollupConfig: { relationPropertyId: 'proj-tasks', targetPropertyId: 'prop-points', function: 'median', displayAs: 'number' },
    },
    'proj-done-pct': {
      id: 'proj-done-pct', name: '% Completed', type: 'rollup',
      rollupConfig: { relationPropertyId: 'proj-tasks', targetPropertyId: 'prop-done', function: 'percent_not_empty', displayAs: 'ring' },
    },
    'proj-done-count': {
      id: 'proj-done-count', name: 'Done Count', type: 'rollup',
      rollupConfig: { relationPropertyId: 'proj-tasks', targetPropertyId: 'prop-done', function: 'count_not_empty', displayAs: 'number' },
    },
    'proj-empty-count': {
      id: 'proj-empty-count', name: 'Undone Count', type: 'rollup',
      rollupConfig: { relationPropertyId: 'proj-tasks', targetPropertyId: 'prop-done', function: 'count_empty', displayAs: 'number' },
    },
    'proj-assignees': {
      id: 'proj-assignees', name: 'Assignees', type: 'rollup',
      rollupConfig: { relationPropertyId: 'proj-tasks', targetPropertyId: 'prop-assignee', function: 'show_unique' },
    },
    'proj-unique-tags': {
      id: 'proj-unique-tags', name: 'Unique Tag Count', type: 'rollup',
      rollupConfig: { relationPropertyId: 'proj-tasks', targetPropertyId: 'prop-tags', function: 'count_unique_values', displayAs: 'number' },
    },
    'proj-all-statuses': {
      id: 'proj-all-statuses', name: 'Task Statuses', type: 'rollup',
      rollupConfig: { relationPropertyId: 'proj-tasks', targetPropertyId: 'prop-status', function: 'show_original' },
    },
    'proj-values-count': {
      id: 'proj-values-count', name: 'Tasks w/ Points', type: 'rollup',
      rollupConfig: { relationPropertyId: 'proj-tasks', targetPropertyId: 'prop-points', function: 'count_values', displayAs: 'number' },
    },
    'proj-pct-empty': {
      id: 'proj-pct-empty', name: '% No Assignee', type: 'rollup',
      rollupConfig: { relationPropertyId: 'proj-tasks', targetPropertyId: 'prop-assignee', function: 'percent_empty', displayAs: 'ring' },
    },

    // ── From CRM ──
    'proj-client-value': {
      id: 'proj-client-value', name: 'Client Deal $', type: 'rollup',
      rollupConfig: { relationPropertyId: 'proj-client', targetPropertyId: 'prop-value', function: 'sum', displayAs: 'number' },
    },
    'proj-client-vip': {
      id: 'proj-client-vip', name: 'Client VIP?', type: 'rollup',
      rollupConfig: { relationPropertyId: 'proj-client', targetPropertyId: 'prop-vip', function: 'show_original' },
    },

    // ── From Content ──
    'proj-content-count': {
      id: 'proj-content-count', name: 'Content Pieces', type: 'rollup',
      rollupConfig: { relationPropertyId: 'proj-content', targetPropertyId: 'prop-title', function: 'count_all', displayAs: 'bar' },
    },

    // ── From Inventory ──
    'proj-equip-value': {
      id: 'proj-equip-value', name: 'Equipment $', type: 'rollup',
      rollupConfig: { relationPropertyId: 'proj-equipment', targetPropertyId: 'prop-price', function: 'sum', displayAs: 'number' },
    },
    'proj-equip-count': {
      id: 'proj-equip-count', name: 'Equipment #', type: 'rollup',
      rollupConfig: { relationPropertyId: 'proj-equipment', targetPropertyId: 'prop-name', function: 'count_all', displayAs: 'number' },
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// REVERSE-RELATION PROPERTIES (injected into existing databases)
// ═══════════════════════════════════════════════════════════════════════════════
// These will be merged into the existing databases by the store initializer.

export const reverseRelationProps: Record<string, Record<string, any>> = {
  'db-tasks': {
    'prop-project': {
      id: 'prop-project', name: 'Project', type: 'relation',
      relationConfig: { databaseId: DB_PROJECTS, type: 'two_way', reversePropertyId: 'proj-tasks' },
    },
  },
  'db-crm': {
    'prop-projects': {
      id: 'prop-projects', name: 'Projects', type: 'relation',
      relationConfig: { databaseId: DB_PROJECTS, type: 'two_way', reversePropertyId: 'proj-client' },
    },
  },
  'db-inventory': {
    'prop-project-inv': {
      id: 'prop-project-inv', name: 'Project', type: 'relation',
      relationConfig: { databaseId: DB_PROJECTS, type: 'two_way', reversePropertyId: 'proj-equipment' },
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// SEED PAGES — 8 projects linked to existing pages
// ═══════════════════════════════════════════════════════════════════════════════

export const projectPages: Record<string, Page> = {
  'pj1': {
    id: 'pj1', databaseId: DB_PROJECTS, icon: '🏗️',
    properties: {
      'proj-title': 'Database System Redesign',
      'proj-status': 'ps-active',
      'proj-priority': 'pp-high',
      'proj-start': d(-30),
      'proj-end': d(30),
      'proj-budget': 120000,
      'proj-lead': 'Alice',
      'proj-tasks': ['t1', 't2', 't7'],       // Design, Implement, Perf
      'proj-client': ['c1'],                    // Acme Corp
      'proj-content': ['ct1', 'ct5'],           // React tips, TS first look
      'proj-equipment': ['i1', 'i4'],           // MacBook, Dell monitor
      'proj-subprojects': ['pj6'],              // Analytics Dashboard sub-project
    },
    content: [
      { id: 'pjb1', type: 'heading_2', content: 'Project Overview' },
      { id: 'pjb2', type: 'paragraph', content: 'Complete redesign of the core database engine with WASM-powered formula evaluation and cross-database relations.' },
    ],
    createdAt: d(-30), updatedAt: d(-1), createdBy: 'Alice', lastEditedBy: 'Alice',
  },
  'pj2': {
    id: 'pj2', databaseId: DB_PROJECTS, icon: '📢',
    properties: {
      'proj-title': 'Content Marketing Q1',
      'proj-status': 'ps-active',
      'proj-priority': 'pp-med',
      'proj-start': d(-20),
      'proj-end': d(20),
      'proj-budget': 25000,
      'proj-lead': 'Diana',
      'proj-tasks': ['t4', 't8'],               // Docs, UI Polish
      'proj-client': ['c2'],                     // Globex
      'proj-content': ['ct1', 'ct2', 'ct4', 'ct5'],
      'proj-equipment': [],
      'proj-subprojects': [],
    },
    content: [],
    createdAt: d(-20), updatedAt: d(-3), createdBy: 'Diana', lastEditedBy: 'Diana',
  },
  'pj3': {
    id: 'pj3', databaseId: DB_PROJECTS, icon: '🔧',
    properties: {
      'proj-title': 'Infrastructure Upgrade',
      'proj-status': 'ps-planning',
      'proj-priority': 'pp-high',
      'proj-start': d(5),
      'proj-end': d(45),
      'proj-budget': 80000,
      'proj-lead': 'Bob',
      'proj-tasks': ['t5', 't6'],               // Deploy, Integration tests
      'proj-client': ['c5'],                     // Umbrella Corp
      'proj-content': [],
      'proj-equipment': ['i2'],                  // Figma license
      'proj-subprojects': [],
    },
    content: [],
    createdAt: d(-5), updatedAt: d(-1), createdBy: 'Bob', lastEditedBy: 'Bob',
  },
  'pj4': {
    id: 'pj4', databaseId: DB_PROJECTS, icon: '✅',
    properties: {
      'proj-title': 'Client Onboarding Portal',
      'proj-status': 'ps-completed',
      'proj-priority': 'pp-med',
      'proj-start': d(-60),
      'proj-end': d(-10),
      'proj-budget': 35000,
      'proj-lead': 'Charlie',
      'proj-tasks': ['t1', 't3', 't8'],         // Design, Fix bug, UI Polish
      'proj-client': ['c3'],                     // Initech
      'proj-content': ['ct3'],                   // Vite vs Webpack
      'proj-equipment': ['i3'],                  // Herman Miller (office setup)
      'proj-subprojects': [],
    },
    content: [],
    createdAt: d(-60), updatedAt: d(-10), createdBy: 'Charlie', lastEditedBy: 'Charlie',
  },
  'pj5': {
    id: 'pj5', databaseId: DB_PROJECTS, icon: '📱',
    properties: {
      'proj-title': 'Mobile App MVP',
      'proj-status': 'ps-hold',
      'proj-priority': 'pp-urgent',
      'proj-start': d(-15),
      'proj-end': d(60),
      'proj-budget': 200000,
      'proj-lead': 'Eve',
      'proj-tasks': ['t3', 't4'],               // Fix bug, Write docs
      'proj-client': ['c6'],                     // Cyberdyne
      'proj-content': ['ct2'],                   // State management article
      'proj-equipment': ['i1', 'i5'],            // MacBook, Standing desk
      'proj-subprojects': [],
    },
    content: [],
    createdAt: d(-15), updatedAt: d(-2), createdBy: 'Eve', lastEditedBy: 'Eve',
  },
  'pj6': {
    id: 'pj6', databaseId: DB_PROJECTS, icon: '📊',
    properties: {
      'proj-title': 'Analytics Dashboard',
      'proj-status': 'ps-active',
      'proj-priority': 'pp-high',
      'proj-start': d(-10),
      'proj-end': d(20),
      'proj-budget': 45000,
      'proj-lead': 'Alice',
      'proj-tasks': ['t2', 't7'],               // Implement, Perf
      'proj-client': ['c1'],                     // Acme Corp
      'proj-content': ['ct4'],                   // Product update newsletter
      'proj-equipment': ['i4'],                  // Dell monitor
      'proj-subprojects': [],
    },
    content: [],
    createdAt: d(-10), updatedAt: d(0), createdBy: 'Alice', lastEditedBy: 'Alice',
  },
  'pj7': {
    id: 'pj7', databaseId: DB_PROJECTS, icon: '🚫',
    properties: {
      'proj-title': 'Legacy Migration (Cancelled)',
      'proj-status': 'ps-cancelled',
      'proj-priority': 'pp-low',
      'proj-start': d(-90),
      'proj-end': d(-60),
      'proj-budget': 10000,
      'proj-lead': 'Bob',
      'proj-tasks': [],                          // No tasks — edge case: empty relation
      'proj-client': ['c4'],                     // Soylent Corp (lost)
      'proj-content': [],
      'proj-equipment': [],
      'proj-subprojects': [],
    },
    content: [],
    createdAt: d(-90), updatedAt: d(-60), createdBy: 'Bob', lastEditedBy: 'Bob',
  },
  'pj8': {
    id: 'pj8', databaseId: DB_PROJECTS, icon: '🧪',
    properties: {
      'proj-title': 'R&D Exploration',
      'proj-status': 'ps-planning',
      'proj-priority': 'pp-low',
      'proj-start': d(10),
      'proj-end': d(90),
      'proj-budget': 15000,
      'proj-lead': 'Diana',
      'proj-tasks': ['t6'],                      // Integration tests only — single task
      'proj-client': [],                         // No client — edge case: empty single relation
      'proj-content': ['ct3'],                   // Vite deep dive
      'proj-equipment': ['i2', 'i3', 'i5'],     // Multiple equipment items
      'proj-subprojects': [],
    },
    content: [],
    createdAt: d(-2), updatedAt: d(-1), createdBy: 'Diana', lastEditedBy: 'Diana',
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// REVERSE-RELATION DATA — patch existing pages to reference projects
// ═══════════════════════════════════════════════════════════════════════════════
// Maps existing page IDs → { propertyId: [project page IDs] }

export const reverseRelationData: Record<string, Record<string, string[]>> = {
  // Tasks → Project
  't1': { 'prop-project': ['pj1', 'pj4'] },
  't2': { 'prop-project': ['pj1', 'pj6'] },
  't3': { 'prop-project': ['pj4', 'pj5'] },
  't4': { 'prop-project': ['pj2', 'pj5'] },
  't5': { 'prop-project': ['pj3'] },
  't6': { 'prop-project': ['pj3', 'pj8'] },
  't7': { 'prop-project': ['pj1', 'pj6'] },
  't8': { 'prop-project': ['pj2', 'pj4'] },
  // CRM → Projects
  'c1': { 'prop-projects': ['pj1', 'pj6'] },
  'c2': { 'prop-projects': ['pj2'] },
  'c3': { 'prop-projects': ['pj4'] },
  'c4': { 'prop-projects': ['pj7'] },
  'c5': { 'prop-projects': ['pj3'] },
  'c6': { 'prop-projects': ['pj5'] },
  // Inventory → Project
  'i1': { 'prop-project-inv': ['pj1', 'pj5'] },
  'i2': { 'prop-project-inv': ['pj3', 'pj8'] },
  'i3': { 'prop-project-inv': ['pj4', 'pj8'] },
  'i4': { 'prop-project-inv': ['pj1', 'pj6'] },
  'i5': { 'prop-project-inv': ['pj5', 'pj8'] },
};

// ═══════════════════════════════════════════════════════════════════════════════
// VIEWS
// ═══════════════════════════════════════════════════════════════════════════════

export const projectViews: Record<string, ViewConfig> = {
  // ── Table: all columns including relations & rollups ──
  'v-proj-table': {
    id: 'v-proj-table', databaseId: DB_PROJECTS, name: 'All Projects', type: 'table',
    filters: [], filterConjunction: 'and', sorts: [],
    visibleProperties: [
      'proj-title', 'proj-status', 'proj-priority', 'proj-lead',
      'proj-start', 'proj-end', 'proj-budget',
      // Relations
      'proj-tasks', 'proj-client', 'proj-content', 'proj-equipment', 'proj-subprojects',
      // Rollups — number
      'proj-task-count', 'proj-total-pts', 'proj-avg-pts', 'proj-max-pts', 'proj-min-pts',
      'proj-pts-range', 'proj-pts-median', 'proj-values-count',
      // Rollups — percent / ring
      'proj-done-pct', 'proj-pct-empty',
      // Rollups — count
      'proj-done-count', 'proj-empty-count', 'proj-unique-tags',
      // Rollups — show
      'proj-assignees', 'proj-all-statuses',
      // Rollups — cross-database
      'proj-client-value', 'proj-client-vip',
      'proj-content-count', 'proj-equip-value', 'proj-equip-count',
    ],
    settings: { showVerticalLines: true },
  },

  // ── Board: grouped by status ──
  'v-proj-board': {
    id: 'v-proj-board', databaseId: DB_PROJECTS, name: 'Board', type: 'board',
    filters: [], filterConjunction: 'and', sorts: [],
    grouping: { propertyId: 'proj-status' },
    visibleProperties: [
      'proj-title', 'proj-priority', 'proj-lead', 'proj-budget',
      'proj-task-count', 'proj-done-pct', 'proj-client',
    ],
    settings: { colorColumns: true, cardSize: 'medium' },
  },

  // ── Timeline: start → end ──
  'v-proj-timeline': {
    id: 'v-proj-timeline', databaseId: DB_PROJECTS, name: 'Timeline', type: 'timeline',
    filters: [], filterConjunction: 'and', sorts: [],
    visibleProperties: ['proj-title', 'proj-status', 'proj-lead', 'proj-task-count'],
    settings: { showTable: true, zoomLevel: 'week' },
  },

  // ── Dashboard: relation & rollup analytics ──
  'v-proj-dashboard': {
    id: 'v-proj-dashboard', databaseId: DB_PROJECTS, name: 'Relation Analytics', type: 'dashboard',
    filters: [], filterConjunction: 'and', sorts: [],
    visibleProperties: ['proj-title', 'proj-status', 'proj-budget', 'proj-task-count', 'proj-done-pct'],
    settings: { relationAnalytics: true },
  },

  // ── Chart: budget by project ──
  'v-proj-chart': {
    id: 'v-proj-chart', databaseId: DB_PROJECTS, name: 'Budget Chart', type: 'chart',
    filters: [], filterConjunction: 'and', sorts: [],
    visibleProperties: ['proj-title', 'proj-budget'],
    settings: {
      chartType: 'horizontal_bar',
      xAxisProperty: 'proj-status',
      yAxisProperty: 'proj-budget',
      yAxisAggregation: 'sum',
      showDataLabels: true,
      showGridLines: true,
    },
  },
};
