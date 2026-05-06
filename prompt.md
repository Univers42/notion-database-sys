# Prompt: connect ObjectDatabase components to the MongoDB-backed bridge

## Purpose

Use this document as the implementation prompt for the next bridge phase.

The goal is to connect every database UI component and every database mutation path to the new `ObjectDatabaseAdapter` system through the MongoDB-backed contract server. For this phase, MongoDB is the only persistence target. JSON, CSV, PostgreSQL, and the legacy Vite DBMS routes remain useful as historical references and seed sources, but they must not be the active persistence bridge for the embeddable package or the reference parent app.

The target experience is:

1. A host app renders `ObjectDatabase` from `@notion-db/object-database`.
2. The host creates one `RemoteAdapter` pointing at the contract server.
3. `ObjectDatabase` loads state through `RemoteAdapter.loadState()`.
4. All component edits call adapter methods, not legacy `/api/dbms/*` routes.
5. The contract server persists documents and schema changes in MongoDB.
6. SSE events from `/v1/subscribe` synchronize multiple mounted `ObjectDatabase` instances.
7. The dataset remains the canonical store dataset under `src/store/dbms/*`, with MongoDB using `src/store/dbms/mongodb` as the active seed set.

## Canonical architecture

```text
examples/parent-app or any external host
  └─ imports @notion-db/object-database
      └─ <ObjectDatabase adapter={remoteAdapter} mode="page|inline" />
          ├─ per-mount Zustand store
          ├─ database UI components in src/components/**
          ├─ adapter-bound mutation bridge
          └─ RemoteAdapter
              ├─ POST /v1/loadState
              ├─ POST /v1/findPages
              ├─ POST /v1/getPage
              ├─ POST /v1/insertPage
              ├─ POST /v1/patchPage
              ├─ POST /v1/deletePage
              ├─ POST /v1/addProperty
              ├─ POST /v1/removeProperty
              ├─ POST /v1/changePropertyType
              └─ GET  /v1/subscribe  (SSE)
                  └─ packages/contract-server
                      ├─ Fastify HTTP bridge
                      ├─ MongoDB connection
                      ├─ _meta.notion-state
                      └─ Mongo collections: tasks, contacts, content, inventory, products, projects
```

The contract server is the bridge. Do not put MongoDB access code in React components, the package build, or the parent app. The browser only talks to `RemoteAdapter`; `RemoteAdapter` only talks to `/v1/*`; `/v1/*` is the only layer that touches MongoDB.

## Current implementation state

### Package and parent app

- `packages/object-database` builds the `@notion-db/object-database` package.
- `examples/parent-app` is the reference external host.
- The parent app imports package CSS once at app entry:
  - `@notion-db/object-database/theme.css`
  - `leaflet/dist/leaflet.css`
- The parent app creates one shared `RemoteAdapter`:

```tsx
const adapter = new RemoteAdapter({
  baseUrl: import.meta.env.VITE_CONTRACT_SERVER_URL ?? 'http://localhost:4100',
  token: import.meta.env.VITE_CONTRACT_SERVER_TOKEN || undefined,
});
```

- The parent app renders both a page instance and an inline instance against the same adapter.
- The package build intentionally disables formula WASM probing for now. Formula cells should degrade gracefully instead of requesting a missing WASM asset.

### Adapter contract

The shared contract lives in `@notion-db/contract-types` and is re-exported by the component package.

Required adapter methods:

```ts
interface ObjectDatabaseAdapter {
  loadState(): Promise<NotionState>;
  findPages(query: PageQuery): Promise<Page[]>;
  getPage(id: string): Promise<Page | null>;
  insertPage(databaseId: string, page: Omit<Page, 'id'>): Promise<Page>;
  patchPage(id: string, changes: Partial<Page['properties']>): Promise<Page>;
  deletePage(id: string): Promise<void>;
  addProperty(databaseId: string, prop: SchemaProperty): Promise<void>;
  removeProperty(databaseId: string, propertyId: string): Promise<void>;
  changePropertyType(databaseId: string, propertyId: string, newType: PropertyType): Promise<void>;
  subscribe?(callback: (event: ChangeEvent) => void): () => void;
}
```

