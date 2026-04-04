# Z-Index System & Panel Positioning

## The Problem

You have a dropdown. You have a modal. You have a cell editor inside the modal. You have a date picker inside the cell editor. Each one needs to sit on top of the previous one. Without a system, you end up googling "z-index 99999 not working" at 2am.

## The `Z` Constant

All z-index values live in one place: `src/utils/geometry.ts`.

```ts
export const Z = {
  DROPDOWN:      50,     // Regular dropdowns and small menus
  MODAL:         60,     // Page modals (side peek, center peek)
  PANEL:         70,     // Property config, relation/rollup editors
  CELL_EDITOR:   9999,   // Portal-based cell editors
  CELL_BACKDROP: 9998,   // Sits just below the cell editor
  PICKER:        10000,  // Formula/date picker
  PICKER_INNER:  10001,  // Dropdown inside a picker
  TOOLBAR:       10000,  // InlineToolbar over contentEditable
  SLASH_MENU:    9999,   // Slash command menu
} as const;
```

Rules:
1. **Never write a raw z-index number.** Always use `Z.SOMETHING`.
2. **If you need a new layer,** add it to `Z` and document what it's for.
3. **The `as const`** makes each value a literal type — TypeScript will catch if you accidentally use `Z.DORPDOWN` (typo).

Usage:
```tsx
<div style={{ zIndex: Z.MODAL }}>
  <PageModal />
</div>
```

## Panel Width Constants

Same file, same idea — centralize magic numbers:

```ts
export const PANEL_WIDTH = {
  NARROW:       280,   // Property config, rollup editor
  MEDIUM:       290,   // Relation editor
  SETTINGS:     290,   // View settings panel
  WIDE:         340,   // Relation cell editor (expanded)
  FORMULA:      920,   // Formula editor full panel
  RELATION_MAX: 560,   // Max width for relation cell editors
} as const;
```

## Viewport Clamping

Floating panels should never overflow the viewport. Two utility functions handle this:

### `clampPanelPosition(top, left, panelHeight, panelWidth)`

```ts
export function clampPanelPosition(
  top: number,
  left: number,
  panelHeight = 400,
  panelWidth = PANEL_WIDTH.NARROW,
): { top: number; left: number } {
  return {
    top:  Math.min(top,  window.innerHeight - panelHeight),
    left: Math.min(left, window.innerWidth  - panelWidth),
  };
}
```

If the panel would extend below the viewport, it gets pushed up. Same for the right edge.

### `positionBelowAnchor(anchorRect, panelWidth, gap)`

```ts
export function positionBelowAnchor(
  anchorRect: DOMRect,
  panelWidth = PANEL_WIDTH.NARROW,
  gap = 4,
): { top: number; left: number } {
  return clampPanelPosition(anchorRect.bottom + gap, anchorRect.left, 400, panelWidth);
}
```

Common pattern: you have a button, you want a panel below it.

```tsx
// In a component
const buttonRef = useRef<HTMLButtonElement>(null);
const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

function openPanel() {
  const rect = buttonRef.current!.getBoundingClientRect();
  setPos(positionBelowAnchor(rect, PANEL_WIDTH.NARROW));
}

// In JSX
{pos && (
  <div style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: Z.PANEL }}>
    <ConfigPanel />
  </div>
)}
```

## Why This Matters

Without `Z`:
- Developer A sets `z-index: 100` on their dropdown
- Developer B sets `z-index: 200` on their modal
- Developer C sets `z-index: 150` on a cell editor
- The cell editor appears above dropdowns but below modals — sometimes that's wrong
- Debugging requires grep-searching for z-index across the whole codebase

With `Z`:
- Every layer is named and documented
- The hierarchy is visible in one glance
- Adding a new layer means picking a number that makes sense relative to the others

## References

- [MDN — CSS `z-index`](https://developer.mozilla.org/en-US/docs/Web/CSS/z-index) — How `z-index` interacts with stacking contexts and positioned elements.
- [MDN — Understanding CSS Stacking Context](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_positioned_layout/Stacking_context) — Why certain CSS properties create new stacking contexts and how they nest.
