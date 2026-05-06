/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   two-instances.example.tsx                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/06 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 18:32:35 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * Manual Phase 2b smoke test:
 * 1. Temporarily point src/main.tsx at this component instead of ObjectDatabase.
 * 2. Run the dev server with pnpm dev:src.
 * 3. Edit/add rows in the Tasks instance and verify the CRM instance does not change.
 * 4. Edit/add rows in the CRM instance and verify the Tasks instance does not change.
 *
 * Phase 3b extension:
 * This demonstrates the contract works end-to-end through a real persistence layer.
 * RemoteAdapter changes survive page refresh; InMemoryAdapter changes don't.
 *
 * Phase 3c extension:
 * The two RemoteAdapter instances share a contract-server. Mutating data in one
 * should appear in the other in real time, without manual refresh. This demonstrates subscribe.
 */

import { ObjectDatabase } from '../../object_database';
import { InMemoryAdapter, RemoteAdapter } from '../adapters';
import type { NotionState } from '../types';
import { useEffect, useMemo, useState } from 'react';

const tasksAdapter = new InMemoryAdapter(createTasksState());
const crmAdapter = new InMemoryAdapter(createCrmState());

/** Renders two isolated ObjectDatabase instances with independent stores/adapters. */
export function TwoObjectDatabaseInstancesSmoke() {
  const [taskEvents, setTaskEvents] = useState(0);
  const [remoteUrl, setRemoteUrl] = useState('http://localhost:4100');
  const remoteAdapterOne = useMemo(() => new RemoteAdapter(remoteUrl), [remoteUrl]);
  const remoteAdapterTwo = useMemo(() => new RemoteAdapter(remoteUrl), [remoteUrl]);

  useEffect(() => tasksAdapter.subscribe((event) => {
    if (event.type === 'page-changed') setTaskEvents(count => count + 1);
  }), []);

  return (
    <div className="flex h-screen w-screen flex-col gap-4 bg-surface-secondary p-4">
      <header className="flex items-center gap-3 rounded-xl border border-line bg-surface-primary px-4 py-3 text-sm text-ink-secondary">
        <label className="font-semibold text-ink-strong" htmlFor="remote-contract-url">
          Remote contract URL
        </label>
        <input
          id="remote-contract-url"
          className="w-80 rounded-md border border-line bg-surface-primary px-3 py-1 text-sm text-ink-strong outline-none focus:border-accent"
          value={remoteUrl}
          onChange={event => setRemoteUrl(event.target.value)}
        />
        <span>Run make up-contract + make seed-contract before using the remote panel.</span>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-4 gap-4">
        <section className="min-h-0 overflow-hidden rounded-xl border border-line bg-surface-primary">
          <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-2 text-sm font-semibold text-ink-strong">
            <span>Tasks memory seed: 2 pages · subscribe events: {taskEvents}</span>
            <button
              className="rounded-md border border-line px-2 py-1 text-xs text-ink-secondary hover:bg-hover-surface"
              onClick={() => void tasksAdapter.patchPage('task-1', { 'tasks-status': 'Done' })}
            >
              Adapter patch
            </button>
          </header>
          <ObjectDatabase
            mode="inline"
            databaseId="db-tasks"
            initialView="view-tasks"
            adapter={tasksAdapter}
            theme="light"
          />
        </section>
        <section className="min-h-0 overflow-hidden rounded-xl border border-line bg-surface-primary">
          <header className="border-b border-line px-4 py-2 text-sm font-semibold text-ink-strong">
            CRM memory seed: 3 pages
          </header>
          <ObjectDatabase
            mode="inline"
            databaseId="db-crm"
            initialView="view-crm"
            adapter={crmAdapter}
            theme="light"
          />
        </section>
        <section className="min-h-0 overflow-hidden rounded-xl border border-line bg-surface-primary">
          <header className="border-b border-line px-4 py-2 text-sm font-semibold text-ink-strong">
            Remote A · Mongo-backed persistence
          </header>
          <ObjectDatabase
            mode="inline"
            databaseId="db-tasks"
            initialView="view-tasks"
            adapter={remoteAdapterOne}
            theme="light"
          />
        </section>
        <section className="min-h-0 overflow-hidden rounded-xl border border-line bg-surface-primary">
          <header className="border-b border-line px-4 py-2 text-sm font-semibold text-ink-strong">
            Remote B · SSE realtime mirror
          </header>
          <ObjectDatabase
            mode="inline"
            databaseId="db-tasks"
            initialView="view-tasks"
            adapter={remoteAdapterTwo}
            theme="light"
          />
        </section>
      </div>
    </div>
  );
}

