# ContentEditable Tricks

## The Problem

Rich text editing in the browser is pain. `contentEditable` is the only real option (besides Canvas-based editors), and it comes with a pile of footguns.

## Cursor Stability

The biggest one: if you set `innerHTML` during a React re-render, the browser resets the cursor to the start of the element. The user is typing mid-word and the cursor jumps to the beginning.

### The Fix: Skip Redundant Updates

```tsx
const lastContentRef = useRef(content);

useEffect(() => {
  if (ref.current && content !== lastContentRef.current) {
    ref.current.innerHTML = parseInlineMarkdown(content);
    lastContentRef.current = content;
  }
}, [content]);
```

The `lastContentRef` tracks what we last wrote to the DOM. If the `content` prop hasn't changed (maybe the parent re-rendered for an unrelated reason), we skip the `innerHTML` assignment entirely. Cursor stays where it is.

### When Content Actually Changes

When `content` does change (e.g., undo/redo restores a previous version), we intentionally reset `innerHTML`. The cursor position will be lost, but that's expected — the content is different now.

## CSS Placeholder (No Extra React Render)

```tsx
<div
  contentEditable
  data-placeholder="Type something..."
  className="empty:before:content-[attr(data-placeholder)] empty:before:text-ink-faint"
/>
```

Instead of:
```tsx
{isEmpty && <span className="placeholder">Type something...</span>}
```

The CSS approach:
1. No conditional JSX — no render cycle when the field goes empty/non-empty
2. The `:empty` pseudo-class handles it at the CSS level
3. `content-[attr(data-placeholder)]` reads the text from the data attribute — change the placeholder without touching the component

## Markdown Shortcuts

The block editor detects inline markdown prefixes and converts them to block types on the fly:

```ts
if (e.key === ' ') {
  const text = blockElement.textContent ?? '';
  if (text === '#')   { convertBlock(blockId, 'heading_1'); e.preventDefault(); }
  if (text === '##')  { convertBlock(blockId, 'heading_2'); e.preventDefault(); }
  if (text === '###') { convertBlock(blockId, 'heading_3'); e.preventDefault(); }
  if (text === '-')   { convertBlock(blockId, 'bulleted_list'); e.preventDefault(); }
  if (text === '1.')  { convertBlock(blockId, 'numbered_list'); e.preventDefault(); }
  if (text === '>')   { convertBlock(blockId, 'quote'); e.preventDefault(); }
  if (text === '[]')  { convertBlock(blockId, 'to_do'); e.preventDefault(); }
  if (text === '---') { convertBlock(blockId, 'divider'); e.preventDefault(); }
}
```

Type `# ` → heading. Type `- ` → bullet list. The prefix is consumed and the block type changes. This matches Notion's behavior exactly.

## Slash Command Menu Positioning

When the user types `/`, we need to open a menu at the cursor position:

```ts
if (e.key === '/' && textEndsWith(blockId, '/')) {
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setSlashMenuAnchor({ top: rect.bottom + 4, left: rect.left });
  }
}
```

`getRangeAt(0).getBoundingClientRect()` gives us the pixel position of the text cursor. The menu opens 4px below it.

## Block Navigation with Ref Registry

```ts
const blockRefs = useRef(new Map<string, HTMLElement>());

// Register a block's DOM element
function registerBlock(blockId: string, el: HTMLElement | null) {
  if (el) blockRefs.current.set(blockId, el);
  else blockRefs.current.delete(blockId);
}

// Navigate between blocks
function focusBlock(blockId: string) {
  const el = blockRefs.current.get(blockId);
  if (el) {
    el.focus();
    // Move cursor to end
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);  // false = collapse to end
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }
}
```

Why a `Map` instead of querying the DOM?
- `document.querySelector('[data-block-id="abc"]')` is O(n) on the DOM
- `blockRefs.current.get("abc")` is O(1)
- With 100+ blocks on a page, this matters for ArrowUp/ArrowDown navigation

## `requestAnimationFrame` for Post-Mutation Focus

```ts
function handleEnter(blockId: string) {
  const newId = addBlockAfter(blockId, 'text');
  requestAnimationFrame(() => focusBlock(newId));
}
```

Why `requestAnimationFrame`? The `addBlockAfter` call updates the Zustand store, which triggers a React re-render, which adds the new block to the DOM. But the DOM update is asynchronous — it hasn't happened yet when `addBlockAfter` returns. `requestAnimationFrame` waits for the next paint, by which point the new block exists in the DOM and can receive focus.

Without it: `focusBlock` would try to focus an element that doesn't exist yet.

## Tradeoffs

**Why contentEditable instead of a proper editor (ProseMirror, Slate)?**
- ProseMirror and Slate add 30-80KB to the bundle
- Our block editor is simpler than a full rich-text editor — each block is a separate contentEditable, not one giant document
- The per-block model means we don't need document-level schema enforcement
- Trade: we handle cursor management manually, which is more work but keeps the bundle small

## References

- [MDN — `HTMLElement.contentEditable`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/contentEditable) — The property that makes DOM elements user-editable.
- [MDN — Selection API](https://developer.mozilla.org/en-US/docs/Web/API/Selection) — How the browser exposes the user's text selection for programmatic cursor management.
- [MDN — `Document.createRange()`](https://developer.mozilla.org/en-US/docs/Web/API/Document/createRange) — Creating Range objects for precise cursor positioning after re-renders.
- [MDN — `inputmode`](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/inputmode) — Controlling virtual keyboard behavior for contentEditable elements on mobile.
