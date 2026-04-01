// ═══════════════════════════════════════════════════════════════════════════════
// coreSeed.ts — Tasks, CRM, Content & Inventory seed databases/pages/views
// ═══════════════════════════════════════════════════════════════════════════════
// Extracted from useDatabaseStore to keep the store file focused on logic only.

import type { DatabaseSchema, Page, ViewConfig } from '../types/database';

export const DB_TASKS = 'db-tasks';
export const DB_CRM = 'db-crm';
export const DB_CONTENT = 'db-content';
export const DB_INVENTORY = 'db-inventory';

// — Date helpers ——————————————————————————————————————————————————————————————

const now = new Date().toISOString();

export function daysFromNow(offset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString();
}

const d = daysFromNow;

// ═══════════════════════════════════════════════════════════════════════════════
// DATABASE SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

const tasksDatabase: DatabaseSchema = {
  id: DB_TASKS,
  name: 'Tasks & Projects',
  icon: '📋',
  titlePropertyId: 'prop-title',
  properties: {
    'prop-title': { id: 'prop-title', name: 'Task Name', type: 'title' },
    'prop-status': {
      id: 'prop-status', name: 'Status', type: 'status',
      options: [
        { id: 'opt-todo', value: 'To Do', color: 'bg-surface-muted text-ink-strong' },
        { id: 'opt-in-progress', value: 'In Progress', color: 'bg-accent-subtle text-accent-text-bold' },
        { id: 'opt-review', value: 'In Review', color: 'bg-warning-surface-medium text-warning-text-tag' },
        { id: 'opt-done', value: 'Done', color: 'bg-success-surface-medium text-success-text-tag' },
        { id: 'opt-blocked', value: 'Blocked', color: 'bg-danger-surface-medium text-danger-text-tag' },
      ],
      statusGroups: [
        { id: 'sg-todo', label: 'To Do', color: 'bg-surface-muted text-ink-strong', optionIds: ['opt-todo'] },
        { id: 'sg-progress', label: 'In Progress', color: 'bg-accent-subtle text-accent-text-bold', optionIds: ['opt-in-progress', 'opt-review', 'opt-blocked'] },
        { id: 'sg-done', label: 'Done', color: 'bg-success-surface-medium text-success-text-tag', optionIds: ['opt-done'] },
      ],
    },
    'prop-priority': {
      id: 'prop-priority', name: 'Priority', type: 'select',
      options: [
        { id: 'pri-low', value: 'Low', color: 'bg-surface-tertiary text-ink-body' },
        { id: 'pri-med', value: 'Medium', color: 'bg-warning-surface-muted text-warning-text-tag' },
        { id: 'pri-high', value: 'High', color: 'bg-orange-surface-muted text-orange-text-tag' },
        { id: 'pri-urgent', value: 'Urgent', color: 'bg-danger-surface-muted text-danger-text-tag' },
      ],
    },
    'prop-tags': {
      id: 'prop-tags', name: 'Tags', type: 'multi_select',
      options: [
        { id: 'tag-bug', value: 'Bug', color: 'bg-danger-surface-muted text-danger-text-tag' },
        { id: 'tag-feature', value: 'Feature', color: 'bg-purple-surface-muted text-purple-text-tag' },
        { id: 'tag-design', value: 'Design', color: 'bg-pink-surface-muted text-pink-text-tag' },
        { id: 'tag-infra', value: 'Infrastructure', color: 'bg-cyan-surface-muted text-cyan-text-tag' },
        { id: 'tag-docs', value: 'Documentation', color: 'bg-indigo-surface-muted text-indigo-text-tag' },
      ],
    },
    'prop-assignee': { id: 'prop-assignee', name: 'Assignee', type: 'person' },
    'prop-due': { id: 'prop-due', name: 'Due Date', type: 'date' },
    'prop-done': { id: 'prop-done', name: 'Completed', type: 'checkbox' },
    'prop-points': { id: 'prop-points', name: 'Story Points', type: 'number' },
    'prop-created': { id: 'prop-created', name: 'Created', type: 'created_time' },
    'prop-task-id': { id: 'prop-task-id', name: 'Task ID', type: 'id', prefix: 'TASK-', autoIncrement: 9 },
  },
};

