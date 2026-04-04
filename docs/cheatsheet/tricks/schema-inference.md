# Schema Inference from Raw Data

## The Problem

JSON and CSV files don't have a schema. A JSON file might contain:

```json
[
  { "name": "Alice", "age": 30, "active": true },
  { "name": "Bob", "score": 95.5 },
  { "name": "Charlie", "age": "unknown", "active": false }
]
```

What's the type of `age`? Record 1 says number, record 3 says string, record 2 doesn't have it. What about `score`? Only one record has it.

## The Inference Algorithm

```ts
export function inferSchema(records: DbRecord[]): DbFieldSchema[] {
  const fieldMap = new Map<string, { types: Set<FieldType>; hasNull: boolean }>();

  for (const record of records) {
    // Track types for each field that exists
    for (const [key, value] of Object.entries(record)) {
      let entry = fieldMap.get(key);
      if (!entry) {
        entry = { types: new Set(), hasNull: false };
        fieldMap.set(key, entry);
      }
      if (value == null) entry.hasNull = true;
      else entry.types.add(inferType(value));
    }

    // Fields missing from this record are nullable
    for (const [key, entry] of fieldMap) {
      if (!(key in record)) entry.hasNull = true;
    }
  }

  // Build schema: if a field has multiple types → 'unknown'
  return [...fieldMap.entries()].map(([name, { types, hasNull }]) => ({
    name,
    type: types.size === 1 ? [...types][0] : 'unknown',
    nullable: hasNull,
  }));
}
```

### Type Detection

```ts
function inferType(value: unknown): FieldType {
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'string') {
    if (isISODate(value)) return 'date';
    return 'text';
  }
  if (Array.isArray(value)) return 'array';
  return 'object';
}
```

## What Happens with Mixed Types

For the `age` field above:
- Record 1: `30` → number
- Record 3: `"unknown"` → text
- `types` set = `{ number, text }` → size > 1 → type = `unknown`

The adapter presents this as an `unknown` type. The UI renders it as plain text.

## Why Inference Instead of a Schema File

- **Zero config for new datasets.** Drop a JSON file, it just works.
- **Handles messy data.** Real-world JSON often has inconsistent types. Instead of crashing, we degrade gracefully to `unknown`.
- **Schema evolves with data.** Add a new field to your JSON? The schema updates on next load. No migration needed.

## Where It's Used

All four adapters call `inferSchema` when `getSchema()` is called:

```ts
// JsonDbAdapter.ts
async getSchema(entity: string): Promise<DbEntitySchema> {
  const records = await this.getRecords(entity);
  return { name: entity, fields: inferSchema(records) };
}
```

The PostgreSQL and MongoDB adapters also have native schema sources (column definitions, MongoDB validation rules) but fall back to inference for collections without explicit schemas.

## Tradeoffs

- **Full scan required.** Inference reads all records to determine types. For large files (10K+ rows), this takes a moment on first load. Cached after that.
- **Array/object detection is shallow.** `inferType` doesn't recurse into nested objects or array elements. If a field contains `[1, "a", true]`, it's typed as `array`, not `array<unknown>`.
- **Date detection is heuristic.** The `isISODate` check looks for ISO 8601 patterns. A string like `"2024-01-01"` is detected as a date, but `"January 1, 2024"` is not.

## References

- [MDN — `typeof` operator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof) — The JavaScript operator used as the first step in type detection.
- [JSON Schema Specification](https://json-schema.org/specification) — The formal specification for JSON type systems, which informed the property type model.
- [ISO 8601 — Date and Time Format](https://en.wikipedia.org/wiki/ISO_8601) — The date format standard used by the `isISODate` heuristic.
