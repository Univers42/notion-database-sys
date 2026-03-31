// Relation Seed — project pages and reverse-relation data
import type { Page } from '../types/database';

const DB_PROJECTS = 'db-projects';
const d = (daysOffset: number) => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString();
};

export const projectPages: Record<string, Page> = {
  'pj1': {
    id: 'pj1', databaseId: DB_PROJECTS, icon: '🏗️',
    properties: {
      'proj-title': 'Database System Redesign', 'proj-status': 'ps-active',
      'proj-priority': 'pp-high', 'proj-start': d(-30), 'proj-end': d(30),
      'proj-budget': 120000, 'proj-lead': 'Alice',
      'proj-tasks': ['t1', 't2', 't7'], 'proj-client': ['c1'],
      'proj-content': ['ct1', 'ct5'], 'proj-equipment': ['i1', 'i4'],
      'proj-subprojects': ['pj6'],
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
      'proj-title': 'Content Marketing Q1', 'proj-status': 'ps-active',
      'proj-priority': 'pp-med', 'proj-start': d(-20), 'proj-end': d(20),
      'proj-budget': 25000, 'proj-lead': 'Diana',
      'proj-tasks': ['t4', 't8'], 'proj-client': ['c2'],
      'proj-content': ['ct1', 'ct2', 'ct4', 'ct5'], 'proj-equipment': [],
      'proj-subprojects': [],
    },
    content: [],
    createdAt: d(-20), updatedAt: d(-3), createdBy: 'Diana', lastEditedBy: 'Diana',
  },
  'pj3': {
    id: 'pj3', databaseId: DB_PROJECTS, icon: '🔧',
    properties: {
      'proj-title': 'Infrastructure Upgrade', 'proj-status': 'ps-planning',
      'proj-priority': 'pp-high', 'proj-start': d(5), 'proj-end': d(45),
      'proj-budget': 80000, 'proj-lead': 'Bob',
      'proj-tasks': ['t5', 't6'], 'proj-client': ['c5'],
      'proj-content': [], 'proj-equipment': ['i2'],
      'proj-subprojects': [],
    },
    content: [],
    createdAt: d(-5), updatedAt: d(-1), createdBy: 'Bob', lastEditedBy: 'Bob',
  },
  'pj4': {
    id: 'pj4', databaseId: DB_PROJECTS, icon: '✅',
    properties: {
      'proj-title': 'Client Onboarding Portal', 'proj-status': 'ps-completed',
      'proj-priority': 'pp-med', 'proj-start': d(-60), 'proj-end': d(-10),
      'proj-budget': 35000, 'proj-lead': 'Charlie',
      'proj-tasks': ['t1', 't3', 't8'], 'proj-client': ['c3'],
      'proj-content': ['ct3'], 'proj-equipment': ['i3'],
      'proj-subprojects': [],
    },
    content: [],
    createdAt: d(-60), updatedAt: d(-10), createdBy: 'Charlie', lastEditedBy: 'Charlie',
  },
  'pj5': {
    id: 'pj5', databaseId: DB_PROJECTS, icon: '📱',
    properties: {
      'proj-title': 'Mobile App MVP', 'proj-status': 'ps-hold',
      'proj-priority': 'pp-urgent', 'proj-start': d(-15), 'proj-end': d(60),
      'proj-budget': 200000, 'proj-lead': 'Eve',
      'proj-tasks': ['t3', 't4'], 'proj-client': ['c6'],
      'proj-content': ['ct2'], 'proj-equipment': ['i1', 'i5'],
      'proj-subprojects': [],
    },
    content: [],
    createdAt: d(-15), updatedAt: d(-2), createdBy: 'Eve', lastEditedBy: 'Eve',
  },
  'pj6': {
    id: 'pj6', databaseId: DB_PROJECTS, icon: '📊',
    properties: {
      'proj-title': 'Analytics Dashboard', 'proj-status': 'ps-active',
      'proj-priority': 'pp-high', 'proj-start': d(-10), 'proj-end': d(20),
      'proj-budget': 45000, 'proj-lead': 'Alice',
      'proj-tasks': ['t2', 't7'], 'proj-client': ['c1'],
      'proj-content': ['ct4'], 'proj-equipment': ['i4'],
      'proj-subprojects': [],
    },
    content: [],
    createdAt: d(-10), updatedAt: d(0), createdBy: 'Alice', lastEditedBy: 'Alice',
  },
  'pj7': {
    id: 'pj7', databaseId: DB_PROJECTS, icon: '🚫',
    properties: {
      'proj-title': 'Legacy Migration (Cancelled)', 'proj-status': 'ps-cancelled',
      'proj-priority': 'pp-low', 'proj-start': d(-90), 'proj-end': d(-60),
      'proj-budget': 10000, 'proj-lead': 'Bob',
      'proj-tasks': [], 'proj-client': ['c4'],
      'proj-content': [], 'proj-equipment': [],
      'proj-subprojects': [],
    },
    content: [],
    createdAt: d(-90), updatedAt: d(-60), createdBy: 'Bob', lastEditedBy: 'Bob',
  },
  'pj8': {
    id: 'pj8', databaseId: DB_PROJECTS, icon: '🧪',
    properties: {
      'proj-title': 'R&D Exploration', 'proj-status': 'ps-planning',
      'proj-priority': 'pp-low', 'proj-start': d(10), 'proj-end': d(90),
      'proj-budget': 15000, 'proj-lead': 'Diana',
      'proj-tasks': ['t6'], 'proj-client': [],
      'proj-content': ['ct3'], 'proj-equipment': ['i2', 'i3', 'i5'],
      'proj-subprojects': [],
    },
    content: [],
    createdAt: d(-2), updatedAt: d(-1), createdBy: 'Diana', lastEditedBy: 'Diana',
  },
};

export const reverseRelationData: Record<string, Record<string, string[]>> = {
  't1': { 'prop-project': ['pj1', 'pj4'] },
  't2': { 'prop-project': ['pj1', 'pj6'] },
  't3': { 'prop-project': ['pj4', 'pj5'] },
  't4': { 'prop-project': ['pj2', 'pj5'] },
  't5': { 'prop-project': ['pj3'] },
  't6': { 'prop-project': ['pj3', 'pj8'] },
  't7': { 'prop-project': ['pj1', 'pj6'] },
  't8': { 'prop-project': ['pj2', 'pj4'] },
  'c1': { 'prop-projects': ['pj1', 'pj6'] },
  'c2': { 'prop-projects': ['pj2'] },
  'c3': { 'prop-projects': ['pj4'] },
  'c4': { 'prop-projects': ['pj7'] },
  'c5': { 'prop-projects': ['pj3'] },
  'c6': { 'prop-projects': ['pj5'] },
  'i1': { 'prop-project-inv': ['pj1', 'pj5'] },
  'i2': { 'prop-project-inv': ['pj3', 'pj8'] },
  'i3': { 'prop-project-inv': ['pj4', 'pj8'] },
  'i4': { 'prop-project-inv': ['pj1', 'pj6'] },
  'i5': { 'prop-project-inv': ['pj5', 'pj8'] },
};