The client implementation is `src/component/adapters/RemoteAdapter.ts`.

Important runtime details already fixed:

- Browser `fetch` must be bound to `globalThis` before storing it on the adapter.
- `RemoteAdapter.subscribe()` uses native `EventSource` against `/v1/subscribe`.
- Browser `EventSource` cannot set custom headers, so the token is sent as `?token=...` for SSE only.
- Normal HTTP requests send `Authorization: Bearer <token>` when a token exists.

### Contract server

The server package is `packages/contract-server`.

Core files:

- `src/server.ts` builds the Fastify app, CORS, health route, auth hook, and `/v1` route tree.
- `src/db/connections.ts` opens MongoDB and maps Notion database ids to Mongo collections.
- `src/routes/state.ts` implements `loadState`.
- `src/routes/pages.ts` implements page query and page CRUD.
- `src/routes/schema.ts` implements schema mutation.
- `src/routes/pageStorage.ts` maps MongoDB documents to contract `Page` objects and back.
- `src/routes/subscribe.ts` streams `ChangeEvent` values over SSE.
- `src/scripts/seed.ts` seeds `_meta.notion-state` from the current store metadata files.

### MongoDB storage model

MongoDB uses six page collections plus one metadata collection:

| Notion database id | Mongo collection |
| --- | --- |
| `db-tasks` | `tasks` |
| `db-crm` | `contacts` |
| `db-content` | `content` |
| `db-inventory` | `inventory` |
| `db-products` | `products` |
| `db-projects` | `projects` |

The map is hard-coded in `packages/contract-server/src/db/connections.ts` as `DB_TO_TABLE`. Keep this map aligned with all seed files and `_field_map.json` files.

The `_meta` collection contains one document:

```json
{
  "_id": "notion-state",
  "databases": {},
  "views": {},
  "fieldMaps": {},
  "updatedAt": "..."
}
```

`databases` and `views` come from `src/store/dbms/mongodb/_notion_state.json` first. If that file is unavailable, the seed script falls back to `src/store/dbms/json/_notion_state.json`.

`fieldMaps` comes from `src/store/dbms/mongodb/_field_map.json` first. If unavailable, the seed script falls back to `src/store/dbms/json/_field_map.json`.

Page documents come from `src/store/dbms/mongodb/*.seed.json`:

- `tasks.seed.json`
- `contacts.seed.json`
- `content.seed.json`
- `inventory.seed.json`
- `products.seed.json`
- `projects.seed.json`

### Field mapping rules

Mongo seed documents store human-readable fields such as `title`, `status`, `price`, and `project`. The UI and adapter contract use stable property ids such as `prop-title`, `prop-status`, `pp-price`, and `prop-project`.

`_field_map.json` is the conversion table:

```json
{
  "db-tasks": {
    "prop-title": "title",
    "prop-status": "status",
    "prop-project": "project"
  }
}
```

Read path:

1. `documentToPage(databaseId, doc, fieldMap)` receives a Mongo document.
2. The field map is reversed from Mongo field name to property id.
3. Non-meta Mongo fields become `page.properties[propertyId]`.
4. `_id` becomes `page.id`.
5. `created_at`, `updated_at`, `created_by`, and `last_edited_by` become contract metadata fields.

Write path:

1. `pageToDocument(page, fieldMap)` stores `page.properties[propertyId]` into the mapped Mongo field.
2. `changesToSet(changes, fieldMap)` maps property changes into Mongo `$set` fields.
3. Unmapped properties fall back to nested `properties.<propertyId>` fields. This keeps newly added schema properties usable before a custom physical Mongo field is chosen.

## Mongo-only configuration for this phase

