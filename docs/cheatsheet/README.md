# Tricks & Patterns Cheatsheet

Everything you need to know about how this codebase works, why things are built the way they are, and what to keep in mind when contributing.

This is split into three sections. Read the one relevant to what you're working on, or read all of them if you're onboarding.

## Sections

### [Tricks](tricks/)

Concrete coding techniques used throughout the project. These are the "how do I…" recipes — copy-paste-ready patterns with explanations.

| File | What it covers |
|---|---|
| [slot-classes.md](tricks/slot-classes.md) | CSS class composition with `cn()` and `mergeSlots()` — why we don't hardcode Tailwind classes |
| [z-index-system.md](tricks/z-index-system.md) | The `Z` constant, panel positioning, viewport clamping |
| [portal-backdrop.md](tricks/portal-backdrop.md) | How floating panels, cell editors, and modals handle outside clicks |
| [debounce-per-key.md](tricks/debounce-per-key.md) | Per-cell debounced persistence to the database layer |
| [undo-redo.md](tricks/undo-redo.md) | Snapshot-based undo/redo with debounced subscriptions |
| [contenteditable.md](tricks/contenteditable.md) | Cursor stability, markdown shortcuts, inline toolbars |
| [formula-cache.md](tricks/formula-cache.md) | LRU eviction, composite cache keys, WASM handle caching |
| [atomic-writes.md](tricks/atomic-writes.md) | Temp+rename for crash-safe file writes, self-write detection |
| [schema-inference.md](tricks/schema-inference.md) | Auto-detecting field types from raw data in schema-less sources |
| [svg-math.md](tricks/svg-math.md) | Hand-rolled SVG arcs, donut slices, Catmull-Rom splines |
| [computed-cache.md](tricks/computed-cache.md) | Manual memoization in Zustand to avoid expensive recomputation |
| [vite-plugins.md](tricks/vite-plugins.md) | Custom Vite middleware, CSP patching, dev server as API |

### [Design Patterns](design_patterns/)

Architectural patterns that shape the overall codebase. These are the "why is it structured this way" explanations.

| File | What it covers |
|---|---|
| [slice-composition.md](design_patterns/slice-composition.md) | How the Zustand store is split into slices and reassembled |
| [adapter-strategy.md](design_patterns/adapter-strategy.md) | The two-layer DBMS adapter system (ops + services) |
| [context-scoping.md](design_patterns/context-scoping.md) | React Context for multi-instance database views |
| [view-registry.md](design_patterns/view-registry.md) | Component registry map instead of switch statements |
| [discriminated-unions.md](design_patterns/discriminated-unions.md) | Type safety through tagged unions — PropertyType, BlockType, ActionItem |
| [result-pattern.md](design_patterns/result-pattern.md) | `{ ok, value }` / `{ ok, reason }` instead of exceptions |
| [abac-permissions.md](design_patterns/abac-permissions.md) | Cascading attribute-based access control (workspace → page → block) |
| [monorepo.md](design_patterns/monorepo.md) | pnpm workspaces + Turborepo build pipeline |

### [WASM & Native](wasm_native/)

Why we use Rust and C++ in a TypeScript project, how the compilation pipelines work, and when to reach for native code.

| File | What it covers |
|---|---|
| [why-wasm.md](wasm_native/why-wasm.md) | Why WebAssembly, why Rust, what problems it solves |
| [formula-pipeline.md](wasm_native/formula-pipeline.md) | Lexer → Parser → Compiler → VM — the full formula engine walkthrough |
| [wasm-bridge.md](wasm_native/wasm-bridge.md) | How TypeScript talks to Rust through JSON serialization |
| [cpp-addon.md](wasm_native/cpp-addon.md) | The C++ native logger addon — Observer pattern, graceful fallback |
| [when-native.md](wasm_native/when-native.md) | Decision framework: when to write native code vs. staying in TS |

[click here to access to further info about a superb rust cheatsheet](https://speedsheet.io/s/rust#h53m)