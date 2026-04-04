# Snapshot-Based Undo/Redo

## How It Works

Every time the user mutates a page, we take a full snapshot of that page's state and push it onto an undo stack. Undo pops the most recent snapshot and restores it. Redo is the inverse.

### Core Data Structures

```ts
const undoStack = useRef<PageSnapshot[]>([]);
const redoStack = useRef<PageSnapshot[]>([]);
const isProgrammatic = useRef(false);
const debounceTimer = useRef<number | null>(null);
```

### Subscription + Debounced Snapshotting

```ts
useEffect(() => {
  const unsub = useDatabaseStore.subscribe((state) => {
    // Don't snapshot when we're the ones mutating (undo/redo in progress)
    if (isProgrammatic.current) return;

    clearTimeout(debounceTimer.current!);
    debounceTimer.current = setTimeout(() => {
      const snapshot = structuredClone(state.pages[pageId]);
      if (undoStack.current.length >= 100) undoStack.current.shift();
      undoStack.current.push(snapshot);
      redoStack.current = [];  // New mutation clears redo history
    }, 300);
  });
  return unsub;
}, [pageId]);
```

### Undo

```ts
function undo() {
  if (!undoStack.current.length) return;
  isProgrammatic.current = true;

  const current = structuredClone(get().pages[pageId]);
  redoStack.current.push(current);

  const prev = undoStack.current.pop()!;
  set({ pages: { ...get().pages, [pageId]: prev } });

  isProgrammatic.current = false;
}
```

## Key Decisions

### Why `structuredClone`?

Before:
```ts
const snapshot = JSON.parse(JSON.stringify(state));  // Loses undefined, breaks Date
```

After:
```ts
const snapshot = structuredClone(state);  // Handles undefined, Date, RegExp, Map, Set...
```

`structuredClone` is a browser API (available since 2022). It produces true deep copies without the limitations of JSON serialization. It's also slightly faster for large objects.

### Why debounce at 300ms?

Typing "Hello" produces 5 state changes in ~400ms. Without debounce, that's 5 undo entries — pressing Ctrl+Z would undo one letter at a time.

With 300ms debounce, the entire word "Hello" becomes one undo entry. The user presses Ctrl+Z and the whole word disappears. This matches the behavior of every text editor.

### Why `isProgrammatic`?

When `undo()` runs, it calls `set()`, which triggers the store subscription, which would create a new snapshot of the restored state, which would push it onto the undo stack. Infinite loop.

The `isProgrammatic` flag breaks the cycle: during undo/redo, the subscription callback exits early.

### Why max 100 entries?

Memory bound. Each snapshot is a deep clone of a page (properties, rows, blocks). With 100 entries and large pages (~50KB each), the undo stack uses ~5MB max. That's fine for a browser tab.

When the stack is full, `shift()` drops the oldest entry (FIFO eviction).

### Why `useRef` instead of `useState`?

The undo/redo stacks don't affect rendering. They're internal bookkeeping. Using `useState` would trigger a re-render every time a snapshot is pushed — completely unnecessary since the stacks aren't displayed anywhere.

## Keyboard Binding

```ts
function handleKeyDown(e: KeyboardEvent) {
  // Only capture when focus is inside the block editor
  if (!document.activeElement?.closest('[data-block-editor]')) return;

  if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
    e.preventDefault();
    if (e.shiftKey) redo();
    else undo();
  }
}
```

The `closest('[data-block-editor]')` check ensures Ctrl+Z only triggers inside the block editor, not in unrelated inputs (search bar, filter inputs, etc.).

## Tradeoffs

**Snapshot vs. command pattern:**

The command pattern (store each mutation as a reversible operation) uses much less memory but is much harder to implement correctly — every mutation needs an explicit inverse, and compound operations need transaction grouping.

Snapshots are dumb but reliable. You clone the state, you restore the state. No edge cases. The memory cost is acceptable for page-sized data.

## References

- [MDN — `structuredClone()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/structuredClone) — The deep-clone API used for creating undo snapshots (structured clone algorithm).
- [Refactoring Guru — Command Pattern](https://refactoring.guru/design-patterns/command) — The alternative command-based undo approach and why snapshot-based undo was chosen instead.
- [Zustand — Middleware](https://zustand.docs.pmnd.rs/guides/typescript#middleware-that-changes-the-store-type) — How Zustand middleware can intercept state changes for undo/redo integration.
