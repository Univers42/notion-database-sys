/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   workspace.service.ts                               :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 15:06:21 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 15:06:22 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { WorkspaceModel } from '../models/workspace.model';
import { WorkspaceMemberModel } from '../models/member.model';
import type { ObjectId, WorkspaceRole } from '@notion-db/types';

export class WorkspaceService {
  /**
   * Create a new workspace and add the creator as owner.
   */
  async create(name: string, ownerId: ObjectId): Promise<unknown> {
    const workspace = await WorkspaceModel.create({ name, ownerId });

    // Auto-add creator as owner member
    await WorkspaceMemberModel.create({
      workspaceId: workspace._id,
      userId: ownerId,
      role: 'owner',
      joinedAt: new Date(),
    });

    return workspace.toObject();
  }

  /**
   * Get workspace by ID.
   */
  async getById(workspaceId: ObjectId): Promise<unknown> {
    return WorkspaceModel.findById(workspaceId).lean();
  }

  /**
   * List all workspaces a user belongs to.
   */
  async listForUser(userId: ObjectId): Promise<unknown[]> {
    const memberships = await WorkspaceMemberModel.find({ userId })
      .select('workspaceId')
      .lean();
    const ids = memberships.map((m) => m.workspaceId);
    return WorkspaceModel.find({ _id: { $in: ids } }).lean();
  }

  /**
   * Add a member to a workspace.
   */
  async addMember(
    workspaceId: ObjectId,
    userId: ObjectId,
    role: WorkspaceRole = 'member',
    invitedBy?: ObjectId,
  ): Promise<void> {
    await WorkspaceMemberModel.create({
      workspaceId,
      userId,
      role,
      invitedBy,
      joinedAt: new Date(),
    });
  }

  /**
   * Update a member's role.
   */
  async updateMemberRole(workspaceId: ObjectId, userId: ObjectId, role: WorkspaceRole): Promise<void> {
    await WorkspaceMemberModel.updateOne(
      { workspaceId, userId },
      { role },
    );
  }

  /**
   * Remove a member from a workspace.
   */
  async removeMember(workspaceId: ObjectId, userId: ObjectId): Promise<void> {
    await WorkspaceMemberModel.deleteOne({ workspaceId, userId });
  }

  /**
   * List all members of a workspace.
   */
  async listMembers(workspaceId: ObjectId) {
    return WorkspaceMemberModel.find({ workspaceId })
      .populate('userId', 'name email avatar')
      .lean();
  }
}
