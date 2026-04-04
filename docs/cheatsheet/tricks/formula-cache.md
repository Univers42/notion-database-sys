# Formula Cache — LRU with Composite Keys

## Two Cache Layers

The formula system has two caches at different levels:

### 1. WASM Compilation Cache (bridge.ts)

```ts
const formulaHandleCache = new Map<string, number>();

export async function compileFormula(expr: string): Promise<number> {
  const cached = formulaHandleCache.get(expr);
  if (cached !== undefined) return cached;

  const json = wasm_compile(expr);
  const result = JSON.parse(json);
  if (result.ok) {
    formulaHandleCache.set(expr, result.handle);
  }
  return result.handle;
}
```

Key: the formula expression string.
Value: a handle (integer) into the WASM module's internal chunk table.

This avoids re-lexing, re-parsing, and re-compiling the same expression. The WASM VM can execute a compiled chunk by handle without recompilation.

### 2. Evaluation Result Cache (formulaCache.ts)

```ts
const cache = new Map<string, unknown>();
const MAX_ENTRIES = 10_000;

function cacheKey(expr: string, pageId: string, updatedAt: string): string {
  return `${expr}::${pageId}::${updatedAt}`;
}
```

Key: `expression::pageId::updatedAt`
Value: the computed result

## Why `updatedAt` in the Key?

Formulas reference page properties. When a property changes, the formula result changes. But we don't have explicit invalidation — we don't track which properties each formula depends on.

Instead, we use the page's `updatedAt` timestamp as a proxy for "anything changed." If the page was modified, the timestamp changes, the cache key changes, the old entry becomes unreachable (and eventually evicted), and the formula is re-evaluated.

This is an optimistic approach: it may cache slightly longer than necessary (if a different property than the one the formula uses was modified), but it never returns stale results because `updatedAt` changes on every mutation.

## LRU Eviction

```ts
function evictOldest(): void {
  const toRemove = Math.floor(cache.size * 0.25);
  const iter = cache.keys();
  for (let i = 0; i < toRemove; i++) {
    cache.delete(iter.next().value);
  }
}
```

When the cache hits 10,000 entries, we evict the oldest 25%.

Why this works as LRU: JavaScript `Map` preserves insertion order. The first entries in the iterator are the ones inserted earliest — the least recently used. Deleting them makes room for new entries.

Why 25% and not 1 entry? Evicting one entry means every subsequent insertion triggers another eviction check. Evicting in bulk amortizes the cost: 2,500 entries removed → 2,500 insertions before the next eviction.

## When the Cache Helps Most

- **Table view with 500 rows and a formula column:** Without caching, scrolling triggers re-evaluation of every visible formula. With caching, only the first render computes; subsequent renders hit the cache.
- **Dashboard with multiple charts:** Each chart might reference the same formula column. The cache ensures evaluation happens once per page, shared across all consumers.
- **Rapid filter/sort changes:** Changing a filter re-renders the table, but page data hasn't changed — all formula results come from cache.

## When It Doesn't Help

- **First render after data load:** Cache is cold. Every formula evaluates fresh.
- **After a bulk edit:** All `updatedAt` timestamps change → all cache entries are invalidated.
- **Formulas referencing `now()`:** The result changes every render. These bypass caching (or should — the `updatedAt` key won't invalidate them, but the WASM VM evaluates `now()` fresh each time since it's a built-in function call, not a page property lookup).

## References

- [wasm-bindgen Guide — JS↔Wasm Interop](https://rustwasm.github.io/docs/wasm-bindgen/) — How the JS↔WASM bridge works and why handle caching avoids repeated serialization overhead.
- [MDN — `Map`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) — The data structure used for the LRU evaluation cache (composite keys, O(1) lookup).
- [Crafting Interpreters — A Bytecode Virtual Machine](https://craftinginterpreters.com/a-bytecode-virtual-machine.html) — Background on bytecode VMs and why compiled handles can be safely cached.
