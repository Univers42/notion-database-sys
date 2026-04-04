# Result Pattern — `{ ok, value }` over Exceptions

## The Problem

Property validation needs to report two things: "is this value valid?" and "what's the canonical form?"

For example, the user types `"42"` into a number cell. Is it valid? Yes. But the canonical value is `42` (number), not `"42"` (string).

If validation fails, we need a reason ("Not a valid number") to show in the UI.

## Exceptions Don't Work Here

```ts
// Don't do this
function validateNumber(value: unknown): number {
  const num = Number(value);
  if (Number.isNaN(num)) throw new Error('Not a valid number');
  return num;
}

// Caller
try {
  const canonical = validateNumber(input);
  updateCell(canonical);
} catch (e) {
  showError(e.message);
}
```

Problems:
1. **Control flow is invisible.** `validateNumber` might throw or might not. The caller has to remember to wrap it in try/catch.
2. **Performance.** Exceptions create stack traces. In a table with 500 cells being validated during a paste operation, that's 500 stack traces created and discarded. Not cheap.
3. **Composition is ugly.** Validating multiple fields means nested try/catch blocks.

## The Result Pattern

```ts
type ValidationResult =
  | { ok: true; value: PropertyValue }
  | { ok: false; reason: string };

function validateNumber(value: unknown): ValidationResult {
  const num = Number(value);
  if (Number.isNaN(num)) return { ok: false, reason: 'Not a valid number' };
  return { ok: true, value: num };
}
```

Caller:
```ts
const result = validateNumber(input);
if (result.ok) {
  updateCell(result.value);
} else {
  showError(result.reason);
}
```

## How We Use It

### Store-Level Validation

```ts
// validation.ts
const SYSTEM_PROPS = new Set(['created_time', 'last_edited_time', 'created_by', ...]);
const READONLY_TYPES = new Set(['formula', 'rollup', 'created_by', ...]);

export function validatePropertyUpdate(
  propName: string,
  value: unknown,
  propType: PropertyType,
): ValidationResult {
  // Early rejection — system/readonly properties can't be written
  if (SYSTEM_PROPS.has(propName)) return { ok: false, reason: 'System property' };
  if (READONLY_TYPES.has(propType)) return { ok: false, reason: 'Computed property' };

  // Type-specific validation + coercion
  switch (propType) {
    case 'number':   return validateNumber(value);
    case 'checkbox': return validateCheckbox(value);
    case 'date':     return validateDate(value);
    case 'select':   return validateSelect(value, options);
    case 'email':    return validateEmail(value);
    // ...
    default:         return { ok: true, value };  // Text and friends — accept as-is
  }
}
```

### In the Store Override

```ts
// useDatabaseStore.ts
updatePageProperty(pageId, propName, value) {
  const propType = get().getPropertyType(propName);
  const result = validatePropertyUpdate(propName, value, propType);

  if (!result.ok) {
    console.warn(`Validation failed: ${result.reason}`);
    return;  // Silently reject — the UI doesn't change
  }

  // Set the coerced value
  get().setPageProperty(pageId, propName, result.value);
  persistPageProperty(pageId, propName, result.value, get().activeSource);
}
```

### In the WASM Bridge

```ts
// bridge.ts — compile result from Rust
const json = wasm_compile(expr);
const result: CompileResult = JSON.parse(json);

if (result.ok) {
  formulaHandleCache.set(expr, result.handle);
  return result.handle;
} else {
  console.error('Formula compile error:', result.error);
  return -1;
}
```

Same pattern, different context. The Rust code returns `{ ok: true, handle: 42 }` or `{ ok: false, error: "Unexpected token" }`.

## Coercion Examples

The `value` in `{ ok: true, value }` isn't necessarily the same as the input:

| Input | Property Type | Output |
|---|---|---|
| `"42"` | number | `{ ok: true, value: 42 }` |
| `"yes"` | checkbox | `{ ok: true, value: true }` |
| `"2024-01-15"` | date | `{ ok: true, value: "2024-01-15T00:00:00.000Z" }` |
| `"Option A"` | select | `{ ok: true, value: "option_a_id" }` (resolved to option ID) |
| `"abc"` | number | `{ ok: false, reason: "Not a valid number" }` |

The validation layer doubles as a coercion layer. The store always receives canonical values.

## Tradeoffs

**Pro:**
- Explicit — the return type tells you failure is possible
- No stack trace overhead
- Easy to compose — chain validations with early returns
- The `reason` field can be displayed to users

**Con:**
- More verbose than `throw` — every caller needs the `if (result.ok)` check
- You need a discriminated union type (but that's a good thing — see [discriminated-unions.md](discriminated-unions.md))

## References

- [Rust `std::result` — `Result<T, E>`](https://doc.rust-lang.org/std/result/) — The Rust type that inspired the `{ ok, value } | { ok, reason }` pattern used in the store.
- [Scott Wlaschin — Railway Oriented Programming](https://fsharpforfunandprofit.com/posts/recipe-part2/) — The functional programming pattern of composing operations that can fail, which the Result pattern implements.
- [TypeScript Handbook — Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html) — How TypeScript narrows `result.ok === true` to give type-safe access to `value` or `reason`.
