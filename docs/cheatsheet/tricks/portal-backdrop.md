# Portal Backdrop Pattern

## The Problem

You have a floating panel — a cell editor, a dropdown, a date picker. The user clicks outside of it. You need to close it. How?

**The naive approach:**
```ts
document.addEventListener('click', (e) => {
  if (!panelRef.current?.contains(e.target)) close();
});
```

This is fragile:
- You need cleanup (`removeEventListener`)
- Events can propagate weirdly through portals
- Multiple overlapping panels fight over the same listener
- If the panel renders inside a React portal, `contains()` might not work as expected because the portal DOM is elsewhere

## The Backdrop Approach

Instead of listening for "clicks outside," render an invisible full-viewport element **behind** the panel. Clicking it = clicking outside.

```tsx
// PortalBackdrop.tsx
function PortalBackdrop({ onClose, zIndex }: { onClose: () => void; zIndex: number }) {
  return (
    <button
      onClick={onClose}
      aria-label="Close"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: zIndex - 1,        // One layer below the panel
        background: 'transparent',
        border: 'none',
        cursor: 'default',
      }}
    />
  );
}
```

Usage:
```tsx
{isOpen && (
  <>
    <PortalBackdrop onClose={close} zIndex={Z.CELL_EDITOR} />
    <div style={{ position: 'fixed', zIndex: Z.CELL_EDITOR, top, left }}>
      <CellEditor />
    </div>
  </>
)}
```

## Why a `<button>` and Not a `<div>`?

- A `<button>` is focusable and clickable by default — no `tabIndex` or `role` hacks
- Screen readers understand it as an actionable element
- The `aria-label="Close"` gives it meaning for accessibility

## Layering Multiple Panels

When panels stack (dropdown → sub-menu → date picker), each gets its own backdrop at its own z-index:

```
z: 9998  — cell editor backdrop
z: 9999  — cell editor
z: 10000 — date picker
z: 9999  — date picker backdrop (reuses CELL_EDITOR level? No — it
            uses PICKER - 1 = 9999... the Z system handles this)
```

Each backdrop closes only its own panel. Clicking the backdrop of the date picker closes the date picker but leaves the cell editor open.

## The `usePortalClose` Hook

For hooks that need this pattern:

```ts
export function usePortalClose(onClose: () => void) {
  // Handles Escape key + outside click via backdrop
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);
}
```

Combines with the backdrop for full coverage: Escape key + click-outside.

## Tradeoffs

**Pro:** Simpler, more reliable, works with React portals, no event propagation issues.

**Con:** An extra DOM element. On a page with 5 open panels, that's 5 invisible buttons in the DOM. This is negligible — a `<button>` with no content costs almost nothing to render.

## References

- [React — `createPortal`](https://react.dev/reference/react-dom/createPortal) — Official React docs on rendering children into a different part of the DOM.
- [MDN — `<button>`: The Button element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button) — Why `<button>` is the correct semantic choice for clickable interactive areas.
- [WAI-ARIA — Modal Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) — Accessibility best practices for modal overlays and backdrop interactions.
