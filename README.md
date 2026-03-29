# notion-database-sys

A fully client-side, Notion-style database engine built with **React 19**, **TypeScript**, **Vite**, and a custom **Rust/WASM formula evaluator**. No backend, no cloud dependency — everything runs in the browser.

---

## Features

### 10 View Types
| View | Description |
|---|---|
| **Table** | Spreadsheet-style grid with inline editing, column resize, fill-handle, keyboard navigation |
| **Board** | Kanban board grouped by any select/status property |
| **Gallery** | Card grid with cover image and property pills |
| **List** | Compact rows with collapsible group headers |
| **Timeline** | Gantt-style date-range bars |
| **Calendar** | Monthly grid with event tiles |
| **Chart** | Bar, line and pie chart modes |
| **Dashboard** | Configurable widget grid |
| **Feed** | Card feed ordered by date |
| **Map** | Location property renderer |

### Property Types
`title` · `text` · `number` · `select` · `multi_select` · `status` · `date` · `checkbox` · `person` · `email` · `url` · `phone` · `place` · `files_media` · `id` · `button` · `formula` · `rollup` · `relation` · `assigned_to` · `due_date` · `created_time` · `last_edited_time` · `created_by` · `last_edited_by` · `custom`

### Formula Engine (Rust → WASM)
- Compiled with `wasm-pack` targeting the browser
- Lexer → Pratt parser → bytecode compiler → register VM pipeline
- Built-in functions: **math** (`abs`, `ceil`, `floor`, `round`, `sqrt`), **text** (`upper`, `lower`, `len`, `concat`, `contains`), **date** (`now`, `today`, `dateAdd`, `dateDiff`, `dateFormat`), **array** (`count`, `sum`, `min`, `max`, `avg`, `unique`), **logic** (`if`, `ifs`, `switch`, `and`, `or`, `not`)
- Formula handle cache — compiled expressions are reused across rows
- Live preview in the **FormulaEditorPanel** (validates + shows result as you type)

### Other Highlights
- **Filters** — multi-condition builder with all common operators
- **Sorts** — N-level sort with direction control
- **Grouping** — group any view by select/status/person property
- **Relations & Rollups** — link two databases, aggregate across the relation
- **Page editor** — block-level paragraph editing in side-peek / center-peek / full-page modal
- **Performance** — `React.memo` rows, selective Zustand selectors, single shared row menu (replaces per-row Radix portals), `requestAnimationFrame` resize throttle

---

## Stack

| Layer | Technology |
|---|---|
| UI framework | React 19 |
| Language | TypeScript 5.8 |
| Build tool | Vite 6 |
| Styling | Tailwind CSS v4 |
| State | Zustand 5 |
| UI primitives | Radix UI |
| Formula engine | Rust + wasm-pack (WebAssembly) |

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) ≥ 18
- *(optional — only if you rebuild the WASM engine)* [Rust](https://rustup.rs/) + `wasm-pack`

### Install & run

```bash
git clone https://github.com/Univers42/notion-database-sys.git
cd notion-database-sys
npm install
npm run dev
```

The dev server starts at **http://localhost:5173** (or the next available port).

### Build for production

```bash
npm run build        # outputs to dist/
npm run preview      # preview the production bundle locally
```

---

## Project Structure

```
src/
├── App.tsx                        # View router + PageModal
├── main.tsx                       # React entry point
├── index.css                      # Tailwind base + reset
├── types/
│   └── database.ts                # All shared TypeScript interfaces
├── store/
│   ├── useDatabaseStore.ts        # Zustand store — all state & actions
│   ├── productSeed.ts             # 300-item product database seed
│   └── relationSeed.ts            # Project tracker database seed
├── components/
│   ├── Sidebar.tsx                # Database/view navigator
│   ├── TopBar.tsx                 # View tabs, search, filter, sort
│   ├── ViewSettingsPanel.tsx      # Column, row and grouping options
│   ├── PropertyConfigPanel.tsx    # Property type + options editor
│   ├── FormulaEditorPanel.tsx     # Live WASM formula preview
│   ├── RollupEditorPanel.tsx      # Aggregation config
│   ├── RelationEditorPanel.tsx    # Relation target-database picker
│   ├── ErrorBoundary.tsx
│   ├── ui/                        # Icon, IconPicker, MenuPrimitives, …
│   └── views/
│       ├── TableView.tsx
│       ├── BoardView.tsx
│       ├── GalleryView.tsx
│       ├── ListView.tsx
│       ├── TimelineView.tsx
│       ├── CalendarView.tsx
│       ├── ChartView.tsx
│       ├── DashboardView.tsx
│       ├── FeedView.tsx
│       ├── MapView.tsx
│       ├── FormulaAnalyticsDashboard.tsx
│       └── RelationRollupDashboard.tsx
└── lib/
    └── engine/                    # Rust WASM formula engine
        ├── Cargo.toml
        ├── bridge.ts              # TypeScript wrapper for WASM exports
        └── src/
            ├── lib.rs             # WASM entry — compile / evaluate / validate
            ├── lexer.rs
            ├── parser.rs
            ├── compiler.rs
            ├── vm.rs
            ├── types.rs
            ├── error.rs
            └── functions/
                ├── math.rs · text.rs · date.rs · array.rs · logic.rs
                └── mod.rs
```

---

## Keyboard Shortcuts (Table View)

| Key | Action |
|---|---|
| `Arrow keys` | Move focus between cells |
| `Enter` | Open cell editor |
| `Shift+Enter` | Create new row below |
| `Esc` | Stop editing / close editor |
| `Tab` | Move to next cell |
| `Delete` / `Backspace` | Clear cell value (non-title cells) |

---

## Rebuilding the WASM Engine

The pre-compiled WASM binary is included. Only needed if you modify the Rust source:

```bash
cd src/lib/engine
wasm-pack build --target web --out-dir pkg
```

---

## License

MIT
