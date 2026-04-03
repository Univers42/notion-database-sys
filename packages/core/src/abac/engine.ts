// ─── ABAC Engine — permission evaluation with materialized cache ────────────

import type { PermissionLevel, ObjectId } from '@notion-db/types';
import { AccessRuleModel } from '../models/accessRule.model';
import { EffectivePermissionModel } from '../models/effectivePermission.model';
import { WorkspaceMemberModel } from '../models/member.model';
import { resolvePermission } from './resolver';

/** Default TTL for cached permissions: 5 minutes */
const CACHE_TTL_MS = 5 * 60 * 1000;

export class AbacEngine {
  /**
   * Check if a user has at least `required` permission on a resource.
   * Uses materialized cache first — falls back to live computation.
   */
  async check(
    userId: ObjectId,
    workspaceId: ObjectId,
    resourceId: ObjectId,
    resourceType: 'workspace' | 'page' | 'database' | 'block',
    required: PermissionLevel,
  ): Promise<boolean> {
    const effective = await this.getEffective(userId, workspaceId, resourceId, resourceType);
    const hierarchy = ['no_access', 'can_view', 'can_comment', 'can_edit', 'full_access'];
    return hierarchy.indexOf(effective) >= hierarchy.indexOf(required);
  }

  /**
   * Get effective permission — cache-first with TTL fallback.
   */
  async getEffective(
    userId: ObjectId,
    workspaceId: ObjectId,
    resourceId: ObjectId,
    resourceType: 'workspace' | 'page' | 'database' | 'block',
  ): Promise<PermissionLevel> {
    // 1. Check materialized cache
    const cached = await EffectivePermissionModel.findOne({
      userId,
      resourceId,
    }).lean();

    if (cached && new Date(cached.expiresAt) > new Date()) {
      return cached.permission;
    }

    // 2. Compute from rules
    const permission = await this.compute(userId, workspaceId, resourceId, resourceType);

    // 3. Upsert into cache
    await EffectivePermissionModel.findOneAndUpdate(
      { userId, resourceId },
      {
        userId,
        workspaceId,
        resourceId,
        resourceType,
        permission,
        computedAt: new Date(),
        expiresAt: new Date(Date.now() + CACHE_TTL_MS),
      },
      { upsert: true, new: true },
    );

    return permission;
  }

  /**
   * Compute permission from access rules — cascading resolution.
   * Order: workspace defaults → page rules → block rules (most specific wins).
   */
  private async compute(
    userId: ObjectId,
    workspaceId: ObjectId,
    resourceId: ObjectId,
    resourceType: 'workspace' | 'page' | 'database' | 'block',
  ): Promise<PermissionLevel> {
    // Get the user's workspace role
    const member = await WorkspaceMemberModel.findOne({
      workspaceId,
      userId,
    }).lean();

    if (!member) return 'no_access';

    // Owners always have full access
    if (member.role === 'owner') return 'full_access';

    // Gather all applicable rules, ordered from general to specific
    const rules = await AccessRuleModel.find({
      workspaceId,
      $and: [
        { $or: [
          { resourceId: null, resourceType: 'workspace' },
          { resourceId },
        ] },
        { $or: [
          { 'target.type': 'workspace' },
          { 'target.type': 'role', 'target.role': member.role },
          { 'target.type': 'user', 'target.userId': userId },
          { 'target.type': 'public' },
        ] },
      ],
    })
      .sort({ resourceType: 1 }) // workspace < page < database < block
      .lean();

    if (rules.length === 0) {
      // No explicit rules — fall back to role-based defaults
      switch (member.role) {
        case 'admin': return 'full_access';
        case 'member': return 'can_edit';
        case 'guest': return 'can_view';
        default: return 'no_access';
      }
    }

    return resolvePermission(
      rules.map((r) => ({ permission: r.permission, explicit: r.explicit })),
    );
  }

  /**
   * Invalidate cached permissions for a resource — called when rules change.
   */
  async invalidate(resourceId: ObjectId): Promise<void> {
    await EffectivePermissionModel.deleteMany({ resourceId });
  }

  /**
   * Invalidate all cached permissions for a user in a workspace.
   */
  async invalidateUser(userId: ObjectId, workspaceId: ObjectId): Promise<void> {
    await EffectivePermissionModel.deleteMany({ userId, workspaceId });
  }
}
