// Relation Seed — Projects & Sprints database

import type { DatabaseSchema } from '../types/database';

export const DB_PROJECTS = 'db-projects';

const _now = new Date().toISOString();
export const d = (daysOffset: number) => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString();
};

export { projectPages, reverseRelationData } from './relationSeedPages';
export { reverseRelationProps, projectViews } from './relationSeedViews';

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
        { id: 'ps-planning',  value: 'Planning',   color: 'bg-surface-muted text-ink-strong' },
        { id: 'ps-active',    value: 'Active',     color: 'bg-accent-subtle text-accent-text-bold' },
        { id: 'ps-hold',      value: 'On Hold',    color: 'bg-warning-surface-medium text-warning-text-tag' },
        { id: 'ps-completed', value: 'Completed',  color: 'bg-success-surface-medium text-success-text-tag' },
        { id: 'ps-cancelled', value: 'Cancelled',  color: 'bg-danger-surface-medium text-danger-text-tag' },
      ],
    },
    'proj-priority': {
      id: 'proj-priority', name: 'Priority', type: 'select',
      options: [
        { id: 'pp-low',    value: 'Low',    color: 'bg-surface-tertiary text-ink-body' },
        { id: 'pp-med',    value: 'Medium', color: 'bg-warning-surface-muted text-warning-text-tag' },
        { id: 'pp-high',   value: 'High',   color: 'bg-orange-surface-muted text-orange-text-tag' },
        { id: 'pp-urgent', value: 'Urgent', color: 'bg-danger-surface-muted text-danger-text-tag' },
      ],
    },
    'proj-start': { id: 'proj-start', name: 'Start Date', type: 'date' },
    'proj-end':   { id: 'proj-end',   name: 'End Date',   type: 'date' },
    'proj-budget': { id: 'proj-budget', name: 'Budget ($)', type: 'number' },
    'proj-lead':   { id: 'proj-lead',   name: 'Project Lead', type: 'person' },

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