const crmDatabase: DatabaseSchema = {
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
        { id: 'crm-lead', value: 'Lead', color: 'bg-warning-surface-muted text-warning-text-tag' },
        { id: 'crm-qualified', value: 'Qualified', color: 'bg-accent-muted text-accent-text-bold' },
        { id: 'crm-proposal', value: 'Proposal', color: 'bg-purple-surface-muted text-purple-text-tag' },
        { id: 'crm-negotiation', value: 'Negotiation', color: 'bg-orange-surface-muted text-orange-text-tag' },
        { id: 'crm-customer', value: 'Customer', color: 'bg-success-surface-muted text-success-text-tag' },
        { id: 'crm-lost', value: 'Lost', color: 'bg-danger-surface-muted text-danger-text-tag' },
      ],
    },
    'prop-value': { id: 'prop-value', name: 'Deal Value ($)', type: 'number' },
    'prop-email': { id: 'prop-email', name: 'Email', type: 'email' },
    'prop-phone': { id: 'prop-phone', name: 'Phone', type: 'phone' },
    'prop-last-contact': { id: 'prop-last-contact', name: 'Last Contact', type: 'date' },
    'prop-vip': { id: 'prop-vip', name: 'VIP', type: 'checkbox' },
    'prop-source': {
      id: 'prop-source', name: 'Source', type: 'select',
      options: [
        { id: 'src-web', value: 'Website', color: 'bg-accent-muted text-accent-text-bold' },
        { id: 'src-ref', value: 'Referral', color: 'bg-success-surface-muted text-success-text-tag' },
        { id: 'src-cold', value: 'Cold Outreach', color: 'bg-surface-tertiary text-ink-strong' },
      ],
    },
  },
};

const contentDatabase: DatabaseSchema = {
  id: DB_CONTENT,
  name: 'Content Calendar',
  icon: '📝',
  titlePropertyId: 'prop-title',
  properties: {
    'prop-title': { id: 'prop-title', name: 'Title', type: 'title' },
    'prop-platform': {
      id: 'prop-platform', name: 'Platform', type: 'multi_select',
      options: [
        { id: 'plat-tw', value: 'Twitter', color: 'bg-accent-muted text-accent-text-bold' },
        { id: 'plat-li', value: 'LinkedIn', color: 'bg-accent-subtle text-accent-text-bolder' },
        { id: 'plat-yt', value: 'YouTube', color: 'bg-danger-surface-muted text-danger-text-tag' },
        { id: 'plat-blog', value: 'Blog', color: 'bg-success-surface-muted text-success-text-tag' },
        { id: 'plat-news', value: 'Newsletter', color: 'bg-violet-surface-muted text-violet-text-tag' },
      ],
    },
    'prop-status': {
      id: 'prop-status', name: 'Status', type: 'select',
      options: [
        { id: 'con-idea', value: 'Idea', color: 'bg-surface-muted text-ink-strong' },
        { id: 'con-draft', value: 'Drafting', color: 'bg-warning-surface-muted text-warning-text-tag' },
        { id: 'con-review', value: 'In Review', color: 'bg-orange-surface-muted text-orange-text-tag' },
        { id: 'con-scheduled', value: 'Scheduled', color: 'bg-accent-muted text-accent-text-bold' },
        { id: 'con-pub', value: 'Published', color: 'bg-success-surface-medium text-success-text-tag' },
      ],
    },
    'prop-date': { id: 'prop-date', name: 'Publish Date', type: 'date' },
    'prop-author': { id: 'prop-author', name: 'Author', type: 'person' },
    'prop-approved': { id: 'prop-approved', name: 'Approved', type: 'checkbox' },
    'prop-url': { id: 'prop-url', name: 'URL', type: 'url' },
  },
};