Use MongoDB as the single source of truth. Avoid split-brain state by ensuring that page collections and `_meta.notion-state` are written to the same Mongo database.

Preferred local configuration:

```dotenv
MONGO_USER=notion_user
MONGO_PASSWORD=notion_pass
MONGO_HOST=localhost
MONGO_PORT=27017
MONGO_DB=notion_db
CONTRACT_SERVER_HOST=0.0.0.0
CONTRACT_SERVER_PORT=4100
CONTRACT_SERVER_AUTH=disabled
CONTRACT_SERVER_CORS_ORIGIN=*
```

When running the contract server directly from the host, use:

```bash
MONGO_URI='mongodb://notion_user:notion_pass@localhost:27017/notion_db?authSource=admin'
```

When running inside Docker Compose, the contract server already uses:

```bash
mongodb://notion_user:notion_pass@mongodb:27017/notion_db?authSource=admin
```

Important: `make seed-src` currently seeds the source-app live Mongo database through `SRC_MONGO_DB` and defaults that value to `notion_src_db`. The contract server defaults to `MONGO_DB=notion_db`. For Mongo-only bridge testing, either:

1. seed the contract server database (`MONGO_DB=notion_db`) directly, or
2. intentionally set both `MONGO_DB` and `SRC_MONGO_DB` to the same database name before seeding.

Do not seed page collections into `notion_src_db` and metadata into `notion_db`; `loadState()` will then return schemas without matching pages or pages without matching schema metadata.

## Local startup sequence

### Docker Compose path

Use this path when validating the same infrastructure that an external host will consume.

```bash
pnpm install
make up-db
MONGO_DB=notion_db SRC_MONGO_DB=notion_db make seed-src
MONGO_DB=notion_db make seed-contract
MONGO_DB=notion_db make up-contract
make wait-contract
pnpm --filter @notion-db/object-database build
pnpm dev:parent-app
```

If using a different Mongo DB name, still make both names explicit and equal:

```bash
MONGO_DB=my_bridge_db SRC_MONGO_DB=my_bridge_db make seed-src
MONGO_DB=my_bridge_db make seed-contract
MONGO_DB=my_bridge_db make up-contract
```

Then open:

```text
http://localhost:3002
```

### Direct host path

Use this path when debugging `packages/contract-server` without Docker app containers.

```bash
make up-db
MONGO_URI='mongodb://notion_user:notion_pass@localhost:27017/notion_db?authSource=admin' pnpm --filter @notion-db/contract-server seed
CONTRACT_SERVER_PORT=4100 \
CONTRACT_SERVER_AUTH=disabled \
MONGO_URI='mongodb://notion_user:notion_pass@localhost:27017/notion_db?authSource=admin' \
pnpm --filter @notion-db/contract-server dev
```

In a second terminal:

```bash
pnpm --filter @notion-db/object-database build
pnpm --filter parent-app dev
```

## What must be connected next

### Current gap

`ObjectDatabase` already has an `AdapterProvider` and loads initial state from the given adapter. It also subscribes to adapter SSE events.

However, many UI mutations still call Zustand actions that were designed for the legacy DBMS system. Those actions update local state and then call old persistence helpers such as `flushState()`, `dispatchOps()`, and `sendPersistRequest()`.

For Mongo-only bridge mode, those legacy helpers must not be the active persistence path.

### Required bridge behavior

All user-facing database edits should flow through the adapter contract:

