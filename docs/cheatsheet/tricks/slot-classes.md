# Slot-Based Class Composition

## The Problem

You build a `MenuRow` component with Tailwind classes. It looks great. Then someone needs to use it in a context where the padding is different, or the text color needs to change. What do you do?

**Option A — className prop:**
```tsx
<MenuRow className="px-4 py-2" />  // But now their px-4 fights with your px-3
```

The caller's `px-4` gets appended after your `px-3`, but Tailwind doesn't guarantee specificity order. Sometimes the default wins, sometimes the override wins. It depends on the CSS generation order. Unreliable.

**Option B — variant props:**
```tsx
<MenuRow size="large" color="danger" />
```

Works, but you end up with 47 variant props and a combinatorial explosion of styles. Every new use case requires a new prop.

**Option C — slots.** This is what we do.

## How It Works

Every styled sub-element of a component gets a named **slot**. The caller can inject extra classes into any slot:

```tsx
<MenuRow
  icon={<TrashIcon />}
  label="Delete"
  slots={{ root: "bg-red-50", icon: "text-red-600" }}
/>
```

The component merges the caller's classes after its defaults:

```tsx
// Inside MenuRow
const s = mergeSlots(DEFAULT_SLOTS, slots);
return (
  <button className={s.root}>
    <span className={s.icon}>{icon}</span>
    <span className={s.label}>{label}</span>
  </button>
);
```

## The Utilities

Two functions in `src/utils/cn.ts` power this:

### `cn()` — class name composer

```ts
export function cn(...classes: (string | undefined | null | false | 0)[]): string {
  return classes.filter(Boolean).join(' ');
}
```

Filters out falsy values, joins the rest with spaces. That's it. No dependency.

Usage:
```tsx
className={cn(
  "px-3 py-1 rounded",           // always applied
  danger && "text-red-500",       // conditional
  active && "bg-blue-100",        // conditional
  className,                       // external override
)}
```

### `mergeSlots()` — slot-level class merger

```ts
export function mergeSlots<K extends string>(
  defaults: Record<K, string>,
  overrides?: Partial<Record<K, string>>,
): Record<K, string> {
  if (!overrides) return defaults;
  const result = { ...defaults };
  for (const key of Object.keys(overrides) as K[]) {
    if (overrides[key]) {
      result[key] = cn(defaults[key], overrides[key]);
    }
  }
  return result;
}
```

It copies the defaults, then for each override key, concatenates the override classes after the default ones.

## Real Example: `SettingsRow`

```tsx
// Type definition — name every styled sub-element
type SettingsRowSlots = {
  root?: string;
  inner?: string;
  icon?: string;
  label?: string;
  valueWrap?: string;
  value?: string;
  chevron?: string;
};

// Component
function SettingsRow({ icon, label, value, onClick, slots = {} }: Props) {
  return (
    <button className={cn("w-full flex rounded-md hover:bg-hover-surface-soft3", slots.root)}>
      <div className={cn("flex items-center gap-0 w-full px-2 py-[6px]", slots.inner)}>
        <span className={cn("shrink-0 w-5 h-5 text-ink-secondary", slots.icon)}>
          {icon}
        </span>
        <span className={cn("flex-1 text-sm ml-2 truncate", slots.label)}>
          {label}
        </span>
        {value && (
          <span className={cn("text-sm text-ink-muted max-w-[120px]", slots.value)}>
            {value}
          </span>
        )}
      </div>
    </button>
  );
}

// Usage — override just what you need
<SettingsRow
  icon={<GearIcon />}
  label="Layout"
  value="Board"
  slots={{ root: "border-b border-border-soft", label: "font-medium" }}
/>
```

The caller didn't need to know the default padding, the text size, or the hover color. They just added a border and bolded the label. Everything else stays as-is.

## Why Not `tailwind-merge`?

`tailwind-merge` is a library that intelligently resolves Tailwind class conflicts (e.g., `px-3 px-4` → `px-4`). We don't use it because:

1. **It's 8KB gzipped.** Our `cn()` is ~50 bytes.
2. **We don't need conflict resolution.** With slots, defaults and overrides target different concerns. You rarely need to override the same utility — you're adding, not replacing.
3. **When you do need to replace,** you know what you're doing and can use `!important` or restructure the slot.

## When to Add Slots

- The component is used in 3+ places with different styling needs
- The component has distinct visual sub-elements (icon, label, value, container)
- You find yourself passing `className` and targeting children with descendant selectors

When NOT to bother:
- Single-use components
- Components with 1-2 elements (just use `className`)
- Pure layout wrappers

## References

- [clsx — A tiny utility for constructing `className` strings conditionally](https://github.com/lukeed/clsx) — The 239-byte className builder used through the project.
- [tailwind-merge — Merge Tailwind CSS classes without style conflicts](https://github.com/dcastil/tailwind-merge) — Resolves conflicting Tailwind utility classes intelligently.
- [Tailwind CSS — Reusing Styles](https://tailwindcss.com/docs/reusing-styles) — Official guidance on composing utility classes in components.