const inventoryDatabase: DatabaseSchema = {
  id: DB_INVENTORY,
  name: 'Asset Inventory',
  icon: '📦',
  titlePropertyId: 'prop-name',
  properties: {
    'prop-name': { id: 'prop-name', name: 'Asset Name', type: 'title' },
    'prop-category': {
      id: 'prop-category', name: 'Category', type: 'select',
      options: [
        { id: 'cat-hw', value: 'Hardware', color: 'bg-surface-muted text-ink-strong' },
        { id: 'cat-sw', value: 'Software', color: 'bg-accent-muted text-accent-text-bold' },
        { id: 'cat-furn', value: 'Furniture', color: 'bg-warning-surface-muted text-warning-text-tag' },
        { id: 'cat-vehicle', value: 'Vehicle', color: 'bg-success-surface-muted text-success-text-tag' },
      ],
    },
    'prop-serial': { id: 'prop-serial', name: 'Serial Number', type: 'text' },
    'prop-price': { id: 'prop-price', name: 'Price ($)', type: 'number' },
    'prop-purchase': { id: 'prop-purchase', name: 'Purchase Date', type: 'date' },
    'prop-active': { id: 'prop-active', name: 'In Service', type: 'checkbox' },
    'prop-location': { id: 'prop-location', name: 'Location', type: 'place' },
    'prop-inv-id': { id: 'prop-inv-id', name: 'Asset ID', type: 'id', prefix: 'INV-', autoIncrement: 6 },
  },
};

export const coreDatabases: Record<string, DatabaseSchema> = {
  [DB_TASKS]: tasksDatabase,
  [DB_CRM]: crmDatabase,
  [DB_CONTENT]: contentDatabase,
  [DB_INVENTORY]: inventoryDatabase,
};

// ═══════════════════════════════════════════════════════════════════════════════
// PAGES
// ═══════════════════════════════════════════════════════════════════════════════