| UI action | Store/UI entry points | Adapter method | MongoDB effect |
| --- | --- | --- | --- |
| Load app | `ObjectDatabase` mount, `refresh()` | `loadState()` | reads `_meta.notion-state` and all page collections |
| Search/filter/sort | view rendering and future server paging | `findPages(query)` | reads collection with Mongo filter/sort |
| Open page | modal/page open | `getPage(id)` when fresh data is needed | reads one document by `_id` |
| Edit cell/property | `updatePageProperty()` callers | `patchPage(id, { [propertyId]: value })` | `$set` mapped physical field |
| Create row/page | `addPage()` callers | `insertPage(databaseId, page)` | inserts one document and returns generated id |
| Delete row/page | `deletePage()` callers | `deletePage(id)` | deletes one document |
| Add column/property | `addProperty()` callers | `addProperty(databaseId, property)` | updates `_meta.notion-state.databases` |
| Remove column/property | `deleteProperty()` callers | `removeProperty(databaseId, propertyId)` | unsets property in `_meta.notion-state.databases` |
| Change property type | `updateProperty(... { type })` callers | `changePropertyType(databaseId, propertyId, newType)` | updates property type in metadata |
| Remote updates | `useDevFileChangeSubscription()` | `subscribe(callback)` | receives SSE `ChangeEvent` values |

### Recommended implementation pattern

Keep the UI optimistic and keep the adapter as the only persistence boundary.

1. Add an adapter dependency to the store action layer.
   - Preferred shape: create a small mutable adapter holder when creating the store.
   - The holder lets the React component update the active adapter without recreating the store.
   - Store actions can call `getAdapter()` without importing React context.

2. Replace legacy persistence calls in adapter mode.
   - `updatePageProperty()` should still validate and update Zustand immediately.
   - Then call `adapter.patchPage(pageId, { [propertyId]: coercedValue })`.
   - On success, merge the returned page if needed.
   - On failure, set `dbmsError` and either rollback or reload through `loadState()`.

3. Split local legacy source support from adapter support.
   - Legacy `json`, `csv`, `mongodb`, and `postgresql` source selection can stay for the original `src` app.
   - The package and parent app should use adapter mode only.
   - Mongo-only bridge mode should set the visible source to `mongodb`, not `json`, `csv`, or `postgresql`.

4. Handle async creates explicitly.
   - The adapter contract lets the server generate the page id.
   - Existing `addPage()` returns a string synchronously.
   - For bridge mode, either introduce `addPageAsync()` or make `addPage()` create a temporary local id and reconcile with the returned server id.
   - Prefer `addPageAsync()` for correctness, then update UI call sites gradually.

5. Keep schema operations serial and reload after schema mutation.
   - After `addProperty`, `removeProperty`, or `changePropertyType`, call `loadState()` or rely on `schema-changed` SSE.
   - Reloading is safest because many views depend on property lists, visible property order, filters, sorts, rollups, and relation configs.

6. Do not import server-only code into the browser package.
   - Browser/package may import only `@notion-db/contract-types` and component code.
   - MongoDB client code stays in `packages/contract-server`.

## Suggested store bridge shape

This is a guidance sketch, not a required exact implementation.

```ts
type AdapterGetter = () => ObjectDatabaseAdapter | null;

export function createDatabaseStore(options?: { getAdapter?: AdapterGetter }): DatabaseStoreApi {
  const getAdapter = options?.getAdapter ?? (() => null);

  return createStore<ExtendedDatabaseState>()((set, get) => ({
    ...createDbmsActions(set, get, { getAdapter }),
  }));
}
```

Then the actions can choose the adapter path when an adapter exists:

```ts
const adapter = deps.getAdapter();
if (adapter) {
  void adapter.patchPage(pageId, { [propertyId]: coerced }).catch(handlePersistenceError);
  return;
}

// legacy fallback only for the original src app
get().persistPageProperty(pageId, propertyId, coerced);
```

For package/parent-app mode, `adapter` should always exist.

## Component call sites to audit

Prioritize these entry points because they are common database mutations:

