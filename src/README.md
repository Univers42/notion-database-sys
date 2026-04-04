# src/ — Main Frontend App

The full Notion DBMS clone. A Vite + React single-page app with 10+ database views, a block-based page editor, inline formula editing, filters, sorts, grouping, relations, rollups, and switchable database backends.

## How to run

```bash
# From src/
make dev              # Vite dev server on http://localhost:3000

# Or from project root
pnpm dev:src
```

First run will auto-build the native C++ logger addon and generate `_notion_state.json` if missing.

## Directory structure

| Directory | What's in it |
|---|---|
| `components/` | All React components — views, blocks, editors, UI primitives |
| `components/views/` | View implementations: table, board, calendar, timeline, gallery, list, chart, dashboard, map, feed |
| `components/blocks/` | Block-level editor components: paragraph, heading, code, callout, toggle, todo, table, embed, equation, etc. |
| `components/ui/` | Shared UI primitives (Icon, IconPicker, MenuPrimitives) |
| `components/filters/` | Filter builder components |
| `components/sort/` | Sort builder components |
| `components/formulaEditor/` | Formula editor panel internals |
| `components/cellEditors/` | Per-type cell editor components |
| `components/propertyConfig/` | Property configuration panel |
| `components/pageModal/` | Page modal (side-peek, center-peek, full-page) |
| `store/` | Zustand state management |
| `store/useDatabaseStore.ts` | Main store — all database state and actions |
| `store/slices/` | Store slices (modular state chunks) |
| `store/dbms/` | Database backend data files (json, csv, mongodb seeds, relational seeds) |
| `store/collections/` | Collection seed definitions |
| `hooks/` | Custom React hooks (block editor, cell anchors, paste handler, undo/redo, etc.) |
| `lib/` | Core logic libraries |
| `lib/engine/` | Rust/WASM formula engine (Cargo project + TS bridge) |
| `lib/formula/` | Formula cache and evaluation helpers |
| `lib/filter/` | Filter evaluation logic |
| `lib/syntax/` | Syntax highlighting |
| `lib/markdown/` | Markdown parsing |
| `lib/rust/` | Additional Rust WASM crates (json_writer, csv_writer) |
| `server/` | Vite dev server middleware (DB adapters, file watcher, logger) |
| `services/` | MongoDB and PostgreSQL client services |
| `types/` | TypeScript interfaces (database, views, filters, property types) |
| `utils/` | Utility functions (formatting, aggregation, geometry, colors) |
| `constants/` | Shared constants (colors, property icons) |

## Key concepts

### Views

Each view lives in `components/views/` and renders the same database from a different angle. The active view is stored in the Zustand store. All views share the same filter/sort/group pipeline.

Available views: `table`, `board`, `gallery`, `list`, `timeline`, `calendar`, `chart`, `dashboard`, `map`, `feed`

### Database store

`store/useDatabaseStore.ts` is the central Zustand store. It holds:
- All databases and their rows
- Active view configuration
- Filter/sort/group state
- Property definitions
- Undo/redo history

Store slices in `store/slices/` keep the code modular.

### Block editor

The page editor (`components/PageContentEditor.tsx`) is a block-based editor like Notion's. Each block is a separate component in `components/blocks/`. Supports:
- Paragraphs, headings (H1-H3), lists, todos, toggles
- Code blocks with syntax highlighting
- Callouts, quotes, dividers, spacers
- Embeds, equations (KaTeX), media
- Inline databases, table blocks
- Slash command menu (`/` to insert blocks)
- Inline toolbar (select text → bold, italic, link, etc.)

### Formula engine

The formula engine is written in Rust and compiled to WASM. Located in `lib/engine/`:

```
Rust source code → wasm-pack → .wasm binary
                                    ↓
                            bridge.ts (TS wrapper)
                                    ↓
                        FormulaEditorPanel (live preview)
```

Pipeline: Lexer → Pratt parser → Bytecode compiler → Register VM

To rebuild after changing Rust code:
```bash
cd src && make build-rust
```

## DBMS switching

The app supports 4 database backends. Set `ACTIVE_DB_SOURCE` in `.env`:

| Backend | Source | How it works |
|---|---|---|
| `json` | `store/dbms/json/` | Reads/writes JSON files via Vite dev server middleware |
| `csv` | `store/dbms/csv/` | Reads/writes CSV files via Vite dev server middleware |
| `mongodb` | Docker container | Connects through `server/` middleware to MongoDB |
| `postgresql` | Docker container | Connects through `server/` middleware to PostgreSQL |

The adapter layer lives in `services/dbms/`. `DbAdapterFactory.ts` picks the right adapter based on the env variable. Each adapter implements the same interface, so the frontend doesn't care which backend is active.

For `json` and `csv`, data files live directly in `store/dbms/json/` and `store/dbms/csv/`. For live databases, you need Docker running (`make up` from root), then seed with `make seed-pg` / `make seed-mongo`.
