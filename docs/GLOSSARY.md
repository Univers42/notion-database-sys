# Technical Glossary

Quick-reference dictionary for every technical term used across the codebase and its documentation.
If a word appears in commit messages, code comments, or the cheatsheet and you're not sure what it means, look it up here.

---

### ABAC (Attribute-Based Access Control)
A permissions model where access decisions are made by evaluating **attributes** (user role, resource owner, time of day…) against **rules**, instead of checking a static role list.  Our implementation cascades rules from workspace → page → block.

### Adapter (pattern)
A wrapper that makes one interface look like another.  In this project, four adapters (JSON, CSV, MongoDB, PostgreSQL) all expose the same `DbAdapter` interface so the rest of the code doesn't care which backend is active.

### ABI (Application Binary Interface)
The binary-level calling convention between compiled modules.  Matters when our C++ addon is compiled with one Node.js version and loaded by another — Node-API guarantees ABI stability across versions.

### AST (Abstract Syntax Tree)
A tree representation of parsed source code.  The formula engine's parser turns `price * 1.2` into an AST before the compiler turns it into bytecode.

### Bytecode
A compact binary instruction set executed by a virtual machine.  The formula compiler emits bytecode (OpConst, OpAdd, OpCall…) that the stack VM then interprets.

### Cache Invalidation
Deciding *when* a cached value is stale.  Our computed cache uses **reference equality** (did the Zustand state object change?) and the formula cache uses **composite keys** (formulaId + updatedAt).

### Catmull-Rom Spline
A type of interpolating cubic spline that passes through all its control points.  Used in `smoothLine()` to draw smooth timeline chart curves from discrete data points.

### CI / CD (Continuous Integration / Continuous Deployment)
Automated pipelines that build, lint, test, and deploy code on every push.  The `.github/workflows/` YAML files define ours.

### `cn()`
A project utility that combines `clsx` (conditional classNames) and `tailwind-merge` (conflict resolution) into one call.  `cn('p-2', props.className)` always does the right thing.

### Composite Key
A cache key built by combining multiple values, e.g. `${formulaId}:${updatedAt}`.  If any part changes, the cached entry is considered stale.

### `contentEditable`
An HTML attribute that turns any DOM element into a user-editable text area.  We use it instead of `<textarea>` to get inline rich-text editing (bold, links, mentions) without pulling in a full editor framework.

### Context (React)
A React mechanism for passing data down the component tree without props at every level ("prop drilling").  `DatabaseScopeContext` scopes everything to a specific database instance.

### CSP (Content Security Policy)
An HTTP header that restricts which scripts, styles and resources a page can load.  Our WASM module needs `'unsafe-eval'` in the CSP — a Vite plugin patches the header automatically in dev mode.

### CRUD (Create, Read, Update, Delete)
The four basic operations on persistent data.  The `DbService` layer in our DBMS exposes async CRUD methods for the API server.

### Debounce
Delaying execution until a burst of events has stopped for a given time.  We debounce cell edits (400 ms) so that typing "hello" produces one database write, not five.

### Discriminated Union
A TypeScript union where every member has a literal **tag** field (the "discriminant") that TypeScript uses to narrow the type.  `PropertyConfig` uses `{ type: 'text', … } | { type: 'number', … }`.

### Docker Compose
A tool for defining and running multi-container Docker applications with a single `docker-compose.yml`.  Our file spins up MongoDB + PostgreSQL side by side.

### DOM (Document Object Model)
The browser's in-memory tree of every HTML element.  When we say "portal into the DOM body", we mean React rendering a component outside the normal tree, directly under `<body>`.

### `dotenv`
A library that loads environment variables from a `.env` file into `process.env`.  Used by both the Vite dev server and the Fastify API to read `ACTIVE_DB_SOURCE`, `MONGO_URI`, etc.

### ESLint
A pluggable static analysis tool for JavaScript/TypeScript that enforces code style and catches bugs at development time.  Our config is in `eslint.config.js` (flat config format).

### Exhaustiveness Checking
A TypeScript technique where the `never` type guarantees that a switch/if-else covers every variant in a union.  If you add a new `PropertyType` and forget to handle it, the compiler errors.

### Fastify
A high-performance Node.js web framework used in `packages/api`.  Comparable to Express but with built-in schema validation and a plugin architecture.

### Flat Config (ESLint)
The modern ESLint configuration format (`eslint.config.js` returning an array of config objects) that replaced the legacy `.eslintrc` file.

### Handle (WASM)
An opaque integer or pointer returned by the WASM module that references an internal object (like a compiled formula).  The JS side caches handles to avoid recompiling.

### HMR (Hot Module Replacement)
A Vite feature that updates modules in the browser without a full page reload.  Editing a React component re-renders just that component.

### Hook (React)
A function (`useState`, `useEffect`, `useMemo`, …) that lets functional components manage state and side effects.  Custom hooks like `usePortalClose` encapsulate reusable behavior.

### Inference (Schema)
Automatically determining database column types by scanning all stored values.  `inferSchema()` reads every record and classifies each field as text, number, date, array, etc.

### JSDoc
A documentation comment format (`/** @param … */`) that TypeScript understands and uses for IDE tooltips and type inference in `.js` files.

### JWT (JSON Web Token)
A compact, signed token used for stateless authentication.  `@fastify/jwt` issues and verifies JWTs in the API server.