- `src/components/PropertyRow.tsx` calls `updatePageProperty()` for page properties.
- `src/components/pageModal/PageInnerContent.tsx` edits title and deletes pages.
- `src/components/views/table/useTableViewState.ts` edits cells.
- `src/components/views/table/useTableKeyboard.ts` clears cells and creates rows.
- `src/components/views/table/useFillDrag.ts` applies repeated cell updates.
- `src/components/views/table/TableHeader.tsx` adds properties.
- `src/components/views/table/TableRowContextMenu.tsx` deletes pages.
- `src/components/views/board/BoardView.tsx` edits grouped values and creates pages.
- `src/components/views/calendar/CalendarView.tsx` edits date properties and creates pages.
- `src/components/views/timeline/TimelineView.tsx` edits date ranges and creates pages.
- `src/components/views/timeline/useTimelineDrag.ts` may auto-add an end-date property.
- `src/components/views/gallery/GalleryView.tsx`, `feed/FeedView.tsx`, `list/ListView.tsx`, and `map/MapHelpers.tsx` create pages.
- `src/components/PropertyConfigPanel.tsx` renames, changes type, and deletes properties.
- `src/components/RelationEditorPanel.tsx` and `src/components/RollupEditorPanel.tsx` update schema configs.
- `src/components/useFormulaEditorPanel.ts` updates formula schema config.

The first acceptance slice should cover table cell edit, create row, delete row, add property, remove property, and reload persistence.

## MongoDB behavior requirements

### `loadState()`

- Must read `_meta.notion-state`.
- Must read only collections listed in `DB_TO_TABLE`.
- Must apply auth database filtering when auth is enabled.
- Must convert every Mongo document to a contract `Page`.
- Must return `{ databases, pages, views }` only.

### `findPages(query)`

- Must accept no query and return pages across accessible databases.
- Must accept `databaseId` and restrict results to one collection.
- Must translate `DocFilter` property ids to Mongo fields through the field map.
- Must translate sort property ids to Mongo fields through the field map.
- Must apply `limit` correctly.

### `patchPage(id, changes)`

- Must locate the page by `_id` across mapped collections.
- Must deny writes outside the authenticated database scope.
- Must map property ids to physical Mongo fields.
- Must update `updated_at` and `last_edited_by`.
- Must emit `page-changed` SSE with `{ pageId, databaseId, changes }`.
- Must return the updated contract `Page`.

### `insertPage(databaseId, page)`

- Must deny writes outside the authenticated database scope.
- Must generate a UUID id on the server.
- Must default `content`, `createdAt`, `updatedAt`, `createdBy`, and `lastEditedBy` when missing.
- Must map properties to Mongo fields.
- Must emit `page-inserted` SSE.
- Must return the inserted contract `Page`.

### `deletePage(id)`

- Must locate the page by `_id`.
- Must deny writes outside the authenticated database scope.
- Must delete one document.
- Must emit `page-deleted` SSE when a document existed.

### Schema mutation

- `addProperty()` updates `_meta.notion-state.databases.<databaseId>.properties.<propertyId>`.
- `removeProperty()` unsets that metadata property.
- `changePropertyType()` updates `.type` only.
- Every schema mutation emits `schema-changed`.
- For a newly added property that has no field-map entry, values persist under `properties.<propertyId>`.

## Realtime synchronization requirements

`RemoteAdapter.subscribe()` streams `ChangeEvent` values from `/v1/subscribe`.

Client handling rules:

- `page-changed`: merge `event.changes` into the local page properties.
- `page-inserted`: insert `event.page` into the local `pages` record.
- `page-deleted`: remove the page from local `pages`.
- `schema-changed`: reload state from the adapter.
- `state-replaced`: reload state from the adapter.

Server handling rules:

- Send SSE with `Content-Type: text/event-stream`.
- Include event ids for replay.
- Accept `Last-Event-ID` replay.
- Emit `state-replaced` when replay is impossible.
- Apply auth filtering before sending each event.

## Dataset policy

The canonical data domain is the same domain already present under `src/store/dbms/*`:

- Tasks
- CRM contacts
- Content calendar
- Inventory
- Products
- Projects

During Mongo-only bridge work:

- Use `src/store/dbms/mongodb/*.seed.json` for page documents.
- Use `src/store/dbms/mongodb/_notion_state.json` for databases and views.
- Use `src/store/dbms/mongodb/_field_map.json` for physical field mapping.
- Use JSON/CSV/relational files only as references when checking seed parity.
- Do not create a separate demo-only dataset for the parent app.

If any seed file changes, verify all three layers remain coherent:

1. The physical Mongo document field exists.
2. `_field_map.json` maps the contract property id to that field.
3. `_notion_state.json` defines the property id in the matching database schema.

## Validation checklist

Run these checks after bridge changes.

### Package and parent app

```bash
pnpm --filter @notion-db/object-database build
pnpm --filter @notion-db/object-database typecheck
pnpm --filter @notion-db/object-database test:consumer
pnpm --filter parent-app build
```

### Contract server

```bash
make up-db
make seed-contract
make up-contract
make wait-contract
pnpm tsx scripts/smoke-remote-adapter.ts
```

### Manual browser acceptance

1. Start the contract server on `http://localhost:4100`.
2. Start the parent app on `http://localhost:3002`.
3. Open the parent app.
4. Confirm both page and inline `ObjectDatabase` instances load the Mongo dataset.
5. Edit a table cell.
6. Refresh the browser and confirm the edit persisted.
7. Open a second browser tab and confirm an edit in tab A appears in tab B via SSE.
8. Add a row, refresh, and confirm it remains.
9. Delete the row, refresh, and confirm it is gone.
10. Add a property, refresh, and confirm it remains in schema metadata.
11. Remove the property, refresh, and confirm it is gone.
12. Confirm no browser console error references:
    - `dist/lib/engine/bridge?import`
    - `fetch called on an object that does not implement interface Window`
    - missing `pkg/formula_engine.js`

### Mongo persistence inspection

After editing a known task property, inspect MongoDB directly:

```bash
docker exec -it notion_mongodb mongosh \
  'mongodb://notion_user:notion_pass@localhost:27017/notion_db?authSource=admin'
```

Then check:

```js
db.tasks.findOne({ _id: 't1' })
db.getCollection('_meta').findOne({ _id: 'notion-state' })
```

The physical field should be updated according to `_field_map.json`, not written to a random unmapped field.

## Acceptance criteria for the Mongo-only bridge phase

- `ObjectDatabase` package consumers can use only `RemoteAdapter` and the contract server to read and write data.
- The parent app does not depend on the legacy Vite `/api/dbms/*` middleware.
- New edits persist in MongoDB and survive hard refresh.
- Two mounted component instances sharing the same contract server converge through SSE.
- MongoDB seed data remains the same product/tasks/CRM/content/inventory/projects dataset from `src/store/dbms/*`.
- Schema changes persist in `_meta.notion-state`.
- Page property changes persist in mapped Mongo collection fields.
- `pnpm tsx scripts/smoke-remote-adapter.ts` passes.
- `pnpm --filter parent-app build` passes.
- `pnpm --filter @notion-db/object-database build` passes.

## Non-goals for this phase

- Do not add PostgreSQL or CSV as active bridge backends.
- Do not expose MongoDB credentials to the browser.
- Do not make the parent app import seed files directly.
- Do not couple package code to `mongodb` or Fastify.
- Do not make formulas require WASM in the package build until the WASM asset is intentionally shipped.
- Do not introduce a second dataset for the reference app.
- Do not remove legacy source support from the original `src` app unless doing a separate cleanup phase.

## Future extension notes

Once Mongo-only persistence is stable, the same bridge can be generalized by introducing a server-side adapter interface in `packages/contract-server`, for example:

```ts
interface ServerObjectDatabaseAdapter extends ObjectDatabaseAdapter {
  close?(): Promise<void>;
}
```

Then Fastify routes can delegate to `MongoServerAdapter` first, and later to `PostgresServerAdapter`, `TrinoServerAdapter`, or another backend. Keep the browser contract unchanged so external apps continue using `RemoteAdapter`.