export default TwoObjectDatabaseInstancesSmoke;

function createTasksState(): NotionState {
  const now = new Date().toISOString();
  return {
    databases: {
      'db-tasks': {
        id: 'db-tasks',
        name: 'Tasks',
        icon: '✅',
        titlePropertyId: 'tasks-title',
        properties: {
          'tasks-title': { id: 'tasks-title', name: 'Task', type: 'title' },
          'tasks-status': {
            id: 'tasks-status',
            name: 'Status',
            type: 'select',
            options: [
              { id: 'todo', value: 'Todo', color: 'gray' },
              { id: 'doing', value: 'Doing', color: 'blue' },
              { id: 'done', value: 'Done', color: 'green' },
            ],
          },
        },
      },
    },
    pages: {
      'task-1': createPage('task-1', 'db-tasks', now, { 'tasks-title': 'Draft Phase 2b notes', 'tasks-status': 'Doing' }),
      'task-2': createPage('task-2', 'db-tasks', now, { 'tasks-title': 'Verify isolated edits', 'tasks-status': 'Todo' }),
    },
    views: {
      'view-tasks': {
        id: 'view-tasks',
        databaseId: 'db-tasks',
        name: 'Tasks table',
        type: 'table',
        filters: [],
        filterConjunction: 'and',
        sorts: [],
        visibleProperties: ['tasks-title', 'tasks-status'],
        settings: { showTitle: true, showRowNumbers: true },
      },
    },
  };
}

function createCrmState(): NotionState {
  const now = new Date().toISOString();
  return {
    databases: {
      'db-crm': {
        id: 'db-crm',
        name: 'CRM',
        icon: '🏢',
        titlePropertyId: 'crm-title',
        properties: {
          'crm-title': { id: 'crm-title', name: 'Company', type: 'title' },
          'crm-stage': {
            id: 'crm-stage',
            name: 'Stage',
            type: 'select',
            options: [
              { id: 'lead', value: 'Lead', color: 'yellow' },
              { id: 'qualified', value: 'Qualified', color: 'blue' },
              { id: 'customer', value: 'Customer', color: 'green' },
            ],
          },
        },
      },
    },
    pages: {
      'crm-1': createPage('crm-1', 'db-crm', now, { 'crm-title': 'Acme Corp', 'crm-stage': 'Lead' }),
      'crm-2': createPage('crm-2', 'db-crm', now, { 'crm-title': 'Globex', 'crm-stage': 'Qualified' }),
      'crm-3': createPage('crm-3', 'db-crm', now, { 'crm-title': 'Initech', 'crm-stage': 'Customer' }),
    },
    views: {
      'view-crm': {
        id: 'view-crm',
        databaseId: 'db-crm',
        name: 'CRM table',
        type: 'table',
        filters: [],
        filterConjunction: 'and',
        sorts: [],
        visibleProperties: ['crm-title', 'crm-stage'],
        settings: { showTitle: true, showRowNumbers: true },
      },
    },
  };
}

function createPage(id: string, databaseId: string, now: string, properties: Record<string, unknown>) {
  return {
    id,
    databaseId,
    properties,
    content: [],
    createdAt: now,
    updatedAt: now,
    createdBy: 'Smoke Test',
    lastEditedBy: 'Smoke Test',
  };
}
