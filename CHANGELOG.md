# Changelog

All notable changes are documented here.

## [2026-03-19]

- **10:31** `feat(types)` add Page interface with properties record and content blocks
- **10:42** `feat(types)` add ViewConfig with visibleProperties and activeViewId
- **10:53** `feat(types)` define PropertyType union (text, number, select, date, …)
- **11:05** `feat(types)` add SelectOption and StatusGroup with color tokens
- **11:16** `feat(types)` add Filter, FilterOperator union and evaluateFilter signature
- **11:27** `feat(types)` add Sort and multi-sort direction types
- **11:38** `feat(types)` add Grouping interface for board/gallery group-by
- **11:49** `feat(types)` add ViewSettings with columnWidths, showRowNumbers, wrapContent
- **12:00** `feat(types)` add FormulaConfig and RollupConfig with aggregation modes
- **12:11** `feat(types)` add RelationConfig and ButtonConfig types
- **12:22** `feat(types)` add Block interface for page content editor
- **13:44** `feat(store)` add DatabaseState interface with databases, pages, views maps
- **13:54** `feat(store)` implement addPage and deletePage with immutable updates
- **14:05** `feat(store)` implement updatePageProperty with updatedAt timestamp
- **14:15** `feat(store)` add getPagesForView filtering records by databaseId
- **14:26** `feat(store)` add searchQuery global text filter to getPagesForView
- **14:36** `feat(store)` implement evaluateFilter for all FilterOperator cases
- **14:47** `feat(store)` add multi-sort support with compareValues helper
- **14:57** `feat(store)` add addProperty, deleteProperty and updateProperty actions
- **15:08** `feat(store)` implement togglePropertyVisibility and hideAllProperties
- **15:19** `feat(store)` add addView, deleteView, duplicateView, setActiveView
- **15:29** `feat(store)` add updateViewSettings and reorderProperties actions
- **15:40** `feat(store)` implement duplicatePage preserving all properties
- **15:50** `feat(store)` add updatePageContent for block-level editing
- **16:01** `feat(store)` add getGroupedPages for board/gallery grouped rendering
- **16:11** `feat(store)` add getPageTitle helper from titlePropertyId
- **16:22** `feat(store)` add addSelectOption to extend property option list
- **16:32** `feat(store)` add renameDatabase and updateDatabaseIcon actions
- **16:54** `feat(seed)` add 30 products per category (300 total pages)
- **17:05** `feat(seed)` add select options with semantic color tokens for all fields
- **17:16** `feat(seed)` add product views: table, board, gallery, timeline, calendar
- **17:26** `feat(seed)` implement generateProductPages factory with random data
- **17:37** `feat(seed)` add formula and rollup properties to product schema
- **17:47** `feat(seed)` add assigned_to, due_date and status fields to products
- **18:08** `feat(seed)` add reverse relation props and bidirectional link data
- **18:19** `feat(seed)` add project views: table, board, calendar with grouping
- **18:29** `feat(seed)` integrate product and relation seeds into store initial state
- **18:40** `feat(seed)` finalize seed data: status groups, select options, attachments
- **18:51** `chore(seed)` add load limit defaults and column width presets to views

## [2026-03-22]

- **09:18** `feat(ui)` add PageModal (side_peek, center_peek, full_page modes)
- **09:28** `feat(ui)` add PropertyRow component inside PageModal
- **09:39** `feat(ui)` add PageContentEditor with block-level paragraph editing
- **09:49** `feat(ui)` add EmptyState fallback for no-view-selected screen
- **10:10** `feat(sidebar)` add collapsible database group in sidebar
- **10:20** `feat(sidebar)` add view icon map for all 10 view types
- **10:41** `feat(topbar)` add search input with keyboard focus on open
- **10:52** `feat(topbar)` add FilterPanel component with multi-condition builder
- **11:02** `feat(topbar)` add SortPanel with up to N sort levels
- **11:13** `feat(topbar)` add add-view panel with all 10 view type cards
- **11:23** `feat(topbar)` add view rename with inline input and enter/esc handling
- **11:33** `feat(topbar)` add duplicate/delete view in view tab context menu
- **11:44** `feat(topbar)` add fullscreen toggle and export/download placeholders
- **11:54** `feat(topbar)` add database switcher dropdown in TopBar left section
- **12:05** `feat(topbar)` add view dots overflow menu for extra actions
- **12:15** `feat(topbar)` add Notion-authentic SVG icon set for all view types
- **12:36** `feat(settings)` add group-by property selector in ViewSettingsPanel
- **12:46** `feat(settings)` add load limit slider (25–500 rows) to ViewSettingsPanel
- **13:51** `feat(table)` add column resize on drag with configurable min width
- **14:02** `feat(table)` add property visibility toggle popover in header
- **14:12** `feat(table)` add SelectEditor popup with create-option capability
- **14:22** `feat(table)` add MultiSelectEditor with pill display and create
- **14:33** `feat(table)` render title, text, number, date cell types
- **14:43** `feat(table)` add checkbox cell with immediate toggle on click
- **14:54** `feat(table)` add person and user cells with avatar initials
- **15:04** `feat(table)` add email, url and phone cells with link styling
- **15:15** `feat(table)` add place cell showing MapPin icon and address text
- **15:25** `feat(table)` add id, files_media and button cell types
- **15:35** `feat(table)` add formula cell display with Sigma icon click-to-edit
- **15:46** `feat(table)` add rollup cell: number/bar/ring display modes
- **15:56** `feat(table)` add relation cell with page-link buttons
- **16:07** `feat(table)` add assigned_to multi-avatar cell with stacking
- **16:17** `feat(table)` add due_date cell with Overdue/Today/Nd-left badges
- **16:27** `feat(table)` add custom type cell (boolean, json, timestamp, string)
- **16:38** `feat(table)` add created_time, last_edited_time auto cells
- **16:48** `feat(table)` add created_by and last_edited_by user cells
- **16:59** `feat(table)` implement keyboard navigation (arrow keys, Tab, Enter, Esc)
- **17:09** `feat(table)` add Shift+Enter to create new record below cursor
- **17:19** `feat(table)` add Delete/Backspace to clear non-title cell value
- **17:30** `feat(table)` add column drag-and-drop reorder via HTML5 drag events
- **17:40** `feat(table)` add property config panel on column header click
- **17:51** `feat(table)` add Excel-style fill handle drag-copy across rows
- **18:01** `feat(table)` add grouped row rendering with collapsible group headers
- **18:12** `feat(table)` add row numbers, load-more pagination and + New row
- **18:22** `feat(table)` add per-row context menu (open page, duplicate, delete)
- **18:43** `feat(board)` add drag-and-drop cards between columns
- **18:53** `feat(board)` add add-card button per column with inline title input
- **19:04** `feat(gallery)` add gallery card with cover image and property pills

