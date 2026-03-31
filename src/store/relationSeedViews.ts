// Relation Seed — reverse-relation property schemas and project views
import type { ViewConfig } from '../types/database';

const DB_PROJECTS = 'db-projects';

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

export const projectViews: Record<string, ViewConfig> = {
  'v-proj-table': {
    id: 'v-proj-table', databaseId: DB_PROJECTS, name: 'All Projects', type: 'table',
    filters: [], filterConjunction: 'and', sorts: [],
    visibleProperties: [
      'proj-title', 'proj-status', 'proj-priority', 'proj-lead',
      'proj-start', 'proj-end', 'proj-budget',
      'proj-tasks', 'proj-client', 'proj-content', 'proj-equipment', 'proj-subprojects',
      'proj-task-count', 'proj-total-pts', 'proj-avg-pts', 'proj-max-pts', 'proj-min-pts',
      'proj-pts-range', 'proj-pts-median', 'proj-values-count',
      'proj-done-pct', 'proj-pct-empty',
      'proj-done-count', 'proj-empty-count', 'proj-unique-tags',
      'proj-assignees', 'proj-all-statuses',
      'proj-client-value', 'proj-client-vip',
      'proj-content-count', 'proj-equip-value', 'proj-equip-count',
    ],
    settings: { showVerticalLines: true },
  },
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
  'v-proj-timeline': {
    id: 'v-proj-timeline', databaseId: DB_PROJECTS, name: 'Timeline', type: 'timeline',
    filters: [], filterConjunction: 'and', sorts: [],
    visibleProperties: ['proj-title', 'proj-status', 'proj-lead', 'proj-task-count'],
    settings: { showTable: true, zoomLevel: 'week' },
  },
  'v-proj-dashboard': {
    id: 'v-proj-dashboard', databaseId: DB_PROJECTS, name: 'Relation Analytics', type: 'dashboard',
    filters: [], filterConjunction: 'and', sorts: [],
    visibleProperties: ['proj-title', 'proj-status', 'proj-budget', 'proj-task-count', 'proj-done-pct'],
    settings: { relationAnalytics: true },
  },
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
