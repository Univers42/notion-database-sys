# Zustand Slice Composition

## The Architecture

The database store (`src/store/useDatabaseStore.ts`) is the central nervous system of the app. It holds everything: databases, pages, views, properties, filters, sorts, selection state, undo history.

Putting all of that in one file would be 2000+ lines. Instead, we split it into **slices** — each slice is a function that returns a partial state object.

## How Slices Work

Each slice is a factory function that receives `set` and `get` from Zustand:

```ts
// slices/databaseSlice.ts
export function createDatabaseSlice(
  set: SetState<DatabaseState>,
  get: GetState<DatabaseState>,
) {
  return {
    databases: [],
    addDatabase(db: Database) {
      set({ databases: [...get().databases, db] });
    },
    removeDatabase(id: string) {
      set({ databases: get().databases.filter(d => d.id !== id) });
    },
  };
}
```

```ts
// slices/viewSlice.ts
export function createViewSlice(set, get) {
  return {
    activeViewId: null,
    views: [],
    setActiveView(id: string) {
      set({ activeViewId: id });
    },
    addView(view: ViewConfig) {
      set({ views: [...get().views, view] });
    },
  };
}
```

## Composition

The main store spreads all slices into one `create()` call:

```ts
// useDatabaseStore.ts
export const useDatabaseStore = create<ExtendedDatabaseState>((set, get) => ({
  ...createDatabaseSlice(set, get),
  ...createPageSlice(set, get),
  ...createViewSlice(set, get),
  ...createSelectionSlice(set, get),
  ...createComputedSlice(set, get),

  // Method overrides — layer side effects on top of slice logic
  updatePageProperty(pageId, propName, value) {
    const result = validateProperty(propName, value, get());
    if (!result.ok) return;
    // Call the original slice method
    get().setPageProperty(pageId, propName, result.value);
    // Then persist to database
    persistPageProperty(pageId, propName, result.value, get().activeSource);
  },
}));
```

## The Method Override Pattern

The top-level file **overrides** some slice methods to add cross-cutting concerns:

```
Slice method:    setPageProperty(id, field, value)  ← pure state update
                          ↓
Top-level override: updatePageProperty(id, field, value)
                          ↓  validate
                          ↓  call slice method
                          ↓  persist to database
                          ↓  log to query log
```

This separation means:
- Slices contain **pure state logic** — easy to reason about, easy to test
- Overrides add **side effects** (validation, persistence, logging) in one place
- You can call the raw slice method when you want to skip validation (e.g., during data loading)

## Slice Dependencies

Slices can access other slices' state through `get()`:

```ts
// computedSlice.ts
function getPagesForView(viewId: string): Page[] {
  const { pages, views } = get();  // Reads from databaseSlice and viewSlice
  const view = views.find(v => v.id === viewId);
  return applyFilters(pages, view?.filters ?? []);
}
```

This works because all slices share the same `get` function, which returns the complete store state.

## Why Not Separate Stores?

You could create `usePageStore`, `useViewStore`, `useSelectionStore` as independent Zustand stores. Problems:

1. **Cross-store actions are awkward.** Deleting a page needs to update the page store, the view store (remove page from filtered results), and the selection store (deselect if selected). With separate stores, you'd need to coordinate.
2. **No atomic updates.** With one store, `set({ pages: newPages, selectedCell: null })` is atomic — React sees one state change, one re-render. With separate stores, each update triggers a separate re-render.
3. **Subscription complexity.** Components that need data from multiple stores subscribe to all of them, running selectors from each. One store with one subscription is simpler.

## Why Not Redux?

Redux is fine. But:
- Zustand has no boilerplate (no action types, no action creators, no reducers, no dispatch)
- Zustand stores are just hooks — `const pages = useDatabaseStore(s => s.pages)`
- No Provider wrapper needed
- The slice pattern gives us Redux-like modularity without Redux-like verbosity

## File Inventory

| File | Lines | Responsibility |
|---|---|---|
| `useDatabaseStore.ts` | ~350 | Compose slices, override methods, wire persistence |
| `slices/databaseSlice.ts` | ~200 | Databases, pages, properties, rows |
| `slices/pageSlice.ts` | ~150 | Page CRUD, block management |
| `slices/viewSlice.ts` | ~180 | View CRUD, filter/sort state |
| `slices/selectionSlice.ts` | ~80 | Active cell, selected rows |
| `slices/computedSlice.ts` | ~200 | Filtered/sorted/grouped pages (memoized) |
| `slices/storeHelpers.ts` | ~60 | Shared utilities used by all slices |
| `validation.ts` | ~230 | Property validation and coercion |
| `filterEngine.ts` | ~100 | Filter application to page arrays |

Total: ~1,550 lines across 9 files. Manageable, and each file has a clear single responsibility.

## Adding a New Slice

1. Create `slices/mySlice.ts`:
   ```ts
   export function createMySlice(set, get) {
     return { myField: [], myAction() { ... } };
   }
   ```
2. Add the type to `ExtendedDatabaseState`
3. Spread it in `useDatabaseStore.ts`:
   ```ts
   ...createMySlice(set, get),
   ```
4. Done. All components can now use `useDatabaseStore(s => s.myField)`.

## References

- [Zustand Documentation](https://zustand.docs.pmnd.rs/) — Official docs for the state management library, including the slice pattern and `create` API.
- [Zustand — GitHub Repository](https://github.com/pmndrs/zustand) — Source code and examples for composing stores from independent slices.
- [React — `useSyncExternalStore`](https://react.dev/reference/react/useSyncExternalStore) — The React primitive that Zustand uses internally for subscription-based state management.
