# Contributing

Ground rules for working on this project. Read these before pushing anything.

## Setup

```bash
git clone <repo-url> && cd notion-database-sys
cp .env.example .env
pnpm install
make up
```

Check `README.md` for the full quick-start guide.

## Commit rules

### One logical change per commit

Each commit does one thing. Not two, not three. If you added a filter component and fixed an unrelated typo, that's two commits.

Good:
```
feat(views): add timeline zoom controls
fix(store): prevent double undo on rapid keypress
docs: add JSDoc to useBlockEditor hook
```

Bad:
```
update stuff
fix everything
big refactor + new feature + formatting
```

### Commit message format

```
<type>(<scope>): <short description>
```

Types: `feat`, `fix`, `refactor`, `docs`, `style`, `test`, `chore`, `perf`

Scope is optional but helpful. Use the directory or feature name: `views`, `store`, `api`, `playground`, `blocks`, `filters`, etc.

Keep the subject line under 72 characters. Use imperative mood ("add", not "added" or "adds").

### Examples

```
feat(calendar): render multi-day events across rows
fix(filterEngine): handle null dates in before/after operators
refactor(store): extract selection logic into selectionSlice
docs(hooks): add JSDoc to usePasteHandler
style: remove decorative separator comments
chore: bump vite to 6.2.1
```

## Branches

### One concern per branch

A branch addresses one issue, one feature, or one refactor. Don't mix concerns.

```
feat/timeline-zoom
fix/filter-null-dates
refactor/extract-selection-slice
docs/jsdoc-hooks
```

### Keep branches short-lived

Merge quickly. The longer a branch lives, the harder the rebase. Aim for branches that last hours or days, not weeks.

### Rebase before merging

```bash
git fetch origin
git rebase origin/main
# fix conflicts if any
git push --force-with-lease
```

## Code style

### No decorative comments

Just write the code. If you need to explain something, write a JSDoc block on the export.

### No prose blocks

Don't put architecture essays at the top of files. If it needs explaining, put it in a README or a JSDoc `@remarks` block.

### No restating comments

```ts
// bad — we can see it's a click handler
const handleClick = () => { ... }

// good — explains WHY, not WHAT
/** Closes the modal and discards unsaved block edits. */
const handleClose = () => { ... }
```

### JSDoc

Add JSDoc to exported functions, components, hooks, and non-obvious interfaces. Use imperative mood.

```ts
/** Computes the aggregated value for a rollup property. */
export function computeRollup(config: RollupConfig, rows: Row[]): CellValue { ... }

/**
 * Renders a kanban-style board view grouped by a select/status property.
 *
 * @param databaseId - Database to render
 * @param groupProperty - Property used for column grouping
 */
export function BoardView({ databaseId, groupProperty }: BoardViewProps) { ... }
```

Skip JSDoc on:
- Barrel re-exports (`export { Foo } from './Foo'`)
- Trivial one-line wrappers
- Internal helper functions that are self-explanatory

### 42 School header

Every `.ts` / `.tsx` file must have the 42 header at the top. Use the `42header` editor extension to insert it. If you create a new file, add the header before committing.

## Least-change principle

When fixing or refactoring, change the minimum amount of code needed. Don't "improve" unrelated code in the same commit. If you spot something that needs fixing elsewhere, make a separate commit or branch for it.

This keeps diffs readable and makes `git bisect` actually useful.

## File organization

- Components go in `src/components/` under the right subdirectory
- Hooks go in `src/hooks/`
- Store slices go in `src/store/slices/`
- Types go in `src/types/`
- Utilities go in `src/utils/`
- API routes go in `packages/api/src/routes/`
- Mongoose models go in `packages/core/src/models/`

Don't create new top-level directories without discussing it first.

## Testing changes

Before pushing:

```bash
pnpm lint            # TypeScript + ESLint
pnpm typecheck       # Full type check across all packages
pnpm dev:src         # Make sure the app actually runs
```

If you touched the API or playground:

```bash
pnpm dev:api         # API still starts?
pnpm dev:playground  # Playground still loads?
```

## Dependencies

Don't add dependencies without a good reason. If something can be done in 20 lines of code, do it in 20 lines of code.

When you do add one:
```bash
pnpm add <package>                    # root dependency
pnpm add <package> --filter=@notion-db/api   # scoped to a package
```

## Questions?

Read the READMEs first:
- [Root README](README.md) — project structure, make targets, env vars
- [src/README.md](src/README.md) — frontend architecture, views, DBMS switching
- [playground/README.md](playground/README.md) — multi-user sandbox setup
- [packages/README.md](packages/README.md) — backend packages, dependency graph
- [services/README.md](services/README.md) — Docker configs, credentials
