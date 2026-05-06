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
MONGO_USER=notion_user
MONGO_PASSWORD=notion_pass
MONGO_HOST=localhost
MONGO_PORT=27017
MONGO_DB=notion_db
```

`MONGO_URI` can override the individual Mongo variables.

## Seeding

The service expects `_meta.notion-state` in MongoDB. Seed it from the current DBMS metadata:

```bash
pnpm --filter @notion-db/contract-server seed
```

This writes database schemas, views, and field maps. It does not import page seed files; use the existing Mongo seed flow for collection documents.

## Verify

```bash
curl http://localhost:4100/health
curl -X POST http://localhost:4100/v1/loadState -H 'Content-Type: application/json' -d '{}'
curl -X POST http://localhost:4100/v1/findPages -H 'Content-Type: application/json' -d '{"databaseId":"db-tasks","limit":5}'
```

See [CONTRACT.md](CONTRACT.md) for the wire format.
