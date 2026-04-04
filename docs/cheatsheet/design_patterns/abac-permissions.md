# ABAC Permission Engine

## What's ABAC?

Attribute-Based Access Control. Instead of simple roles ("admin", "viewer"), permissions are computed from attributes of the user, the resource, and the context.

In this project, it's used for the playground's multi-user system — determining what each user can do on each workspace, page, and block.

## The Permission Hierarchy

```ts
const PERMISSION_HIERARCHY = [
  'no_access',    // 0 — can't see it
  'can_view',     // 1 — read only
  'can_comment',  // 2 — read + comment
  'can_edit',     // 3 — read + write
  'full_access',  // 4 — read + write + manage permissions
];
```

Each level includes all the capabilities of the levels below it.

## Cascading Resolution

Permissions cascade from workspace → page → block. The most specific rule wins:

```ts
// abac/engine.ts
async resolveEffective(userId, workspaceId, pageId?, blockId?) {
  // Start with workspace-level default
  const wsRules = await this.getRules('workspace', workspaceId);
  let level = this.resolveFromRules(wsRules, userId);

  // Page-level override (if exists)
  if (pageId) {
    const pageRules = await this.getRules('page', pageId);
    level = this.mergeLevel(level, pageRules, userId);
  }

  // Block-level override (if exists)
  if (blockId) {
    const blockRules = await this.getRules('block', blockId);
    level = this.mergeLevel(level, blockRules, userId);
  }

  return level;
}
```

Example:
- Workspace rule: everyone gets `can_view`
- Page rule: Alice gets `can_edit`
- Block rule: Alice gets `no_access` on a specific block

Result for Alice on that block: `no_access` (most specific wins).

## Owner Shortcut

```ts
if (resource.ownerId === userId) return 'full_access';
```

The owner of a workspace/page always has full access. No rule evaluation needed. This check runs first and skips the entire cascade.

## Rule Resolution

```ts
// abac/resolver.ts
function resolvePermission(rules: AccessRule[], userId: string): Permission {
  // Find explicit rule for this user
  const explicit = rules.find(r => r.userId === userId);
  if (explicit) return explicit.permission;

  // Fall back to wildcard rule (applies to everyone)
  const wildcard = rules.find(r => r.userId === '*');
  if (wildcard) return wildcard.permission;

  // No rules → inherit from parent (handled by the cascade)
  return null;
}
```

Rules can target specific users or use `*` as a wildcard. User-specific rules take priority over wildcard rules.

## Materialized Cache

Computing permissions requires 1-3 database queries per check (workspace rules + optional page rules + optional block rules). For a page with 50 blocks, that's up to 150 queries.

The `EffectivePermissionModel` caches computed results:

```ts
// Cached result
{
  userId: "alice_id",
  resourceType: "page",
  resourceId: "page_123",
  permission: "can_edit",
  computedAt: "2024-01-15T10:00:00Z",
  expiresAt: "2024-01-15T10:05:00Z",  // 5-minute TTL
}
```

On subsequent checks, the cache is hit first. If the cached entry is fresh (within TTL), the permission is returned without re-computing.

### Cache Invalidation

When a rule changes (e.g., workspace owner updates permissions), the affected cached entries are deleted:

```ts
// When a workspace rule changes, invalidate all cached permissions for that workspace
await EffectivePermission.deleteMany({ resourceType: 'workspace', resourceId: workspaceId });
```

The 5-minute TTL provides a safety net — even if explicit invalidation misses something, stale entries expire automatically.

## How It Compares to RBAC

| | RBAC (Role-Based) | ABAC (Attribute-Based) |
|---|---|---|
| Model | User → Role → Permission | User + Resource + Context → Permission |
| Granularity | Per-role (all admins see everything) | Per-resource (Alice can edit page A but not page B) |
| Flexibility | Static roles | Dynamic rules, cascading overrides |
| Complexity | Simple | More moving parts |
| Example | "Alice is admin" → full access everywhere | "Alice has can_edit on this page" → only this page |

Notion uses ABAC because permissions are per-page. This project mirrors that model.

## Tradeoffs

- **Cache TTL (5 minutes):** A permission change takes up to 5 minutes to take effect for cached users. For a dev tool, this is fine. For a production system, you'd want WebSocket-based cache invalidation.
- **Rule count:** With many users and many pages, the rules table grows. Each page could have N user-specific rules. For this project's scale (3 users, <100 pages), it's not an issue.
- **Cascade depth:** We support 3 levels (workspace → page → block). Adding more (e.g., page → section → block) would require extending the resolver.

## References

- [NIST SP 800-162 — Guide to Attribute Based Access Control (ABAC)](https://csrc.nist.gov/publications/detail/sp/800-162/final) — The formal ABAC specification by Hu, Ferraiolo, and Kuhn that defines the attribute-based model used for permission cascading.
- [OWASP — Access Control Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Access_Control_Cheat_Sheet.html) — Security best practices for implementing access control in web applications.
- [MDN — HTTP Caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching) — Background on cache TTL strategies that informed the 5-minute materialized permission cache.
