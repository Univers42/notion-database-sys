# Contract server

Minimal HTTP service exposing the `ObjectDatabaseAdapter` document contract over MongoDB.

## Run locally

```bash
pnpm --filter @notion-db/contract-server install
pnpm --filter @notion-db/contract-server seed
pnpm --filter @notion-db/contract-server dev
```

Default URL: `http://localhost:4100`.

## Environment

```dotenv
CONTRACT_SERVER_HOST=0.0.0.0
CONTRACT_SERVER_PORT=4100
CONTRACT_SERVER_AUTH=disabled
CONTRACT_SERVER_JWT_SECRET=dev-contract-secret
MONGO_USER=notion_user
MONGO_PASSWORD=notion_pass
MONGO_HOST=localhost
MONGO_PORT=27017
MONGO_DB=notion_db
```

`MONGO_URI` can override the individual Mongo variables.

## Authentication

Local development defaults to `CONTRACT_SERVER_AUTH=disabled`, so `/v1/*` behaves like the reference implementation.

Set `CONTRACT_SERVER_AUTH=required` and `CONTRACT_SERVER_JWT_SECRET=<shared-secret>` to require `Authorization: Bearer <token>` on every `/v1/*` request. The reference implementation verifies HS256 JWTs with claims:

```json
{ "sub": "user-id", "iat": 1778080000, "exp": 1778083600, "scope": { "databases": ["db-tasks"] } }
```

Use `scope.databases: ["*"]` for unrestricted access. Scoped tokens only see allowed databases; `findPages` for a denied database returns an empty array.

Browser `EventSource` cannot send custom headers, so `RemoteAdapter` passes the token to `/v1/subscribe?token=<jwt>`. URLs can appear in proxy/server logs; prefer an EventSource implementation with header support where available.

## Seeding

The service expects `_meta.notion-state` in MongoDB. Seed it from the current DBMS metadata:

```bash
pnpm --filter @notion-db/contract-server seed
```

This writes database schemas, views, and field maps. It does not import page seed files; use the existing Mongo seed flow for collection documents.

## Subscribe

The service exposes realtime changes over server-sent events:

```bash
curl -N http://localhost:4100/v1/subscribe
```

The connection stays open until the client closes it. Trigger a page or schema mutation from another terminal to see `ChangeEvent` JSON messages stream through the SSE connection.

## Verify

```bash
curl http://localhost:4100/health
curl -X POST http://localhost:4100/v1/loadState -H 'Content-Type: application/json' -d '{}'
curl -X POST http://localhost:4100/v1/findPages -H 'Content-Type: application/json' -d '{"databaseId":"db-tasks","limit":5}'
```

When `CONTRACT_SERVER_AUTH=required`, add `-H 'Authorization: Bearer <token>'` to each `/v1/*` request.

See [CONTRACT.md](CONTRACT.md) for the wire format.
