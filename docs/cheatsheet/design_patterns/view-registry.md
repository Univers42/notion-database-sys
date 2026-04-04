# View Component Registry

## The Pattern

Instead of a `switch` statement to render the active view, we use a plain object that maps view types to components:

```tsx
// DatabaseView.tsx
const VIEW_COMPONENTS: Record<ViewType, React.ComponentType> = {
  table:     TableView,
  board:     BoardView,
  gallery:   GalleryView,
  list:      ListView,
  timeline:  TimelineView,
  calendar:  CalendarView,
  chart:     ChartView,
  form:      FormView,
  dashboard: DashboardView,
  doc:       DocView,
};

// Render
const ViewComponent = VIEW_COMPONENTS[viewType];
return (
  <ErrorBoundary key={viewType}>
    <ViewComponent />
  </ErrorBoundary>
);
```

## Why Not a Switch?

```tsx
// Don't do this
switch (viewType) {
  case 'table':     return <TableView />;
  case 'board':     return <BoardView />;
  case 'gallery':   return <GalleryView />;
  case 'list':      return <ListView />;
  // ... 10 more cases
  default:          return null;
}
```

Problems:
1. **Verbose.** 10 views = 10 cases + 10 returns + default.
2. **Easy to forget.** Add a new view type to the union but forget to add a case → no error, just `null`.
3. **No reuse.** If you want to list available views elsewhere (e.g., a view picker dropdown), you'd duplicate the mapping.

With the registry object:
1. **TypeScript checks completeness.** `Record<ViewType, Component>` requires an entry for every member of `ViewType`. Miss one → compile error.
2. **One line per view.** Adding a view = one line in the registry + one component file.
3. **Reuse.** You can iterate `Object.keys(VIEW_COMPONENTS)` for the view picker.

## The ErrorBoundary Wrapper

```tsx
<ErrorBoundary key={viewType}>
  <ViewComponent />
</ErrorBoundary>
```

Each view renders inside its own `ErrorBoundary`. If the chart view crashes (bad SVG path, division by zero), the table view still works. The user sees "Something went wrong" in the chart tab and can switch to another view.

The `key={viewType}` is important — it forces React to remount the ErrorBoundary when the view type changes. Without it, switching from a crashed chart view to the table view would still show the error because the ErrorBoundary's error state persists.

## Other Registries in the Codebase

The same pattern appears in several places:

### Block Registry (blocks/)

```tsx
const BLOCK_RENDERERS: Record<BlockType, React.ComponentType<BlockProps>> = {
  paragraph:      ParagraphBlock,
  heading_1:      Heading1Block,
  heading_2:      Heading2Block,
  code:           CodeBlock,
  bulleted_list:  BulletedListBlock,
  // ... 20+ block types
};
```

### Cell Editor Registry (CellEditors.tsx)

```tsx
const CELL_EDITORS: Partial<Record<PropertyType, React.ComponentType<CellEditorProps>>> = {
  text:         TextCellEditor,
  number:       NumberCellEditor,
  select:       SelectCellEditor,
  date:         DateCellEditor,
  // ...
};
```

Note: `Partial<Record<...>>` here because not every property type has a custom editor (some use the default text input).

### Adapter Registry (ops/index.ts)

```tsx
const adapters: Record<DbSourceType, DbmsAdapter> = {
  json: new JsonOps(),
  csv: new CsvOps(),
  postgresql: new PostgresOps(),
  mongodb: new MongoOps(),
};
```

## The Pattern

```ts
// 1. Define the union type
type ThingType = 'a' | 'b' | 'c';

// 2. Create the registry (Record ensures completeness)
const REGISTRY: Record<ThingType, Implementation> = {
  a: ImplementationA,
  b: ImplementationB,
  c: ImplementationC,
};

// 3. Look up at runtime
const impl = REGISTRY[thingType];
```

Use it whenever you have a finite set of types mapping to implementations. It's simpler than a factory class, more maintainable than a switch, and TypeScript enforces completeness.

## References

- [TypeScript — `Record<Keys, Type>` Utility Type](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type) — The mapped type that ensures every variant in the union has an entry in the registry.
- [TypeScript Handbook — Exhaustiveness Checking](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#exhaustiveness-checking) — Using `never` to guarantee all cases are handled at compile time.
- [React — `ErrorBoundary`](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary) — Wrapping dynamically-resolved components in error boundaries keyed by view type.
