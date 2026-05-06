# @notion-db/object-database

Built ESM package for the embeddable `ObjectDatabase` React component.

## Install

```bash
pnpm add @notion-db/object-database react react-dom zustand lucide-react date-fns clsx tailwind-merge
```

Install the additional peer packages used by optional views/editors if your app enables them:

```bash
pnpm add @radix-ui/react-dropdown-menu @radix-ui/react-popover @radix-ui/react-slot \
  recharts tailwindcss motion katex leaflet mermaid
```

## Usage

```tsx
import { ObjectDatabase, InMemoryAdapter } from '@notion-db/object-database';
import '@notion-db/object-database/styles.css';

export function DatabaseEmbed() {
  return <ObjectDatabase mode="inline" adapter={new InMemoryAdapter()} />;
}
```

## Peer dependencies

The package externalizes React, ReactDOM, Zustand, Lucide, Radix primitives, charting, animation, math/map/diagram renderers, Tailwind, and utility packages. Consumers must install these peers so they are not duplicated in the bundle.

## CSS

Import `@notion-db/object-database/styles.css` once at app startup. It provides the full ObjectDatabase stylesheet: Tailwind v4 setup, theme tokens, and the package source scan needed to generate utilities such as `bg-surface-primary`, `text-ink-muted`, and `border-line`.

`@notion-db/object-database/theme.css` remains available as a backwards-compatible alias to the full stylesheet. `@notion-db/object-database/tokens.css` contains only the CSS custom properties and is not enough by itself to render the component correctly.

The component uses Tailwind utility classes. Consumers must include Tailwind in their application build and ensure generated CSS covers the component classes.

If you enable the map view, also import Leaflet's stylesheet in your app:

```tsx
import 'leaflet/dist/leaflet.css';
```

## Formula engine limitation

The Rust/WASM formula engine is optional in this package. The initial package does not ship the WASM binary; formula evaluation gracefully degrades and renders `#ENGINE_UNAVAILABLE` until a future package release bundles or configures the engine asset.

## Adapters

The package exports:

- `ObjectDatabase`
- `InMemoryAdapter`
- `RemoteAdapter`
- `HttpAdapter`
- shared adapter and document contract types

`RemoteAdapter` targets a contract-compatible `/v1/*` service and supports bearer-token authentication.
