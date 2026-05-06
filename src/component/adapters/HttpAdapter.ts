/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   HttpAdapter.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/06 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 18:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { Page, PropertyType, SchemaProperty } from '../../types/database';
import type {
  ChangeEvent,
  NotionState,
  ObjectDatabaseAdapter,
  PageQuery,
} from '../types';
import { applyPageQuery } from './docFilter';

type JsonRequestInit = Omit<RequestInit, 'body'> & { body?: unknown };
type InsertRecordResult = { ok: boolean; pageId: string; query?: string | null };
type DevFileChangeEvent = {
  file: string;
  source: string;
  patches?: Record<string, Record<string, unknown>>;
};

/** Adapter for the existing Vite `/api/dbms/*` development routes. */
export class HttpAdapter implements ObjectDatabaseAdapter {
  private readonly baseUrl: string;

  /** Optional Vite HMR-backed realtime subscription channel. */
  readonly subscribe?: (callback: (event: ChangeEvent) => void) => () => void;

  /** Creates an HTTP adapter targeting same-origin routes by default. */
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    if (import.meta.hot) {
      this.subscribe = (callback) => {
        const listener = (data: unknown) => translateFileChangeEvent(data as DevFileChangeEvent).forEach(callback);
        import.meta.hot?.on('dbms:file-changed', listener);
        return () => import.meta.hot?.off('dbms:file-changed', listener);
      };
    }
  }

  /** Loads the complete Notion state from `/api/dbms/state`. */
  async loadState(): Promise<NotionState> {
    return this.request<NotionState>('/api/dbms/state');
  }

  /** Finds pages by applying PageQuery client-side over `/api/dbms/state`. */
  async findPages(query: PageQuery): Promise<Page[]> {
    const state = await this.loadState();
    return applyPageQuery(Object.values(state.pages), query);
  }

  /** Returns one page by id, or null when it does not exist. */
  async getPage(id: string): Promise<Page | null> {
    const pages = await this.findPages({ filter: { id: { eq: id } }, limit: 1 });
    return pages[0] ?? null;
  }

  /** Inserts a page through the existing `/api/dbms/records` route. */
  async insertPage(databaseId: string, page: Omit<Page, 'id'>): Promise<Page> {
    const result = await this.request<InsertRecordResult>('/api/dbms/records', {
      method: 'POST',
      body: {
        databaseId,
        properties: page.properties,
      },
    });
    return { ...page, id: result.pageId, databaseId };
  }

  /** Patches page properties through `/api/dbms/pages/:id`, one property at a time. */
  async patchPage(id: string, changes: Partial<Page['properties']>): Promise<Page> {
    // Known dev-server limitation: the route accepts one property per request.
    // A future server phase should accept the full `changes` object in one PATCH.
    for (const [propertyId, value] of Object.entries(changes)) {
      await this.request(`/api/dbms/pages/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: { propertyId, value },
      });
    }
    const page = await this.getPage(id);
    if (!page) throw new Error(`Page ${id} not found after patch`);
    return page;
  }

  /** Deletes a page through `/api/dbms/records/:id`. */
  async deletePage(id: string): Promise<void> {
    await this.request(`/api/dbms/records/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  /** Adds a schema property through `/api/dbms/columns`. */
  async addProperty(databaseId: string, prop: SchemaProperty): Promise<void> {
    await this.request('/api/dbms/columns', {
      method: 'POST',
      body: {
        databaseId,
        columnName: prop.name,
        propType: prop.type,
        propId: prop.id,
      },
    });
  }

  /** Removes a schema property through `/api/dbms/columns/:databaseId/:propertyId`. */
  async removeProperty(databaseId: string, propertyId: string): Promise<void> {
    await this.request(
      `/api/dbms/columns/${encodeURIComponent(databaseId)}/${encodeURIComponent(propertyId)}`,
      { method: 'DELETE' },
    );
  }

  /** Changes a schema property type through `/api/dbms/columns/:databaseId/:propertyId/type`. */
  async changePropertyType(
    databaseId: string,
    propertyId: string,
    newType: PropertyType,
  ): Promise<void> {
    const state = await this.loadState();
    const oldType = state.databases[databaseId]?.properties[propertyId]?.type ?? newType;
    await this.request(
      `/api/dbms/columns/${encodeURIComponent(databaseId)}/${encodeURIComponent(propertyId)}/type`,
      { method: 'PATCH', body: { oldType, newType } },
    );
  }

  private async request<T = unknown>(path: string, init: JsonRequestInit = {}): Promise<T> {
    const { body, headers, ...rest } = init;
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...rest,
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) as unknown : undefined;
    if (!response.ok) {
      const message = typeof data === 'object' && data !== null && 'error' in data
        ? String((data as { error: unknown }).error)
        : response.statusText;
      throw new Error(message);
    }
    return data as T;
  }
}

function translateFileChangeEvent(data: DevFileChangeEvent): ChangeEvent[] {
  if (!data.patches || Object.keys(data.patches).length === 0) return [{ type: 'state-replaced' }];
  return Object.entries(data.patches).map(([pageId, changes]) => ({
    type: 'page-changed',
    pageId,
    changes,
  }));
}
