# React Context Scoping for Multi-Instance Views

## The Problem

The app has one global Zustand store with one `activeViewId`. This works when you have one database view on screen. But what about inline databases?

In Notion, you can embed a database inside a page. That page might also be showing its own database. Now you have two database views on screen, each needing their own "active view" state.

If both read from `useDatabaseStore(s => s.activeViewId)`, they'll show the same view. Switching one switches both. That's broken.

## The Solution: Context Override

```ts
// store/scope/DatabaseScopeContext.ts
const DatabaseScopeCtx = createContext<string | null>(null);

export function DatabaseScopeProvider({ value, children }) {
  return (
    <DatabaseScopeCtx.Provider value={value}>
      {children}
    </DatabaseScopeCtx.Provider>
  );
}
```

```ts
// store/scope/useActiveViewId.ts
export function useActiveViewId(): string {
  const scopedViewId = useContext(DatabaseScopeCtx);
  const globalViewId = useDatabaseStore(s => s.activeViewId);
  return scopedViewId ?? globalViewId;
}
```

The rule is simple: **if there's a scope context above you, use it. Otherwise, fall back to the global store.**

## How It's Used

```tsx
// DatabaseView.tsx
function DatabaseView({ databaseId }: Props) {
  const viewId = useActiveViewId();  // Reads from context or global store
  const ViewComponent = VIEW_COMPONENTS[viewType];

  return (
    <ErrorBoundary>
      <ViewComponent />
    </ErrorBoundary>
  );
}

// PageContentEditor.tsx — rendering an inline database block
function InlineDatabaseBlock({ blockId, databaseId }: Props) {
  const inlineViewId = computeInlineViewId(blockId);

  return (
    <DatabaseScopeProvider value={inlineViewId}>
      <DatabaseView databaseId={databaseId} />
    </DatabaseScopeProvider>
  );
}
```

The `DatabaseScopeProvider` wraps the inline database with a scoped view ID. Everything inside that provider reads from context instead of the global store. The primary database (not wrapped) still reads from the global store.

## Why Not Multiple Stores?

You could create a separate `useDatabaseStore` for each inline database. But:

1. **Shared data.** Inline databases might reference the same pages as the parent database (via relations). Separate stores would duplicate this data.
2. **Store lifecycle.** You'd need to create and destroy stores as inline databases are added/removed. Zustand doesn't have a built-in instance mechanism.
3. **Complexity.** Components would need to know which store to read from — you'd end up with... a context to select the right store. We might as well use context directly for just the view ID.

## Why Not Props?

You could pass `viewId` as a prop down through every component:

```tsx
<TableView viewId={viewId} />
  <TableHeader viewId={viewId} />
    <HeaderCell viewId={viewId} />
      <FilterButton viewId={viewId} />
```

This is prop drilling. Context avoids it — any descendant can call `useActiveViewId()` without the parent chain knowing about it.

## The Pattern Generalized

This "context with global fallback" pattern works for any scoped override:

```ts
function useWithFallback<T>(context: Context<T | null>, fallback: () => T): T {
  const scoped = useContext(context);
  return scoped ?? fallback();
}
```

Use it when:
- You have a global singleton value in a store
- You need to support multiple instances on the same page
- The instances are rendered by different React subtrees (so props would require drilling)

## References

- [React — Passing Data Deeply with Context](https://react.dev/learn/passing-data-deeply-with-context) — Official guide on `createContext`, `useContext`, and the Provider pattern used for database scope injection.
- [React — `useContext`](https://react.dev/reference/react/useContext) — The hook that reads the closest `DatabaseScopeContext` provider in the tree.
- [Kent C. Dodds — How to use React Context effectively](https://kentcdodds.com/blog/how-to-use-react-context-effectively) — Patterns for combining context with default values and custom hooks.
