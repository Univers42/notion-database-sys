# Contract server wire format

## Overview

The contract server exposes the document-shaped `ObjectDatabaseAdapter` methods over HTTP. It is a single-tenant development service backed by MongoDB.

Base URL in local development:

```text
http://localhost:4100
```

All contract endpoints live under `/v1`.

## Auth

All `/v1/*` contract endpoints require a token when the service runs with `CONTRACT_SERVER_AUTH=required`:

```http
Authorization: Bearer <token>
```

The reference contract-server verifies HS256 JWTs with `CONTRACT_SERVER_JWT_SECRET`. Production deployments may replace that validation with RS256 or another verifier as long as the wire format stays `Authorization: Bearer <token>`.

Minimum token claims:

```json
{
  "sub": "subject-id",
  "iat": 1778080000,
  "exp": 1778083600,
  "scope": { "databases": ["db-tasks"] }
}
```

Use `scope.databases: ["*"]` for unrestricted access. Scoped tokens only see allowed databases. `findPages` for a denied database returns an empty array rather than leaking database existence.

When `CONTRACT_SERVER_AUTH=disabled`, auth is bypassed for local development only.

Browser `EventSource` cannot send `Authorization` headers. `/v1/subscribe` therefore also accepts `?token=<jwt>` as an SSE-only workaround. Tokens in URLs can leak to browser history, proxies, and logs; prefer an EventSource implementation with header support when possible.

## Versioning

Breaking wire-format changes bump the path prefix. This version uses `/v1`.

## Error format

Errors are JSON:

```json
{ "error": "Page p1 not found", "code": "OPTIONAL_CODE" }
```

Auth failures return 401:

```json
{ "error": "Token expired", "code": "AUTH_EXPIRED" }
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
  -H 'Authorization: Bearer <token>' \
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
  -H 'Authorization: Bearer <token>' \
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
  -H 'Authorization: Bearer <token>' \
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
  -H 'Authorization: Bearer <token>' \
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
  -H 'Authorization: Bearer <token>' \
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
  -H 'Authorization: Bearer <token>' \
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
  -H 'Authorization: Bearer <token>' \
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
  -H 'Authorization: Bearer <token>' \
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
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{"databaseId":"db-tasks","propertyId":"prop-new","newType":"number"}'
```

## Subscribe

`GET /v1/subscribe`

Content-Type: `text/event-stream`

Streams `ChangeEvent` JSON objects, one per SSE message. The server filters events through the token's `scope.databases`. `state-replaced` events have no database id and are delivered to every authenticated subscriber.

Example:

```bash
curl -N -H 'Authorization: Bearer <token>' http://localhost:4100/v1/subscribe
```

Event payloads:

```json
{ "type": "page-changed", "pageId": "task-1", "databaseId": "db-tasks", "changes": { "prop-status": "Done" } }
```

Reconnection: each SSE message includes an `id: ${processStartMs}-${counter}` field. Browsers send `Last-Event-ID` on reconnect; the server replays buffered events newer than that id. If the cursor is too old or from a prior process start, the server sends `state-replaced`.

Keep-alive: the server sends a `: ping\n\n` comment every 15 seconds to prevent proxy timeouts.

Backpressure: if a client's response stream stays backed up for 5 seconds, the server closes that connection. The client reconnects and catches up via replay or receives `state-replaced` if the gap is too large.

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
