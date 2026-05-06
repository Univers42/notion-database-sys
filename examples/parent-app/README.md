# Parent app reference integration

This app proves that `@notion-db/object-database` can be consumed by an external React project. It intentionally lives under `examples/parent-app/` so it can later be copied into a separate repository.

## What it demonstrates

- A Vite + React 19 host app.
- `@notion-db/object-database` consumed through the workspace package export.
- Required peer dependencies installed in the host app.
- `@notion-db/object-database/theme.css` imported once at app startup.
- One `<ObjectDatabase mode="page" />` instance.
- One `<ObjectDatabase mode="inline" />` instance embedded among parent-app prose.
- Both instances share one `RemoteAdapter`, so mutations propagate through contract-server SSE.
- A parent theme toggle that switches `data-theme` and passes the theme into both component instances.

## Install

From the repository root:

```bash
pnpm install
```

The package dependency is local while this example is inside the monorepo:

```json
"@notion-db/object-database": "workspace:*"
```

When copying this app into a separate repository after publishing, replace that line with a normal npm dependency, for example:

```bash
pnpm add @notion-db/object-database
```

## Start the contract server

The parent app expects a contract-compatible server at `http://localhost:4100` by default.

In one terminal from the repository root:

```bash
make up-db
pnpm --filter @notion-db/contract-server seed
CONTRACT_SERVER_AUTH=disabled pnpm --filter @notion-db/contract-server dev
```

If you use a custom URL or enabled auth, create `examples/parent-app/.env.local`:

```dotenv
VITE_CONTRACT_SERVER_URL=http://localhost:4100
VITE_CONTRACT_SERVER_TOKEN=<jwt-if-CONTRACT_SERVER_AUTH-required>
```

## Start the parent app

In another terminal from the repository root:

```bash
pnpm --filter parent-app dev
```

The dev server runs on:

```text
http://localhost:3002
```

The root shortcut does the same thing:

```bash
pnpm dev:parent-app
```

Both commands build `@notion-db/object-database` first so the app imports the package through its `dist/` export.

## Verify it works

1. Open `http://localhost:3002`.
2. Confirm the full-page database is visible in the large left panel.
3. Confirm the inline database is visible inside the prose card on the right.
4. Edit a record in one instance.
5. Confirm the other instance updates after the contract server emits the SSE event.
6. Toggle Light/Dark and confirm both component instances switch theme.
7. Open the browser console and confirm there are no missing peer dependency, CSS, or SSE errors.

## Common gotchas

### The app is unstyled

Make sure `src/main.tsx` imports the package CSS:

```ts
import '@notion-db/object-database/theme.css';
```

The host app also runs Tailwind and scans the built package chunks from `src/styles.css`:

```css
@source "../../../packages/object-database/dist/**/*.js";
```

### Vite cannot resolve the package


Build the package before running a copied app:

```bash
pnpm --filter @notion-db/object-database build
```

Inside this monorepo, `predev` and `prebuild` already do that.

### A peer dependency is missing

Install the peer in the parent project. This example lists the package peers directly in `package.json` so the host owns React, Zustand, Radix, Lucide, charting, map, math, diagram, Tailwind, and utility packages.

### The database never loads

Check that the contract server is running and that `VITE_CONTRACT_SERVER_URL` points to it. If auth is enabled, set `VITE_CONTRACT_SERVER_TOKEN` to a token scoped to the target database.

### SSE updates do not propagate

Check the browser network panel for `/v1/subscribe`. It should stay open as `text/event-stream`. Proxies, invalid auth tokens, or a stale contract-server URL usually cause this issue.
