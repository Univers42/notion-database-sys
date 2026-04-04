# Monorepo Architecture

## Why a Monorepo?

The project has three things that need to share code:
1. **Main frontend** (`src/`) — full Notion clone
2. **Playground** (`playground/`) — multi-user test app
3. **API server** (`packages/api/`) — Fastify REST API

They share TypeScript types, utility functions, and UI components. Without a monorepo, you'd have three repos duplicating types and going out of sync.

## The Stack

| Tool | Role |
|---|---|
| pnpm | Package manager (workspaces) |
| Turborepo | Build orchestration (dependency-aware) |
| TypeScript project references | Cross-package type checking |

## pnpm Workspaces

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
```

This tells pnpm that `packages/types`, `packages/core`, and `packages/api` are internal packages. They can depend on each other using `workspace:*`:

```json
// packages/api/package.json
{
  "dependencies": {
    "@notion-db/core": "workspace:*",
    "@notion-db/types": "workspace:*"
  }
}
```

`workspace:*` means "use the version from the monorepo, don't download from npm." pnpm creates symlinks so imports just work.

## Package Dependency Graph

```
@notion-db/types       (no dependencies)
       ↓
@notion-db/core        (depends on types + mongoose + bcrypt)
       ↓
@notion-db/api         (depends on core + types + fastify)
```

`types` is the leaf — it has zero runtime dependencies. Just TypeScript interfaces and type exports. `core` adds Mongoose models and business logic. `api` adds HTTP routes and WebSocket handlers.

## Turborepo Build Pipeline

```json
// turbo.json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "persistent": true,
      "cache": false
    },
    "typecheck": {},
    "lint": {}
  }
}
```

### `"dependsOn": ["^build"]`

The `^` means "build my dependencies first." When you run `pnpm run build`:

1. Turborepo sees `api` depends on `core` which depends on `types`
2. It builds `types` first
3. Then `core` (which can now import types from `types/dist/`)
4. Then `api` (which can now import from both)

Without Turborepo, you'd need to manually build in the right order. Or use `tsc --build` with project references (which we also do — belt and suspenders).

### `"persistent": true`

The `dev` task is long-running (Vite dev server, `tsc --watch`). `persistent: true` tells Turborepo not to wait for it to exit before moving on.

### `"outputs": ["dist/**"]`

Turborepo caches build outputs. If `types/src/` hasn't changed since the last build, Turborepo skips the build and restores `types/dist/` from cache. This makes incremental builds nearly instant.

## TypeScript Project References

```json
// tsconfig.base.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "composite": true,
    "declaration": true,
    "declarationMap": true
  }
}
```

### `composite: true`

Enables incremental compilation and project references. Each package's `tsconfig.json` references its dependencies:

```json
// packages/core/tsconfig.json
{
  "references": [
    { "path": "../types" }
  ]
}
```

This lets `tsc --build` compile packages in dependency order, reusing compiled output from previous builds.

### `declarationMap: true`

Generates `.d.ts.map` files alongside `.d.ts` type declarations. This enables **go-to-definition** across packages in your editor — clicking on a type from `@notion-db/types` jumps to the source `.ts` file, not the compiled `.d.ts`.

### `moduleResolution: "Bundler"`

Matches Vite/esbuild's resolution semantics. Without this, TypeScript and Vite might disagree on how to resolve imports, causing "module not found" errors that only appear in one tool.

## Common Operations

```bash
# Build all packages (respects dependency order)
pnpm run build

# Build one package
pnpm run build:types
pnpm run build:core
pnpm run build:api

# Type check everything
pnpm typecheck

# Add a dependency to a specific package
pnpm add mongoose --filter=@notion-db/core

# Run dev mode for the API
pnpm dev:api     # equivalent to: cd packages/api && pnpm dev
```

## When to Create a New Package

Create a new package when:
- The code is used by 2+ packages that don't depend on each other
- The code has its own build step or dependencies
- You want to enforce an API boundary (only the exports are public)

Don't create a package for:
- Shared utilities between `src/` components (put them in `src/utils/`)
- Configuration files (keep them at root)
- Single-use helpers

## Tradeoffs

**Pro:**
- Shared types are always in sync
- One `git clone`, one `pnpm install`, everything works
- Turborepo caching makes builds fast
- IDE support (go-to-definition across packages) is excellent

**Con:**
- pnpm workspace setup has a learning curve
- Turborepo adds another config file (`turbo.json`)
- All packages share the same Node.js version (not usually a problem)
- A breaking change in `types` affects both `core` and `api` — you need to update both

## References

- [pnpm — Workspaces](https://pnpm.io/workspaces) — Official docs on pnpm’s workspace protocol, symlink strategy, and `pnpm-workspace.yaml` configuration.
- [Turborepo — Documentation](https://turborepo.dev/docs) — Task scheduling, remote caching, and `turbo.json` pipeline configuration.
- [TypeScript — Project References](https://www.typescriptlang.org/docs/handbook/project-references.html) — How `composite: true` and `references` in `tsconfig.json` enable incremental cross-package builds.
- [Turbo — `dependsOn` Configuration](https://turborepo.dev/docs/reference/configuration#dependson) — Declaring `^build` dependencies so packages build in the correct topological order.
