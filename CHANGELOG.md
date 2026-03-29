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
