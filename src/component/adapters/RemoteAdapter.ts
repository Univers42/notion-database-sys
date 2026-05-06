/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   RemoteAdapter.ts                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/06 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 20:25:39 by dlesieur         ###   ########.fr       */
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

/** Token value or async token getter used by RemoteAdapter authentication. */
export type RemoteAdapterToken = string | (() => Promise<string>);

/** RemoteAdapter constructor options. */
export type RemoteAdapterOptions = {
  baseUrl: string;
  token?: RemoteAdapterToken;
  fetch?: typeof globalThis.fetch;
};

/**
 * Speaks the ObjectDatabaseAdapter contract over HTTP to a /v1/* contract-server.
 * Backend-agnostic — the service decides whether Mongo, Postgres, or Trino is behind it.
 *
 * Realtime subscribe uses the contract-server's SSE endpoint at /v1/subscribe.
 */
export class RemoteAdapter implements ObjectDatabaseAdapter {
  private readonly baseUrl: string;

  private readonly fetch: typeof globalThis.fetch;

  private readonly token?: RemoteAdapterToken;

  private lastSeenEventId: string | null = null;

  /** Creates a remote adapter targeting a contract-compliant HTTP service. */
  constructor(
    options: RemoteAdapterOptions | string,
    legacyFetch: typeof globalThis.fetch = globalThis.fetch,
  ) {
    if (typeof options === 'string') {
      this.baseUrl = options;
      this.fetch = bindFetch(legacyFetch);
      return;
    }
    this.baseUrl = options.baseUrl;
    this.fetch = bindFetch(options.fetch ?? globalThis.fetch);
    this.token = options.token;
  }

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
    const EventSourceCtor = globalThis.EventSource;
    if (!EventSourceCtor) {
      throw new AdapterError('EventSource is not available in this runtime', 0, endpointPath, 'EVENTSOURCE_UNAVAILABLE');
    }

    let closed = false;
    let source: EventSource | null = null;

    void this.resolveToken().then((token) => {
      if (closed) return;
      source = new EventSourceCtor(this.subscribeUrl(endpointPath, token));

      source.addEventListener('open', () => {
        // EventSource automatically sends Last-Event-ID on reconnect.
        // The server either replays missed events or emits state-replaced on gaps.
      });

      source.addEventListener('message', (event: MessageEvent<string>) => {
        try {
          this.lastSeenEventId = event.lastEventId || this.lastSeenEventId;
          callback(JSON.parse(event.data) as ChangeEvent);
        } catch {
          // Ignore malformed events so a single bad payload cannot crash the host.
        }
      });

      source.addEventListener('error', () => {
        // EventSource auto-reconnects; the server decides whether replay or state-replaced is needed.
      });
    }).catch(() => undefined);

    return () => {
      closed = true;
      source?.close();
    };
  }

  private async request<T>(path: string, body: unknown, retry = true): Promise<T> {
    const endpointPath = `/v1/${path.replace(/^\/+/, '')}`;
    const url = `${this.baseUrl.replace(/\/+$/, '')}${endpointPath}`;
    let response: Response;
    const token = await this.resolveToken();

    try {
      response = await this.fetch(url, {
        method: 'POST',
        headers: this.jsonHeaders(token),
        body: JSON.stringify(body),
      });
    } catch (error) {
      throw new AdapterError(errorMessage(error), 503, endpointPath, 'FETCH_FAILED');
    }

    const payload = await parseJsonResponse(response, endpointPath);
    if (response.status === 401 && retry && typeof this.token === 'function') {
      return this.request<T>(path, body, false);
    }
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

  private async resolveToken(): Promise<string | undefined> {
    if (!this.token) return undefined;
    if (typeof this.token === 'string') return this.token;
    return this.token();
  }

  private jsonHeaders(token: string | undefined): HeadersInit {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  private subscribeUrl(endpointPath: string, token: string | undefined): string {
    const url = new URL(`${this.baseUrl.replace(/\/+$/, '')}${endpointPath}`);
    if (token) url.searchParams.set('token', token);
    return url.toString();
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

function bindFetch(fetchImpl: typeof globalThis.fetch): typeof globalThis.fetch {
  return fetchImpl.bind(globalThis);
}
