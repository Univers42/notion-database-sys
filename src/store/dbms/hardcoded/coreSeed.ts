/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   coreSeed.ts                                        :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/02 14:39:24 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/02 14:48:56 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// coreSeed.ts — Tasks, CRM, Content & Inventory seed databases

import type { DatabaseSchema } from '../../../types/database';

export const DB_TASKS = 'db-tasks';
export const DB_CRM = 'db-crm';
export const DB_CONTENT = 'db-content';
export const DB_INVENTORY = 'db-inventory';

const _now = new Date().toISOString();
export function daysFromNow(offset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString();
}
const _d = daysFromNow;

export { corePages, coreViews } from './coreSeedData';

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
