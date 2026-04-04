/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   workspace.service.ts                               :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 15:06:21 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 22:31:03 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { WorkspaceModel } from '../models/workspace.model';
import { WorkspaceMemberModel } from '../models/member.model';
import type { WorkspaceRole } from '@notion-db/types';

export class WorkspaceService {
  /**
   * Create a new workspace and add the creator as owner.
   */
  async create(name: string, ownerId: string): Promise<unknown> {
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
  async getById(workspaceId: string): Promise<unknown> {
    return WorkspaceModel.findById(workspaceId).lean();
  }

  /**
   * List all workspaces a user belongs to.
   */
  async listForUser(userId: string): Promise<unknown[]> {
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
    workspaceId: string,
    userId: string,
    role: WorkspaceRole = 'member',
    invitedBy?: string,
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
  async updateMemberRole(workspaceId: string, userId: string, role: WorkspaceRole): Promise<void> {
    await WorkspaceMemberModel.updateOne(
      { workspaceId, userId },
      { role },
    );
  }

  /**
   * Remove a member from a workspace.
   */
  async removeMember(workspaceId: string, userId: string): Promise<void> {
    await WorkspaceMemberModel.deleteOne({ workspaceId, userId });
  }

  /**
   * List all members of a workspace.
   */
  async listMembers(workspaceId: string) {
    return WorkspaceMemberModel.find({ workspaceId })
      .populate('userId', 'name email avatar')
      .lean();
  }
}
