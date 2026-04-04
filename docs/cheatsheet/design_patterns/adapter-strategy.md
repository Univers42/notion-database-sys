# Adapter / Strategy Pattern — The Two-Layer DBMS

## Why Two Layers?

The project supports 4 database backends: JSON files, CSV files, MongoDB, PostgreSQL. There are two separate adapter layers for different purposes:

| Layer | Where | Purpose | Used by |
|---|---|---|---|
| **Ops adapters** | `src/server/ops/` | Fire-and-forget mutations from the UI | Main app (via Vite middleware) |
| **Service adapters** | `services/dbms/` | Full CRUD with connection lifecycle | Playground API, smoke tests |

This wasn't over-engineering — it was necessity. The main app and the playground have fundamentally different data flows.

## Layer 1: Ops Adapters (Mutation Dispatch)

The main app (`src/`) updates the Zustand store first, then dispatches a side-effect write to the database. The UI never waits for the database response — it's optimistic.

```ts
// src/server/ops/types.ts
interface DbmsAdapter {
  insertRecord(table: string, record: Record<string, unknown>): QueryResult;
  deleteRecord(table: string, id: string): QueryResult;
  updateField(table: string, id: string, field: string, value: unknown): QueryResult;
  addColumn(table: string, name: string, propType?: string): QueryResult;
  removeColumn(table: string, name: string): QueryResult;
  changeColumnType(table: string, name: string, oldType: string, newType: string): QueryResult;
}

// Return type — includes the generated query for logging
interface QueryResult {
  success: boolean;
  query: string;    // "UPDATE pages SET name = 'Hello' WHERE id = 'abc'"
  error?: string;
}
```

### The Dispatcher

```ts
// src/server/ops/index.ts
const adapters: Record<DbSourceType, DbmsAdapter> = {
  json:       new JsonOps(),
  csv:        new CsvOps(),
  postgresql: new PostgresOps(),
  mongodb:    new MongoOps(),
};

export function getAdapter(source: string): DbmsAdapter {
  return adapters[source];
}
```

A static registry keyed by source type. `getAdapter('postgresql')` returns the PostgreSQL ops adapter. No class hierarchy, no dependency injection framework — just a plain object lookup.

### Why Ops Return the Query String

```ts
// PostgresOps
updateField(table, id, field, value): QueryResult {
  const query = `UPDATE ${table} SET ${field} = $1 WHERE id = $2`;
  pool.query(query, [value, id]);
  return { success: true, query };
}
```

The `query` field is logged to the query log panel in the UI. Users can see every SQL/MongoDB command the app generates. This is educational — the app is a Notion clone, and seeing the generated queries helps you understand how Notion's backend might work.

## Layer 2: Service Adapters (Full CRUD)

The playground app uses the Fastify API, which needs full data access — not just mutations but reads, schema inspection, connection management.

```ts
// services/dbms/types.ts
interface DbAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  ping(): Promise<boolean>;
  listEntities(): Promise<string[]>;
  getRecords(entity: string): Promise<DbRecord[]>;
  getSchema(entity: string): Promise<DbEntitySchema>;
  insertRecord(entity: string, record: Partial<DbRecord>): Promise<DbRecord>;
  updateRecord(entity: string, id: string, field: string, value: unknown): Promise<DbRecord>;
  deleteRecord(entity: string, id: string): Promise<void>;
}
```

### The Factory

```ts
// services/dbms/DbAdapterFactory.ts
const ADAPTER_CONSTRUCTORS: Record<string, new (config: DbConnectionConfig) => DbAdapter> = {
  json:       JsonDbAdapter,
  csv:        CsvDbAdapter,
  postgresql: PostgresDbAdapter,
  mongodb:    MongoDbAdapter,
};

export function createAdapter(type: string, config: DbConnectionConfig): DbAdapter {
  const Ctor = ADAPTER_CONSTRUCTORS[type];
  if (!Ctor) throw new Error(`Unknown adapter type: ${type}`);
  return new Ctor(config);
}

export async function createActiveAdapter(): Promise<DbAdapter> {
  const type = process.env.ACTIVE_DB_SOURCE ?? 'json';
  const config = configFromEnv(type);
  const adapter = createAdapter(type, config);
  await adapter.connect();
  return adapter;
}
```

`createActiveAdapter()` is the entry point — reads env, builds config, instantiates, connects. One function call, zero knowledge of which adapter you're getting.

## Type Mapping Constants

Each adapter needs to translate between Notion property types and database-native types:

```ts
// ops/types.ts
export const PROP_TO_SQL: Record<string, string> = {
  title:        'TEXT',
  text:         'TEXT',
  number:       'DOUBLE PRECISION',
  checkbox:     'BOOLEAN',
  date:         'TIMESTAMPTZ',
  select:       'TEXT',
  multi_select: 'TEXT[]',
  url:          'TEXT',
  email:        'TEXT',
  phone:        'TEXT',
  // ...
};

export const PROP_TO_BSON: Record<string, string> = {
  number:       'double',
  checkbox:     'bool',
  date:         'date',
  multi_select: 'array',
  // ...
};
```

These live in one file so you can see all the mappings at a glance. Adding a new property type means adding one entry to each map.

## Adding a New Backend

Say you want to add SQLite:

1. **Ops adapter:** Create `src/server/ops/sqliteOps.ts` implementing `DbmsAdapter`
2. **Service adapter:** Create `services/dbms/SqliteDbAdapter.ts` implementing `DbAdapter`
3. **Register ops:** Add `sqlite: new SqliteOps()` to the dispatcher in `ops/index.ts`
4. **Register service:** Add `sqlite: SqliteDbAdapter` to `ADAPTER_CONSTRUCTORS` in `DbAdapterFactory.ts`
5. **Add type mapping:** Add `PROP_TO_SQLITE` in `ops/types.ts`
6. **Update `DbSourceType`:** Add `'sqlite'` to the union type

No existing code changes. Each new adapter is additive.

## Tradeoffs

**Why two layers instead of one?**

The ops layer is synchronous and fire-and-forget — it doesn't wait for the database. This works for the main app where the store is the source of truth and the database is just persistence.

The service layer is async and returns data — it needs to because the API server doesn't have a local store. The database IS the source of truth.

Merging them would mean either:
- Making the main app wait for async database calls (slower UI)
- Making the API not wait for results (data loss)

Neither is acceptable. Two layers, two interfaces, same four adapters.

## References

- [Refactoring Guru — Adapter Pattern](https://refactoring.guru/design-patterns/adapter) — How the adapter pattern decouples interface expectations from implementations (JSON, CSV, MongoDB, PostgreSQL).
- [Refactoring Guru — Strategy Pattern](https://refactoring.guru/design-patterns/strategy) — Selecting the concrete adapter at runtime based on the `ACTIVE_DB_SOURCE` environment variable.
- [TypeScript Handbook — Interfaces](https://www.typescriptlang.org/docs/handbook/2/objects.html) — How TypeScript interfaces enforce that all four adapters implement the same contract.
