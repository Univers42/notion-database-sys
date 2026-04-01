// ═══════════════════════════════════════════════════════════════════════════════
// Formula result cache — LRU-style cache for WASM formula evaluations
// ═══════════════════════════════════════════════════════════════════════════════

const formulaCache = new Map<string, unknown>();
const FORMULA_CACHE_MAX = 10_000;

function buildKey(expression: string, pageId: string, updatedAt: string): string {
  return `${expression}::${pageId}::${updatedAt}`;
}

export function getCachedFormula(expression: string, pageId: string, updatedAt: string): unknown | undefined {
  return formulaCache.get(buildKey(expression, pageId, updatedAt));
}

export function setCachedFormula(expression: string, pageId: string, updatedAt: string, value: unknown): void {
  if (formulaCache.size >= FORMULA_CACHE_MAX) {
    evictOldest();
  }
  formulaCache.set(buildKey(expression, pageId, updatedAt), value);
}

/** Evict the oldest 25% of entries. */
function evictOldest(): void {
  const keys = formulaCache.keys();
  const evictCount = FORMULA_CACHE_MAX / 4;
  for (let i = 0; i < evictCount; i++) {
    const k = keys.next();
    if (k.done) break;
    formulaCache.delete(k.value);
  }
}