### Lexer (Tokenizer)
The first stage of the formula engine: splits raw text (`price * 1.2`) into tokens (`[Ident("price"), Star, Number(1.2)]`).

### LRU (Least Recently Used)
A cache eviction policy that discards the entry accessed *longest ago*.  The formula evaluation cache uses LRU to cap memory.

### Middleware
In Vite/Express, a function that intercepts HTTP requests before they reach the main handler.  Our `dbmsMiddleware` plugin turns the Vite dev server into a REST API for the database layer.

### Monorepo
A single Git repository containing multiple packages/projects.  Ours contains `packages/types`, `packages/core`, `packages/api`, the main `src/` app, and `playground/`.

### Mongoose
An ODM (Object-Document Mapper) for MongoDB and Node.js.  `packages/core` defines Mongoose schemas that map to the same types used by the JSON/CSV adapters.

### Memoization
Caching the result of a pure function so identical inputs return the stored result instantly.  `computedCache` and `React.useMemo` are both forms of memoization.

### Node-API (N-API)
A C-level ABI-stable interface for writing native Node.js addons.  Our C++ logger is built on `node-addon-api`, the C++ wrapper around Node-API.

### Ops (Operations Layer)
The synchronous, in-memory mutation layer in the DBMS.  `ops` immediately update the Zustand store; async `services` persist to disk/network afterward.

### Portal (React)
`createPortal()` renders a component into a different DOM node (usually `document.body`), escaping its parent's CSS overflow/positioning.  Used for modals, tooltips, dropdown menus.

### Pratt Parser
A top-down operator-precedence parsing technique.  The formula engine uses a Pratt parser to handle expressions with mixed precedence (`+`, `*`, function calls…) in a single pass.

### pnpm
A fast, disk-efficient Node.js package manager that uses symlinks and a content-addressable store.  The `pnpm-workspace.yaml` file defines the monorepo structure.

### Prop Drilling
Passing data through many intermediate components via props just to reach a deeply nested child.  React Context solves this.

### Range / Selection API
Browser APIs (`Document.createRange()`, `window.getSelection()`) that let JavaScript read and manipulate the user's text cursor and selection.  Critical for `contentEditable` cursor stability.

### `rename(2)` (POSIX)
The system call that atomically replaces one file with another on the same filesystem.  The "temp + rename" pattern uses this for crash-safe writes.

### Result Pattern
Returning `{ ok: true, value }` or `{ ok: false, reason }` instead of throwing exceptions.  Forces callers to handle failure explicitly — the TypeScript compiler ensures you check `ok` before accessing `value`.

### Rollup
A JavaScript module bundler that Vite uses internally for production builds.  You'll mostly interact with it through Vite's plugin API, not directly.

### Slice (Zustand)
A factory function that produces a subset of the store's state and actions.  Slices are composed together into one `useDatabaseStore` via spread syntax.

### SonarQube
A static analysis platform that detects bugs, code smells, security vulnerabilities, and duplicated code.  Our CI pipeline runs it and requires zero issues.

### Stack VM (Virtual Machine)
A virtual machine where operands are pushed onto a stack, operators pop them, and results are pushed back.  The formula engine's VM executes compiled bytecode this way.

### Strategy (pattern)
A design pattern where an algorithm is selected at runtime.  `DbAdapterFactory.getAdapter(source)` picks JSON, CSV, MongoDB, or PostgreSQL based on the config value.

### `structuredClone()`
A browser/Node.js API that performs a deep copy of any structured-cloneable value.  Used to snapshot the Zustand state for undo/redo without reference sharing.

### Tailwind CSS
A utility-first CSS framework where you style by composing atomic classes (`flex`, `p-4`, `text-sm`) instead of writing custom CSS.  v4 uses native CSS nesting and `@layer`.

### Turborepo
A monorepo build tool that caches task outputs and respects cross-package dependency order.  `turbo run build` builds `types → core → api` in the correct sequence.

### TypeScript Project References
A compiler feature (`composite: true` + `references` in tsconfig) that allows incremental, cross-package type-checking without rebuilding everything.

### UUID (Universally Unique Identifier)
A 128-bit identifier (e.g. `550e8400-e29b-41d4-a716-446655440000`) used as the primary key for pages, properties, and blocks.

### Vite
A modern frontend build tool that uses native ES modules for instant dev server startup and Rollup for optimized production bundles.

### WASM (WebAssembly)
A binary instruction format that runs at near-native speed in browsers and Node.js.  Our formula engine is written in Rust and compiled to `.wasm`.

### `wasm-bindgen`
A Rust crate that generates JavaScript glue code so Rust functions can be called from JS and vice versa.  It's the bridge between our TypeScript code and the Rust formula VM.

### `wasm-pack`
A CLI tool that compiles a Rust crate to WebAssembly, runs `wasm-opt`, and produces an npm-ready package with TypeScript type declarations.

### WebSocket
A protocol for persistent, bidirectional communication between client and server.  Used for real-time data sync (`@fastify/websocket` in the API; Vite's HMR WebSocket in dev).

### Workspace (pnpm)
A directory listed in `pnpm-workspace.yaml` that pnpm treats as a separate package, linked via `workspace:*` protocol so cross-package imports resolve to the local source.

### Zustand
A minimal React state management library (< 1 KB) based on publish-subscribe.  The entire app state lives in one Zustand store, split into composable slices.
