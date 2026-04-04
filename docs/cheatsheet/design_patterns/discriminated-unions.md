# Discriminated Unions & Type Narrowing

## What's a Discriminated Union?

A type where each variant has a `type` (or `kind`) field that uniquely identifies it. TypeScript uses this field to narrow the type in `if`/`switch` blocks.

```ts
type Shape =
  | { type: 'circle'; radius: number }
  | { type: 'rect'; width: number; height: number };

function area(s: Shape): number {
  switch (s.type) {
    case 'circle': return Math.PI * s.radius ** 2;     // TS knows: s.radius exists
    case 'rect':   return s.width * s.height;           // TS knows: s.width, s.height exist
  }
}
```

If you add `| { type: 'triangle'; base: number; height: number }` to the union but forget to handle it in the switch, TypeScript will warn you (with `--noUncheckedIndexedAccess` or an exhaustive check).

## Where We Use This

### PropertyType (27 members)

```ts
type PropertyType =
  | 'title' | 'text' | 'number' | 'select' | 'multi_select'
  | 'date' | 'checkbox' | 'url' | 'email' | 'phone'
  | 'formula' | 'relation' | 'rollup' | 'status'
  | 'person' | 'files' | 'created_time' | 'last_edited_time'
  | 'created_by' | 'last_edited_by' | 'auto_increment'
  | 'button' | 'location' | 'verification' | 'unique_id'
  | 'custom_field';
```

Used in the cell renderer:
```tsx
switch (property.type) {
  case 'number':   return <NumberCell value={cell} />;
  case 'checkbox': return <CheckboxCell checked={!!cell} />;
  case 'date':     return <DateCell date={cell as string} />;
  case 'select':   return <SelectCell value={cell as string} options={property.options} />;
  // ... one case per type
}
```

### BlockType (35+ members)

```ts
type BlockType =
  | 'paragraph' | 'heading_1' | 'heading_2' | 'heading_3'
  | 'bulleted_list' | 'numbered_list' | 'to_do' | 'toggle'
  | 'code' | 'quote' | 'callout' | 'divider' | 'spacer'
  | 'image' | 'video' | 'audio' | 'file' | 'embed'
  | 'equation' | 'table' | 'table_row'
  | 'bookmark' | 'mermaid' | 'inline_database'
  // ...
```

### Panel Action Items

```ts
type PanelItem =
  | { type: 'action'; label: string; icon: string; onClick: () => void }
  | { type: 'toggle'; label: string; checked: boolean; onChange: (v: boolean) => void }
  | { type: 'link';   label: string; href: string }
  | { type: 'info';   label: string; value: string };
```

Each variant has different props. The `type` field tells the renderer which props exist:

```tsx
function renderItem(item: PanelItem) {
  switch (item.type) {
    case 'action': return <button onClick={item.onClick}>{item.label}</button>;
    case 'toggle': return <ToggleSwitch checked={item.checked} onChange={item.onChange} />;
    case 'link':   return <a href={item.href}>{item.label}</a>;
    case 'info':   return <span>{item.label}: {item.value}</span>;
  }
}
```

### WASM Value Type (Rust ↔ TypeScript)

In Rust:
```rust
#[derive(Serialize, Deserialize)]
#[serde(tag = "type", content = "value")]
pub enum JsonValue {
    Number(f64),
    Text(String),
    Boolean(bool),
    Date(String),
    Array(Vec<JsonValue>),
    Empty,
}
```

Serde's `tag + content` encoding produces JSON like:
```json
{ "type": "Number", "value": 42 }
{ "type": "Text", "value": "hello" }
{ "type": "Empty" }
```

On the TypeScript side:
```ts
type FormulaValue =
  | { type: 'Number'; value: number }
  | { type: 'Text'; value: string }
  | { type: 'Boolean'; value: boolean }
  | { type: 'Date'; value: string }
  | { type: 'Array'; value: FormulaValue[] }
  | { type: 'Empty' };
```

The Rust enum and the TypeScript union are structurally identical. The WASM boundary is type-safe because both sides agree on the shape.

### Filter AST Nodes

```ts
interface FilterNode {
  type: 'and' | 'or' | 'filter';
  filters?: FilterNode[];   // Children (for 'and' / 'or')
  field?: string;            // Leaf field name (for 'filter')
  operator?: FilterOperator; // Leaf operator (for 'filter')
  value?: unknown;           // Leaf value (for 'filter')
}
```

This recursive discriminated union enables nested filter groups:
```
AND
├── name contains "Alice"
├── OR
│   ├── age > 25
│   └── status = "active"
```

## The Exhaustiveness Trick

To ensure you handle all variants, use `never`:

```ts
function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${x}`);
}

switch (item.type) {
  case 'action': return ...;
  case 'toggle': return ...;
  case 'link':   return ...;
  case 'info':   return ...;
  default:       return assertNever(item);  // Compile error if a variant is missing
}
```

If you add a new variant to the union but forget to handle it, `item` won't narrow to `never` in the default case, and TypeScript will throw a compile error.

## When to Use This

- **Multiple variants with different shapes** → discriminated union
- **Multiple variants with the same shape** → just a string literal union (`type PropertyType = 'text' | 'number' | ...`)
- **Open-ended set of variants** → don't use a union; use a registry (see [view-registry.md](view-registry.md))

## References

- [TypeScript Handbook — Discriminated Unions](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions) — Official documentation on narrowing with discriminant properties and exhaustiveness checking via `never`.
- [TypeScript Handbook — Literal Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#literal-types) — How string literal types form the discriminant values in unions.
- [Total TypeScript — Discriminated Unions](https://www.totaltypescript.com/discriminated-unions-are-a-devs-best-friend) — Practical walkthrough of discriminated unions as a best practice for complex state modeling.
