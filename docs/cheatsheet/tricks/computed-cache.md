# Computed State Cache in Zustand

## The Problem

The table view renders filtered, sorted, grouped pages. Computing this from raw data involves:

1. Filtering (evaluate every filter condition against every page)
2. Sorting (compare pairs of pages by property values)
3. Grouping (bucket pages by a property)
4. Formula evaluation (run WASM formulas for formula columns)

On a 500-row database with 3 filters, 2 sorts, and a formula column, this takes ~5ms. That's fine once, but Zustand re-runs selectors on every state change — even if the change is unrelated (like selecting a different cell).

## The Fix: Manual Reference-Equality Cache

```ts
// computedSlice.ts — module-level cache (outside the store)
let pagesForViewCache = {
  pages: null as Page[] | null,
  views: null as ViewConfig[] | null,
  searchQuery: null as string | null,
  results: new Map<string, Page[]>(),
};

function getPagesForView(viewId: string): Page[] {
  const { pages, views, searchQuery } = get();

  // Check if inputs changed by reference
  if (
    pages === pagesForViewCache.pages &&
    views === pagesForViewCache.views &&
    searchQuery === pagesForViewCache.searchQuery &&
    pagesForViewCache.results.has(viewId)
  ) {
    return pagesForViewCache.results.get(viewId)!;
  }

  // Inputs changed — recompute
  const view = views.find(v => v.id === viewId);
  const filtered = applyFilters(pages, view.filters);
  const sorted = applySorts(filtered, view.sorts);

  // Update cache
  pagesForViewCache = { pages, views, searchQuery, results: new Map() };
  pagesForViewCache.results.set(viewId, sorted);

  return sorted;
}
```

## Why This Works

Zustand stores are immutable-update based. When you call `set({ pages: newPages })`, the `pages` reference changes. When you call `set({ selectedCell: "abc" })`, the `pages` reference stays the same.

By comparing references (`pages === cached.pages`), we detect whether the inputs to the computation actually changed. If they didn't, we skip the expensive work and return the cached result.

## Why Not `useMemo`?

```tsx
// This doesn't work well
const filtered = useMemo(() => applyFilters(pages, filters), [pages, filters]);
```

Problems:
1. `useMemo` is per-component. If 3 components need the same filtered pages, the work runs 3 times.
2. `useMemo` dependency arrays use `Object.is` comparison, which works for references but doesn't help with deep equality.
3. The cache is per-render — navigating away and back recalculates everything.

The module-level cache is shared across all components and persists across re-renders.

## Why Not a Selector Library (like Reselect)?

We could use Reselect's `createSelector` with memoization. But:
1. It's another dependency
2. Our cache needs per-viewId results (a `Map`), which Reselect doesn't handle natively
3. The manual approach is ~20 lines and does exactly what we need

## The Per-View Map

```ts
results: new Map<string, Page[]>(),
```

A database can have multiple views (Table, Board, Calendar). Each view has different filters/sorts. The Map stores one result per `viewId`.

When the inputs change (a page is edited), the entire Map is cleared:
```ts
pagesForViewCache = { pages, views, searchQuery, results: new Map() };
```

This is intentional — when pages change, all views need recomputation. The first view to call `getPagesForView` recomputes; subsequent views compute lazily on access.

## Tradeoffs

- **Memory:** We keep one copy of filtered pages per view. With 500 pages × 3 views = 1,500 page references. These are references to the same page objects, not deep copies, so the overhead is just the array allocation.
- **Staleness:** The cache can't go stale because it's invalidated by reference comparison on every access. If the inputs haven't changes, the result is guaranteed correct.
- **Thread safety:** Not a concern — JavaScript is single-threaded. No concurrent access to the cache.

## References

- [Zustand Documentation](https://zustand.docs.pmnd.rs/) — The state management library whose selector model drives the reference-equality cache invalidation.
- [React — `useMemo`](https://react.dev/reference/react/useMemo) — The React hook equivalent of computed caching; the module-level cache serves the same purpose but outside React's lifecycle.
- [MDN — Equality comparisons and sameness](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Equality_comparisons_and_sameness) — Why `===` (strict equality / reference comparison) is sufficient for cache invalidation with immutable state.
