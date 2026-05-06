/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   RemoteAdapter.ts                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/06 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 18:48:28 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import {
  AdapterError,
  type ChangeEvent,
  type NotionState,
  type ObjectDatabaseAdapter,
  type Page,
  type PageQuery,
  type PropertyType,
  type SchemaProperty,
} from '../types';

type ErrorPayload = {
  error?: unknown;
  code?: unknown;
};

type OkResponse = {
  ok: true;
};

/**
 * Speaks the ObjectDatabaseAdapter contract over HTTP to a /v1/* contract-server.
 * Backend-agnostic — the service decides whether Mongo, Postgres, or Trino is behind it.
 *
 * Realtime subscribe uses the contract-server's SSE endpoint at /v1/subscribe.
 */
export class RemoteAdapter implements ObjectDatabaseAdapter {
  /** Creates a remote adapter targeting a contract-compliant HTTP service. */
  constructor(
    private readonly baseUrl: string,
    private readonly fetch: typeof globalThis.fetch = globalThis.fetch,
  ) { }

  /** Loads the complete contract state from /v1/loadState. */
  async loadState(): Promise<NotionState> {
    return this.request<NotionState>('loadState', {});
  }

  /** Finds pages with server-side PageQuery handling. */
  async findPages(query: PageQuery): Promise<Page[]> {
    return this.request<Page[]>('findPages', query);
  }

  /** Returns one page by id, or null when absent. */
  async getPage(id: string): Promise<Page | null> {
    return this.request<Page | null>('getPage', { id });
  }

  /** Inserts one page into a database. */
  async insertPage(databaseId: string, page: Omit<Page, 'id'>): Promise<Page> {
    return this.request<Page>('insertPage', { databaseId, page });
  }

  /** Patches page properties and returns the updated page. */
  async patchPage(id: string, changes: Partial<Page['properties']>): Promise<Page> {
    return this.request<Page>('patchPage', { id, changes });
  }

  /** Deletes one page. */
  async deletePage(id: string): Promise<void> {
    await this.request<OkResponse>('deletePage', { id });
  }

  /** Adds one schema property. */
  async addProperty(databaseId: string, property: SchemaProperty): Promise<void> {
    await this.request<OkResponse>('addProperty', { databaseId, property });
  }

  /** Removes one schema property. */
  async removeProperty(databaseId: string, propertyId: string): Promise<void> {
    await this.request<OkResponse>('removeProperty', { databaseId, propertyId });
  }

  /** Changes one schema property type. */
  async changePropertyType(
    databaseId: string,
    propertyId: string,
    newType: PropertyType,
  ): Promise<void> {
    await this.request<OkResponse>('changePropertyType', { databaseId, propertyId, newType });
  }

  /** Subscribes to every ChangeEvent streamed by the remote contract service. */
  subscribe(callback: (event: ChangeEvent) => void): () => void {
    const endpointPath = '/v1/subscribe';
    const url = `${this.baseUrl.replace(/\/+$/, '')}${endpointPath}`;
    const EventSourceCtor = globalThis.EventSource;
    if (!EventSourceCtor) {
      throw new AdapterError('EventSource is not available in this runtime', 0, endpointPath, 'EVENTSOURCE_UNAVAILABLE');
    }

    let firstOpen = true;
    const source = new EventSourceCtor(url);

    source.addEventListener('open', () => {
      if (!firstOpen) callback({ type: 'state-replaced' });
      firstOpen = false;
    });

    source.addEventListener('message', (event: MessageEvent<string>) => {
      try {
        callback(JSON.parse(event.data) as ChangeEvent);
      } catch {
        // Ignore malformed events so a single bad payload cannot crash the host.
      }
    });

    source.addEventListener('error', () => {
      // EventSource auto-reconnects; the next post-initial open emits state-replaced.
    });

    return () => source.close();
  }

  private async request<T>(path: string, body: unknown): Promise<T> {
    const endpointPath = `/v1/${path.replace(/^\/+/, '')}`;
    const url = `${this.baseUrl.replace(/\/+$/, '')}${endpointPath}`;
    let response: Response;

    try {
      response = await this.fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (error) {
      throw new AdapterError(errorMessage(error), 503, endpointPath, 'FETCH_FAILED');
    }

    const payload = await parseJsonResponse(response, endpointPath);
    if (!response.ok) {
      const errorPayload = isErrorPayload(payload) ? payload : {};
      throw new AdapterError(
        typeof errorPayload.error === 'string' ? errorPayload.error : `Request failed with HTTP ${response.status}`,
        response.status,
        endpointPath,
        typeof errorPayload.code === 'string' ? errorPayload.code : undefined,
      );
    }

    return payload as T;
  }
}

async function parseJsonResponse(response: Response, path: string): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;

  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    throw new AdapterError(`Invalid JSON response: ${errorMessage(error)}`, response.status, path, 'INVALID_JSON');
  }
}

function isErrorPayload(value: unknown): value is ErrorPayload {
  return Boolean(value && typeof value === 'object');
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