## [2026-03-27]

- **09:12** `feat(engine)` add wasm-bindgen, serde and serde_json to Cargo dependencies
- **09:33** `feat(engine)` add identifier, reserved-word and operator token types
- **09:43** `feat(engine)` add string literal tokenisation with escape sequences
- **10:04** `feat(engine)` add number, text, boolean, date, dateRange and array variants
- **10:35** `feat(engine)` handle unary minus, parenthesised sub-expressions and calls
- **10:46** `feat(engine)` add property access (prop["name"]) and identifier lookup
- **11:07** `feat(engine)` emit constant pool, push/pop and binary-op instructions
- **11:17** `feat(engine)` add call instruction with argument arity encoding
- **11:38** `feat(engine)` add arithmetic ops: +, -, *, / with type coercion
- **11:48** `feat(engine)` add comparison ops: ==, !=, <, >, <=, >= on number and text
- **11:59** `feat(engine)` add logical ops: and, or, not with short-circuit evaluation
- **13:56** `feat(engine)` add formula handle cache keyed by compiled expression
- **14:07** `feat(engine)` implement free_formula and get_dependencies WASM exports
- **14:17** `feat(engine)` build WASM package with wasm-pack targeting web
- **14:38** `feat(bridge)` add initFormulaEngine async bootstrap with retry guard
- **14:48** `feat(bridge)` add evalFormula one-shot compile+evaluate for single row
- **14:59** `feat(bridge)` add batchEvaluate for whole-table batch mode (most efficient)
- **15:09** `feat(bridge)` add compileFormula returning reusable handle with cache
- **15:19** `feat(bridge)` add validateFormula returning errors and dependency list
- **15:30** `feat(bridge)` add getDependencies, freeFormula and clearFormulaCache exports
- **15:40** `feat(bridge)` add non-blocking auto-init on module import
- **15:51** `feat(store)` integrate WASM bridge into resolveFormula store action
- **16:01** `feat(store)` add formula result LRU cache (10 000 entries, 25% eviction)
- **16:12** `feat(store)` implement resolveRollup with count/sum/avg/min/max/unique
- **16:22** `feat(store)` add show_original and show_unique rollup display modes
- **18:37** `fix(engine)` handle UTF-8 multi-byte emoji in string len/slice functions
- **18:48** `fix(engine)` treat and/or/not as reserved keywords, not identifiers
- **18:58** `fix(store)` invalidate formula cache on page updatedAt change
- **19:09** `fix(table)` prevent #ERROR on page refresh from reserved-word param names
- **19:19** `fix(table)` add missing useMemo import to TableView.tsx
- **19:29** `fix(bridge)` remove TS formula fallback engine – WASM is the sole evaluator
- **19:40** `fix(store)` remove ~200-line TS fallback ctx from useDatabaseStore

## [2026-03-28]

- **09:05** `perf(store)` replace JSON.stringify cache key with reference-equality checks
- **09:16** `perf(table)` extract MemoTableRow as React.memo – only re-render changed rows
- **09:26** `perf(table)` wrap all row handler props in useCallback with empty deps
- **09:37** `perf(table)` memoize visibleProps, allProps, hiddenProps with useMemo
- **09:48** `perf(table)` remove transition-all from 6000+ td elements (compositor overhead)
- **09:58** `perf(table)` replace 300 DropdownMenu.Portal instances with single shared menu
- **10:09** `perf(table)` throttle column resize updates with requestAnimationFrame
- **10:19** `perf(table)` fix fill handle to use O(1) pageIdToRowIdx Map lookup
- **10:30** `perf(table)` move stable action refs to useDatabaseStore.getState()
- **10:40** `perf(sidebar)` replace full store subscription with individual selectors
- **10:50** `perf(topbar)` use selective Zustand selectors – only re-render on relevant state
- **11:01** `perf(topbar)` use getState() for actions in FilterPanel and SortPanel
- **11:11** `perf(app)` fix PageModal, PropertyRow and PageContentEditor store subscriptions
