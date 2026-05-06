# ObjectDatabase component

Phase 1 extracts a structural component shell around the existing app. The current dev workflow still uses the Vite `/api/dbms/*` middleware through `HttpAdapter`.

## Adapters provided

- `HttpAdapter` maps the contract onto the existing Vite `/api/dbms/*` development middleware.
- `InMemoryAdapter` stores the full state in browser memory for embedded demos and isolated smoke checks.
- `RemoteAdapter` speaks the locked ObjectDatabase adapter contract over HTTP to any contract-compliant `/v1/*` service.

```tsx
<ObjectDatabase adapter={new RemoteAdapter('https://my-backend.example.com')} />
```

`RemoteAdapter` implements `subscribe` with SSE. When `<ObjectDatabase />` mounts with a `RemoteAdapter`, it automatically listens to `/v1/subscribe`; remote page events patch local state, schema events reload state, and reconnects trigger a synthetic `state-replaced` resync.

## Current dev workflow

```tsx
import { ObjectDatabase, HttpAdapter } from 'notion-database-sys/component';
import 'notion-database-sys/src/index.css';
import 'notion-database-sys/src/theme.css';

export function DevDatabase() {
  return <ObjectDatabase mode="page" adapter={new HttpAdapter()} theme="light" />;
}
```

## In-memory embedding smoke test

```tsx
import { ObjectDatabase, InMemoryAdapter } from 'notion-database-sys/component';
import type { NotionState } from 'notion-database-sys/src/component/types';

const seed: NotionState = { databases: {}, pages: {}, views: {} };
const adapter = new InMemoryAdapter(seed);

export function EmbeddedDatabase() {
  return <ObjectDatabase mode="inline" databaseId="tasks" adapter={adapter} />;
}
```

## Multi-instance support

Each `<ObjectDatabase />` mount creates its own Zustand store, uses its own adapter instance, and owns its own adapter/HMR subscription lifecycle. Mutations in one mounted database do not update another mounted database unless both are intentionally wired to the same adapter or backing data source.

Calling `useStoreApi()` or `useDatabaseStore()` outside `<ObjectDatabase />` throws a setup error so singleton access cannot silently leak back into embedded usage.

For a manual acceptance test, see `src/component/__smoke__/two-instances.example.tsx`.

## Adapter contract

Adapters implement a document-shaped contract:

- `loadState(): Promise<NotionState>`
- `findPages(query: PageQuery): Promise<Page[]>`
- `getPage(id: string): Promise<Page | null>`
- `insertPage(databaseId: string, page: Omit<Page, 'id'>): Promise<Page>`
- `patchPage(id: string, changes: Partial<Page['properties']>): Promise<Page>`
- `deletePage(id: string): Promise<void>`
- `addProperty(databaseId: string, prop: SchemaProperty): Promise<void>`
- `removeProperty(databaseId: string, propertyId: string): Promise<void>`
- `changePropertyType(databaseId: string, propertyId: string, newType: PropertyType): Promise<void>`
- `subscribe?(callback: (event: ChangeEvent) => void): () => void`

The contract is document-shaped to support both NoSQL backends (MongoDB, Firestore) and SQL backends fronted by query federation layers (Trino, Presto).

`subscribe` is optional. Adapters without a realtime channel should leave it undefined rather than implement a no-op; consumers check existence before calling.

## Writing a custom adapter

```tsx
import type { ObjectDatabaseAdapter, PageQuery, NotionState } from 'notion-database-sys/component';
import type { Page, PropertyType, SchemaProperty } from 'notion-database-sys/src/types/database';

export class MyBackendAdapter implements ObjectDatabaseAdapter {
  async loadState(): Promise<NotionState> { throw new Error('TODO'); }
  async findPages(query: PageQuery): Promise<Page[]> { throw new Error('TODO'); }
  async getPage(id: string): Promise<Page | null> { throw new Error('TODO'); }
  async insertPage(databaseId: string, page: Omit<Page, 'id'>): Promise<Page> { throw new Error('TODO'); }
  async patchPage(id: string, changes: Partial<Page['properties']>): Promise<Page> { throw new Error('TODO'); }
  async deletePage(id: string): Promise<void> { throw new Error('TODO'); }
  async addProperty(databaseId: string, prop: SchemaProperty): Promise<void> { throw new Error('TODO'); }
  async removeProperty(databaseId: string, propertyId: string): Promise<void> { throw new Error('TODO'); }
  async changePropertyType(databaseId: string, propertyId: string, newType: PropertyType): Promise<void> { throw new Error('TODO'); }
}
```

## Consumer requirements

Consumers must provide compatible peers: React 19, ReactDOM 19, Zustand 5, lucide-react, date-fns, Tailwind CSS v4, and the project's `index.css`/`theme.css` tokens once at app level.

`HttpAdapter` currently maps this contract onto the existing `/api/dbms/*` dev routes and applies `PageQuery` filters client-side. Server-side filtering is deferred to a later backend phase.
