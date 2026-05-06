# Contract server wire format

## Overview

The contract server exposes the document-shaped `ObjectDatabaseAdapter` methods over HTTP. It is a single-tenant development service backed by MongoDB.

Base URL in local development:

```text
http://localhost:4100
```

All contract endpoints live under `/v1`.

## Auth

No authentication exists in this version. Run the service only on a trusted development network.

## Versioning

Breaking wire-format changes bump the path prefix. This version uses `/v1`.

## Error format

Errors are JSON:

```json
{ "error": "Page p1 not found", "code": "OPTIONAL_CODE" }
```

Validation errors use Fastify's standard 4xx status. Unexpected errors return 500.

## Shared schemas

### NotionState

```json
{
  "databases": { "db-tasks": { "id": "db-tasks", "name": "Tasks", "properties": {}, "titlePropertyId": "prop-title" } },
  "pages": { "page-id": { "id": "page-id", "databaseId": "db-tasks", "properties": {}, "content": [], "createdAt": "2026-05-06T00:00:00.000Z", "updatedAt": "2026-05-06T00:00:00.000Z", "createdBy": "System", "lastEditedBy": "System" } },
  "views": { "view-id": { "id": "view-id", "databaseId": "db-tasks", "name": "Table", "type": "table", "filters": [], "filterConjunction": "and", "sorts": [], "visibleProperties": [], "settings": {} } }
}
```

### PageQuery

```json
{
  "databaseId": "db-tasks",
  "filter": {
    "prop-status": { "eq": "Done" }
  },
  "sort": [{ "propertyId": "prop-title", "direction": "asc" }],
  "limit": 25
}
```

### SchemaProperty

```json
{
  "id": "prop-status",
  "name": "Status",
  "type": "status",
  "options": [{ "id": "opt-done", "value": "Done", "color": "green" }]
}
```

## Endpoints

### Health

`GET /health`

Response:

```json
{ "status": "ok", "mongo": "up", "timestamp": "2026-05-06T00:00:00.000Z" }
```

Example:

```bash
curl http://localhost:4100/health
```

### loadState

`POST /v1/loadState`

Request:

```json
{}
```

Response: `NotionState`.

Example:

```bash
curl -X POST http://localhost:4100/v1/loadState \
  -H 'Content-Type: application/json' \
  -d '{}'
```

### findPages

`POST /v1/findPages`

Request: `PageQuery`.

Response:

```json
[
  { "id": "task-1", "databaseId": "db-tasks", "properties": {}, "content": [], "createdAt": "...", "updatedAt": "...", "createdBy": "System", "lastEditedBy": "System" }
]
```

Example:

```bash
curl -X POST http://localhost:4100/v1/findPages \
  -H 'Content-Type: application/json' \
  -d '{"databaseId":"db-tasks","limit":5}'
```

### getPage

`POST /v1/getPage`

Request:

```json
{ "id": "task-1" }
```

Response: `Page | null`.

Example:

```bash
curl -X POST http://localhost:4100/v1/getPage \
  -H 'Content-Type: application/json' \
  -d '{"id":"task-1"}'
```

### insertPage

`POST /v1/insertPage`

Request:

```json
{
  "databaseId": "db-tasks",
  "page": {
    "databaseId": "db-tasks",
    "properties": { "prop-title": "New task" },
    "content": [],
    "createdAt": "2026-05-06T00:00:00.000Z",
    "updatedAt": "2026-05-06T00:00:00.000Z",
    "createdBy": "Contract Server",
    "lastEditedBy": "Contract Server"
  }
}
```

Response: `Page` with generated `id`.

Example:

```bash
curl -X POST http://localhost:4100/v1/insertPage \
  -H 'Content-Type: application/json' \
  -d '{"databaseId":"db-tasks","page":{"databaseId":"db-tasks","properties":{"prop-title":"New task"},"content":[],"createdAt":"2026-05-06T00:00:00.000Z","updatedAt":"2026-05-06T00:00:00.000Z","createdBy":"Contract Server","lastEditedBy":"Contract Server"}}'
```

