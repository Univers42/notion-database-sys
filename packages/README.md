# packages/ — Backend Packages

Three internal packages that power the API server and shared logic. Managed as pnpm workspace packages and built with Turborepo.

## Packages

### @notion-db/types

Shared TypeScript type definitions. No runtime code — just interfaces and type exports.

Defines: `User`, `Workspace`, `Page`, `Block`, `View`, `Property`, `Filter`, `Permission`, `Session`, `Member`, `Schema`, and more.

### @notion-db/core

Shared MongoDB models and business logic. Depends on `@notion-db/types`.

Contains:
- **Mongoose models** (`models/`): User, Workspace, Page, Block, View, Member, Session, AccessRule, EffectivePermission, UserViewOverride
- **Services** (`services/`): auth, workspace, page, block, view — the actual CRUD + business logic
- **ABAC permission engine** (`abac/`): attribute-based access control with a policy resolver

### @notion-db/api

Fastify REST API server. Depends on `@notion-db/core` and `@notion-db/types`.

Contains:
- **Routes**: auth, workspaces, pages, blocks, views, WebSocket
- **Auth hook**: JWT verification middleware
- **WebSocket**: real-time sync via MongoDB Change Streams

Endpoints:
- `POST /api/auth/signup`, `POST /api/auth/login`
- `GET/POST /api/workspaces`
- `GET/POST/PATCH/DELETE /api/pages`
- `GET/POST/PATCH/DELETE /api/blocks`
- `GET/POST/PATCH/DELETE /api/views`
- `WS /ws` — real-time updates
- `GET /health` — health check

## Dependency graph

```
@notion-db/types       (no deps)
       ↓
@notion-db/core        (depends on types + mongoose + bcrypt)
       ↓
@notion-db/api         (depends on core + types + fastify)
```

Turborepo handles the build order automatically.

## Building

```bash
# Build all packages (respects dependency order)
pnpm run build

# Or build individually
pnpm run build:types
pnpm run build:core
pnpm run build:api

# Watch mode for development
cd packages/types && pnpm dev    # tsc --build --watch
cd packages/core && pnpm dev     # tsc --build --watch
cd packages/api && pnpm dev      # tsx watch src/index.ts
```

## Running the API

```bash
# Dev mode (auto-reload)
pnpm dev:api

# Or directly
cd packages/api && pnpm dev
```

The API starts on port 4000 by default. It needs MongoDB running (`make up` from root).
