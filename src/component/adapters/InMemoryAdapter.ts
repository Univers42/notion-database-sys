/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   InMemoryAdapter.ts                                 :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/06 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 18:48:28 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type {
  ChangeEvent,
  NotionState,
  ObjectDatabaseAdapter,
  Page,
  PageQuery,
  PropertyType,
  SchemaProperty,
} from '../types';
import { applyPageQuery } from './docFilter';

const EMPTY_STATE: NotionState = {
  databases: {},
  pages: {},
  views: {},
};

/** Adapter that stores all state in browser memory without a backend. */
export class InMemoryAdapter implements ObjectDatabaseAdapter {
  private state: NotionState;

  private readonly subscribers = new Set<(event: ChangeEvent) => void>();

  /** Creates an in-memory adapter seeded from an optional state snapshot. */
  constructor(initialState: NotionState = EMPTY_STATE) {
    this.state = cloneState(initialState);
  }

  /** Loads a clone of the current in-memory state. */
  async loadState(): Promise<NotionState> {
    return cloneState(this.state);
  }

  /** Finds pages from the current in-memory snapshot. */
  async findPages(query: PageQuery): Promise<Page[]> {
    return applyPageQuery(Object.values(this.state.pages), query).map(page => clone(page));
  }

  /** Returns one in-memory page by id, or null when it does not exist. */
  async getPage(id: string): Promise<Page | null> {
    const page = this.state.pages[id];
    return page ? clone(page) : null;
  }

  /** Inserts a page into the in-memory state and emits a page-inserted event. */
  async insertPage(databaseId: string, page: Omit<Page, 'id'>): Promise<Page> {
    const inserted: Page = { ...clone(page), id: createId('page'), databaseId };
    this.state.pages[inserted.id] = inserted;
    this.emit({ type: 'page-inserted', page: clone(inserted) });
    return clone(inserted);
  }

  /** Patches in-memory page properties and emits a page-changed event. */
  async patchPage(id: string, changes: Partial<Page['properties']>): Promise<Page> {
    const page = this.state.pages[id];
    if (!page) throw new Error(`Page ${id} not found`);

    const updated: Page = {
      ...page,
      properties: { ...page.properties, ...clone(changes) },
      updatedAt: new Date().toISOString(),
      lastEditedBy: 'You',
    };
    this.state.pages[id] = updated;
    this.emit({ type: 'page-changed', pageId: id, changes: clone(changes) });
    return clone(updated);
  }

  /** Deletes an in-memory page and emits a page-deleted event. */
  async deletePage(id: string): Promise<void> {
    delete this.state.pages[id];
    this.emit({ type: 'page-deleted', pageId: id });
  }

  /** Adds a property definition to an in-memory database and emits schema-changed. */
  async addProperty(databaseId: string, prop: SchemaProperty): Promise<void> {
    const database = this.state.databases[databaseId];
    if (!database) throw new Error(`Database ${databaseId} not found`);

    this.state.databases[databaseId] = {
      ...database,
      properties: { ...database.properties, [prop.id]: clone(prop) },
    };
    for (const page of Object.values(this.state.pages)) {
      if (page.databaseId === databaseId) page.properties[prop.id] ??= null;
    }
    this.emit({ type: 'schema-changed', databaseId });
  }

  /** Removes a property definition from an in-memory database and emits schema-changed. */
  async removeProperty(databaseId: string, propertyId: string): Promise<void> {
    const database = this.state.databases[databaseId];
    if (!database) return;

    const properties = { ...database.properties };
    delete properties[propertyId];
    this.state.databases[databaseId] = { ...database, properties };
    for (const page of Object.values(this.state.pages)) {
      if (page.databaseId === databaseId) delete page.properties[propertyId];
    }
    this.emit({ type: 'schema-changed', databaseId });
  }

  /** Changes a property type in an in-memory database and emits schema-changed. */
  async changePropertyType(
    databaseId: string,
    propertyId: string,
    newType: PropertyType,
  ): Promise<void> {
    const database = this.state.databases[databaseId];
    const property = database?.properties[propertyId];
    if (!database || !property) return;

    this.state.databases[databaseId] = {
      ...database,
      properties: {
        ...database.properties,
        [propertyId]: { ...property, type: newType },
      },
    };
    this.emit({ type: 'schema-changed', databaseId });
  }

  /** Subscribes to in-memory mutation events. */
  subscribe(callback: (event: ChangeEvent) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private emit(event: ChangeEvent): void {
    queueMicrotask(() => {
      for (const callback of this.subscribers) callback(event);
    });
  }
}

function createId(prefix: string): string {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`;
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function cloneState(state: NotionState): NotionState {
  return clone(state);
}

function clone<T>(value: T): T {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}