export const corePages: Record<string, Page> = {
  // — Tasks —
  't1': { id: 't1', databaseId: DB_TASKS, icon: '🎨', properties: { 'prop-title': 'Design Database Schema', 'prop-status': 'opt-done', 'prop-priority': 'pri-high', 'prop-tags': ['tag-design'], 'prop-assignee': 'Alice', 'prop-due': d(-4), 'prop-done': true, 'prop-points': 5, 'prop-task-id': 'TASK-1' }, content: [{ id: 'b1', type: 'paragraph', content: 'Define the core data structures for the database system.' }], createdAt: d(-10), updatedAt: d(-1), createdBy: 'Alice', lastEditedBy: 'Alice' },
  't2': { id: 't2', databaseId: DB_TASKS, icon: '⚙️', properties: { 'prop-title': 'Implement View Engine', 'prop-status': 'opt-in-progress', 'prop-priority': 'pri-urgent', 'prop-tags': ['tag-feature'], 'prop-assignee': 'Bob', 'prop-due': d(2), 'prop-done': false, 'prop-points': 13, 'prop-task-id': 'TASK-2' }, content: [{ id: 'b2', type: 'paragraph', content: 'Build the core view engine that powers table, board, calendar, timeline, gallery, list views.' }], createdAt: d(-7), updatedAt: now, createdBy: 'Bob', lastEditedBy: 'Bob' },
  't3': { id: 't3', databaseId: DB_TASKS, icon: '🐛', properties: { 'prop-title': 'Fix Drag-and-Drop Bug', 'prop-status': 'opt-todo', 'prop-priority': 'pri-med', 'prop-tags': ['tag-bug'], 'prop-assignee': 'Charlie', 'prop-due': d(5), 'prop-done': false, 'prop-points': 3, 'prop-task-id': 'TASK-3' }, content: [], createdAt: d(-3), updatedAt: d(-3), createdBy: 'Charlie', lastEditedBy: 'Charlie' },
  't4': { id: 't4', databaseId: DB_TASKS, icon: '📖', properties: { 'prop-title': 'Write API Documentation', 'prop-status': 'opt-todo', 'prop-priority': 'pri-low', 'prop-tags': ['tag-docs'], 'prop-assignee': 'Alice', 'prop-due': d(10), 'prop-done': false, 'prop-points': 2, 'prop-task-id': 'TASK-4' }, content: [], createdAt: d(-2), updatedAt: d(-2), createdBy: 'Alice', lastEditedBy: 'Alice' },
  't5': { id: 't5', databaseId: DB_TASKS, icon: '🚀', properties: { 'prop-title': 'Deploy to Production', 'prop-status': 'opt-blocked', 'prop-priority': 'pri-high', 'prop-tags': ['tag-infra'], 'prop-assignee': 'Bob', 'prop-due': d(7), 'prop-done': false, 'prop-points': 8, 'prop-task-id': 'TASK-5' }, content: [], createdAt: d(-1), updatedAt: d(-1), createdBy: 'Bob', lastEditedBy: 'Bob' },
  't6': { id: 't6', databaseId: DB_TASKS, icon: '🧪', properties: { 'prop-title': 'Write Integration Tests', 'prop-status': 'opt-review', 'prop-priority': 'pri-med', 'prop-tags': ['tag-feature', 'tag-infra'], 'prop-assignee': 'Diana', 'prop-due': d(3), 'prop-done': false, 'prop-points': 5, 'prop-task-id': 'TASK-6' }, content: [], createdAt: d(-5), updatedAt: now, createdBy: 'Diana', lastEditedBy: 'Diana' },
  't7': { id: 't7', databaseId: DB_TASKS, icon: '🎯', properties: { 'prop-title': 'Performance Optimization', 'prop-status': 'opt-in-progress', 'prop-priority': 'pri-high', 'prop-tags': ['tag-infra'], 'prop-assignee': 'Eve', 'prop-due': d(4), 'prop-done': false, 'prop-points': 8, 'prop-task-id': 'TASK-7' }, content: [], createdAt: d(-4), updatedAt: now, createdBy: 'Eve', lastEditedBy: 'Eve' },
  't8': { id: 't8', databaseId: DB_TASKS, icon: '💅', properties: { 'prop-title': 'UI Polish Pass', 'prop-status': 'opt-todo', 'prop-priority': 'pri-med', 'prop-tags': ['tag-design'], 'prop-assignee': 'Alice', 'prop-due': d(8), 'prop-done': false, 'prop-points': 3, 'prop-task-id': 'TASK-8' }, content: [], createdAt: d(-1), updatedAt: d(-1), createdBy: 'Alice', lastEditedBy: 'Alice' },

  // — CRM —
  'c1': { id: 'c1', databaseId: DB_CRM, icon: '🏢', properties: { 'prop-name': 'Acme Corporation', 'prop-company': 'Acme Inc', 'prop-stage': 'crm-customer', 'prop-value': 50000, 'prop-email': 'contact@acme.com', 'prop-phone': '+1-555-0100', 'prop-last-contact': d(-2), 'prop-vip': true, 'prop-source': 'src-ref' }, content: [], createdAt: d(-30), updatedAt: d(-2), createdBy: 'Alice', lastEditedBy: 'Alice' },
  'c2': { id: 'c2', databaseId: DB_CRM, icon: '🌐', properties: { 'prop-name': 'Globex Industries', 'prop-company': 'Globex Corp', 'prop-stage': 'crm-lead', 'prop-value': 120000, 'prop-email': 'sales@globex.com', 'prop-phone': '+1-555-0200', 'prop-last-contact': d(-1), 'prop-vip': false, 'prop-source': 'src-web' }, content: [], createdAt: d(-14), updatedAt: d(-1), createdBy: 'Bob', lastEditedBy: 'Bob' },
  'c3': { id: 'c3', databaseId: DB_CRM, properties: { 'prop-name': 'Initech Systems', 'prop-company': 'Initech LLC', 'prop-stage': 'crm-proposal', 'prop-value': 15000, 'prop-email': 'info@initech.com', 'prop-phone': '+1-555-0300', 'prop-last-contact': d(-5), 'prop-vip': false, 'prop-source': 'src-cold' }, content: [], createdAt: d(-20), updatedAt: d(-5), createdBy: 'Charlie', lastEditedBy: 'Charlie' },
  'c4': { id: 'c4', databaseId: DB_CRM, properties: { 'prop-name': 'Soylent Corp', 'prop-company': 'Soylent Corp', 'prop-stage': 'crm-lost', 'prop-value': 80000, 'prop-email': 'hello@soylent.com', 'prop-phone': '+1-555-0400', 'prop-last-contact': d(-40), 'prop-vip': false, 'prop-source': 'src-ref' }, content: [], createdAt: d(-60), updatedAt: d(-40), createdBy: 'Alice', lastEditedBy: 'Alice' },
  'c5': { id: 'c5', databaseId: DB_CRM, icon: '⭐', properties: { 'prop-name': 'Umbrella Corp', 'prop-company': 'Umbrella Corp', 'prop-stage': 'crm-negotiation', 'prop-value': 250000, 'prop-email': 'deals@umbrella.com', 'prop-phone': '+1-555-0500', 'prop-last-contact': d(0), 'prop-vip': true, 'prop-source': 'src-web' }, content: [], createdAt: d(-7), updatedAt: now, createdBy: 'Bob', lastEditedBy: 'Bob' },
  'c6': { id: 'c6', databaseId: DB_CRM, properties: { 'prop-name': 'Cyberdyne Tech', 'prop-company': 'Cyberdyne', 'prop-stage': 'crm-qualified', 'prop-value': 45000, 'prop-email': 'sales@cyberdyne.io', 'prop-last-contact': d(-3), 'prop-vip': false, 'prop-source': 'src-web' }, content: [], createdAt: d(-10), updatedAt: d(-3), createdBy: 'Diana', lastEditedBy: 'Diana' },

  // — Content —
  'ct1': { id: 'ct1', databaseId: DB_CONTENT, icon: '✍️', properties: { 'prop-title': '10 Tips for React Performance', 'prop-platform': ['plat-tw', 'plat-li'], 'prop-status': 'con-pub', 'prop-date': d(-8), 'prop-author': 'Alice', 'prop-approved': true, 'prop-url': 'https://blog.example.com/react-tips' }, content: [{ id: 'b3', type: 'paragraph', content: 'React performance optimization guide covering memoization, virtualization, and code splitting strategies.' }], createdAt: d(-15), updatedAt: d(-8), createdBy: 'Alice', lastEditedBy: 'Alice' },
  'ct2': { id: 'ct2', databaseId: DB_CONTENT, properties: { 'prop-title': 'State Management in 2026', 'prop-platform': ['plat-blog'], 'prop-status': 'con-draft', 'prop-date': d(3), 'prop-author': 'Bob', 'prop-approved': false }, content: [], createdAt: d(-5), updatedAt: d(-1), createdBy: 'Bob', lastEditedBy: 'Bob' },
  'ct3': { id: 'ct3', databaseId: DB_CONTENT, properties: { 'prop-title': 'Vite vs Webpack Deep Dive', 'prop-platform': ['plat-yt'], 'prop-status': 'con-idea', 'prop-date': d(15), 'prop-author': 'Charlie', 'prop-approved': false }, content: [], createdAt: d(-2), updatedAt: d(-2), createdBy: 'Charlie', lastEditedBy: 'Charlie' },
  'ct4': { id: 'ct4', databaseId: DB_CONTENT, icon: '📧', properties: { 'prop-title': 'Monthly Product Update', 'prop-platform': ['plat-news'], 'prop-status': 'con-review', 'prop-date': d(1), 'prop-author': 'Diana', 'prop-approved': false }, content: [], createdAt: d(-3), updatedAt: now, createdBy: 'Diana', lastEditedBy: 'Diana' },
  'ct5': { id: 'ct5', databaseId: DB_CONTENT, properties: { 'prop-title': 'TypeScript 6.0 First Look', 'prop-platform': ['plat-blog', 'plat-tw'], 'prop-status': 'con-scheduled', 'prop-date': d(5), 'prop-author': 'Alice', 'prop-approved': true }, content: [], createdAt: d(-1), updatedAt: d(-1), createdBy: 'Alice', lastEditedBy: 'Alice' },

  // — Inventory —
  'i1': { id: 'i1', databaseId: DB_INVENTORY, icon: '💻', properties: { 'prop-name': 'MacBook Pro M3', 'prop-category': 'cat-hw', 'prop-serial': 'C02X12345', 'prop-price': 2499, 'prop-purchase': d(-90), 'prop-active': true, 'prop-location': { address: 'Office A — Building 1, Floor 2' }, 'prop-inv-id': 'INV-1' }, content: [], createdAt: d(-90), updatedAt: d(-90), createdBy: 'Alice', lastEditedBy: 'Alice' },
  'i2': { id: 'i2', databaseId: DB_INVENTORY, icon: '🎨', properties: { 'prop-name': 'Figma Enterprise', 'prop-category': 'cat-sw', 'prop-serial': 'LIC-998877', 'prop-price': 540, 'prop-purchase': d(-60), 'prop-active': true, 'prop-location': { address: 'Cloud' }, 'prop-inv-id': 'INV-2' }, content: [], createdAt: d(-60), updatedAt: d(-60), createdBy: 'Alice', lastEditedBy: 'Alice' },
  'i3': { id: 'i3', databaseId: DB_INVENTORY, icon: '🪑', properties: { 'prop-name': 'Herman Miller Aeron', 'prop-category': 'cat-furn', 'prop-serial': 'HM-445566', 'prop-price': 1200, 'prop-purchase': d(-200), 'prop-active': true, 'prop-location': { address: 'Office B — Building 2, Floor 1' }, 'prop-inv-id': 'INV-3' }, content: [], createdAt: d(-200), updatedAt: d(-200), createdBy: 'Bob', lastEditedBy: 'Bob' },
  'i4': { id: 'i4', databaseId: DB_INVENTORY, icon: '🖥️', properties: { 'prop-name': 'Dell UltraSharp 32"', 'prop-category': 'cat-hw', 'prop-serial': 'DL-112233', 'prop-price': 899, 'prop-purchase': d(-120), 'prop-active': true, 'prop-location': { address: 'Office A — Building 1, Floor 2' }, 'prop-inv-id': 'INV-4' }, content: [], createdAt: d(-120), updatedAt: d(-120), createdBy: 'Charlie', lastEditedBy: 'Charlie' },
  'i5': { id: 'i5', databaseId: DB_INVENTORY, properties: { 'prop-name': 'Standing Desk Frame', 'prop-category': 'cat-furn', 'prop-serial': 'SD-778899', 'prop-price': 450, 'prop-purchase': d(-180), 'prop-active': false, 'prop-location': { address: 'Storage B-3' }, 'prop-inv-id': 'INV-5' }, content: [], createdAt: d(-180), updatedAt: d(-30), createdBy: 'Diana', lastEditedBy: 'Diana' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// VIEWS
// ═══════════════════════════════════════════════════════════════════════════════

export const coreViews: Record<string, ViewConfig> = {
  // — Tasks —
  'v-tasks-table': { id: 'v-tasks-table', databaseId: DB_TASKS, name: 'All Tasks', type: 'table', filters: [], filterConjunction: 'and', sorts: [], visibleProperties: ['prop-title', 'prop-status', 'prop-priority', 'prop-tags', 'prop-assignee', 'prop-due', 'prop-done', 'prop-points', 'prop-project'], settings: { showVerticalLines: true } },
  'v-tasks-board': { id: 'v-tasks-board', databaseId: DB_TASKS, name: 'Board', type: 'board', filters: [], filterConjunction: 'and', sorts: [], grouping: { propertyId: 'prop-status' }, visibleProperties: ['prop-title', 'prop-priority', 'prop-tags', 'prop-assignee', 'prop-due', 'prop-points'], settings: { colorColumns: true, cardSize: 'medium' } },
  'v-tasks-timeline': { id: 'v-tasks-timeline', databaseId: DB_TASKS, name: 'Timeline', type: 'timeline', filters: [], filterConjunction: 'and', sorts: [], visibleProperties: ['prop-title', 'prop-status', 'prop-assignee'], settings: { showTable: true, zoomLevel: 'week' } },
  'v-tasks-list': { id: 'v-tasks-list', databaseId: DB_TASKS, name: 'List', type: 'list', filters: [], filterConjunction: 'and', sorts: [], grouping: { propertyId: 'prop-status' }, visibleProperties: ['prop-title', 'prop-status', 'prop-priority', 'prop-assignee', 'prop-due'], settings: { showPageIcon: true } },

  // — CRM —
  'v-crm-table': { id: 'v-crm-table', databaseId: DB_CRM, name: 'All Contacts', type: 'table', filters: [], filterConjunction: 'and', sorts: [], visibleProperties: ['prop-name', 'prop-company', 'prop-stage', 'prop-value', 'prop-email', 'prop-phone', 'prop-last-contact', 'prop-vip', 'prop-source', 'prop-projects'], settings: { showVerticalLines: true } },
  'v-crm-board': { id: 'v-crm-board', databaseId: DB_CRM, name: 'Pipeline', type: 'board', filters: [], filterConjunction: 'and', sorts: [], grouping: { propertyId: 'prop-stage' }, visibleProperties: ['prop-name', 'prop-company', 'prop-value', 'prop-vip'], settings: { colorColumns: true, cardSize: 'medium' } },
  'v-crm-gallery': { id: 'v-crm-gallery', databaseId: DB_CRM, name: 'Gallery', type: 'gallery', filters: [], filterConjunction: 'and', sorts: [], visibleProperties: ['prop-name', 'prop-company', 'prop-stage', 'prop-value'], settings: { cardSize: 'medium', cardPreview: 'none' } },

  // — Content —
  'v-content-calendar': { id: 'v-content-calendar', databaseId: DB_CONTENT, name: 'Calendar', type: 'calendar', filters: [], filterConjunction: 'and', sorts: [], visibleProperties: ['prop-title', 'prop-status', 'prop-platform'], settings: { showWeekends: true, showCalendarAs: 'month' } },
  'v-content-table': { id: 'v-content-table', databaseId: DB_CONTENT, name: 'Table', type: 'table', filters: [], filterConjunction: 'and', sorts: [], visibleProperties: ['prop-title', 'prop-platform', 'prop-status', 'prop-date', 'prop-author', 'prop-approved'], settings: { showVerticalLines: true } },
  'v-content-board': { id: 'v-content-board', databaseId: DB_CONTENT, name: 'Board', type: 'board', filters: [], filterConjunction: 'and', sorts: [], grouping: { propertyId: 'prop-status' }, visibleProperties: ['prop-title', 'prop-platform', 'prop-date', 'prop-author'], settings: { colorColumns: true } },

  // — Inventory —
  'v-inv-table': { id: 'v-inv-table', databaseId: DB_INVENTORY, name: 'Assets', type: 'table', filters: [], filterConjunction: 'and', sorts: [], visibleProperties: ['prop-name', 'prop-category', 'prop-serial', 'prop-price', 'prop-purchase', 'prop-active', 'prop-location'], settings: { showVerticalLines: true } },
  'v-inv-gallery': { id: 'v-inv-gallery', databaseId: DB_INVENTORY, name: 'Gallery', type: 'gallery', filters: [], filterConjunction: 'and', sorts: [], visibleProperties: ['prop-name', 'prop-category', 'prop-price', 'prop-active'], settings: { cardSize: 'medium', cardPreview: 'none' } },
  'v-inv-chart': { id: 'v-inv-chart', databaseId: DB_INVENTORY, name: 'Chart', type: 'chart', filters: [], filterConjunction: 'and', sorts: [], visibleProperties: ['prop-name', 'prop-category', 'prop-price'], settings: { chartType: 'vertical_bar', xAxisProperty: 'prop-category', yAxisProperty: 'prop-price', yAxisAggregation: 'sum' } },
  'v-inv-dashboard': { id: 'v-inv-dashboard', databaseId: DB_INVENTORY, name: 'Dashboard', type: 'dashboard', filters: [], filterConjunction: 'and', sorts: [], visibleProperties: ['prop-name', 'prop-category', 'prop-price', 'prop-active'], settings: {} },
};