### patchPage

`POST /v1/patchPage`

Request:

```json
{ "id": "task-1", "changes": { "prop-status": "Done" } }
```

Response: updated `Page`.

Example:

```bash
curl -X POST http://localhost:4100/v1/patchPage \
  -H 'Content-Type: application/json' \
  -d '{"id":"task-1","changes":{"prop-status":"Done"}}'
```

### deletePage

`POST /v1/deletePage`

Request:

```json
{ "id": "task-1" }
```

Response:

```json
{ "ok": true }
```

Example:

```bash
curl -X POST http://localhost:4100/v1/deletePage \
  -H 'Content-Type: application/json' \
  -d '{"id":"task-1"}'
```

### addProperty

`POST /v1/addProperty`

Schema mutations update the `_meta` collection only. MongoDB documents are schemaless, so existing page values are not rewritten.

Request:

```json
{ "databaseId": "db-tasks", "property": { "id": "prop-new", "name": "New", "type": "text" } }
```

Response:

```json
{ "ok": true }
```

Example:

```bash
curl -X POST http://localhost:4100/v1/addProperty \
  -H 'Content-Type: application/json' \
  -d '{"databaseId":"db-tasks","property":{"id":"prop-new","name":"New","type":"text"}}'
```

### removeProperty

`POST /v1/removeProperty`

Request:

```json
{ "databaseId": "db-tasks", "propertyId": "prop-new" }
```

Response:

```json
{ "ok": true }
```

Example:

```bash
curl -X POST http://localhost:4100/v1/removeProperty \
  -H 'Content-Type: application/json' \
  -d '{"databaseId":"db-tasks","propertyId":"prop-new"}'
```

### changePropertyType

`POST /v1/changePropertyType`

Request:

```json
{ "databaseId": "db-tasks", "propertyId": "prop-new", "newType": "number" }
```

Response:

```json
{ "ok": true }
```

Example:

```bash
curl -X POST http://localhost:4100/v1/changePropertyType \
  -H 'Content-Type: application/json' \
  -d '{"databaseId":"db-tasks","propertyId":"prop-new","newType":"number"}'
```

## Subscribe

`GET /v1/subscribe`

Content-Type: `text/event-stream`

Streams `ChangeEvent` JSON objects, one per SSE message. The client receives all events from the entire service — no per-database filtering in this version.

Example:

```bash
curl -N http://localhost:4100/v1/subscribe
```

Event payloads:

```json
{ "type": "page-changed", "pageId": "task-1", "changes": { "prop-status": "Done" } }
```

Reconnection: the browser's `EventSource` auto-reconnects on network errors. Events that occurred during the disconnect are NOT replayed. Clients should call `loadState()` on reconnect to resync. `RemoteAdapter` handles this automatically by emitting a synthetic `state-replaced` event after detecting reconnect.

Keep-alive: the server sends a `: ping\n\n` comment every 15 seconds to prevent proxy timeouts.

Backpressure: the server uses an unbounded `EventEmitter`. A slow client cannot block other clients because each has its own response stream, but a slow client can accumulate buffered events in the TCP send buffer until the OS rejects writes. Future versions will add per-client backpressure handling.

## DocFilter operators

| Operator | Mongo equivalent | Meaning |
| --- | --- | --- |
| `eq` | equality | Value equals input. |
| `neq` | `$ne` | Value does not equal input. |
| `in` | `$in` | Value is in the array. |
| `nin` | `$nin` | Value is not in the array. |
| `contains` | `$regex` | String contains input, case-insensitive. |
| `gt` | `$gt` | Greater than input. |
| `gte` | `$gte` | Greater than or equal to input. |
| `lt` | `$lt` | Less than input. |
| `lte` | `$lte` | Less than or equal to input. |
| `exists` | `$exists` | Field exists or does not exist. |

DocFilter keys are property ids. The service maps them to Mongo fields using `_meta.fieldMaps`; unmapped properties use `properties.{propertyId}`.
