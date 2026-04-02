/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   block.service.ts                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 15:05:55 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 15:05:57 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { BlockModel } from '../models/block.model';
import type { ObjectId, Block, BlockType } from '@notion-db/types';

export class BlockService {
  /**
   * Create a new block within a page.
   */
  async create(data: {
    pageId: ObjectId;
    workspaceId: ObjectId;
    parentBlockId?: ObjectId;
    type: BlockType;
    content?: string;
    order: string;
  }): Promise<unknown> {
    const block = await BlockModel.create({
      ...data,
      content: data.content ?? '',
    });
    return block.toObject();
  }

  /**
   * Get all blocks for a page, ordered.
   */
  async listByPage(pageId: ObjectId): Promise<unknown[]> {
    return BlockModel.find({
      pageId,
      archived: { $ne: true },
    })
      .sort({ order: 1 })
      .lean();
  }

  /**
   * Get child blocks of a parent block.
   */
  async listChildren(parentBlockId: ObjectId): Promise<unknown[]> {
    return BlockModel.find({
      parentBlockId,
      archived: { $ne: true },
    })
      .sort({ order: 1 })
      .lean();
  }

  /**
   * Update a block's content and/or type-specific fields.
   */
  async update(blockId: ObjectId, data: Partial<Block>): Promise<unknown> {
    const { _id, _pageId, _workspaceId, ...updateData } = data as Record<string, unknown>;
    return BlockModel.findByIdAndUpdate(blockId, { $set: updateData }, { new: true }).lean();
  }

  /**
   * Reorder a block by updating its fractional index.
   */
  async reorder(blockId: ObjectId, newOrder: string): Promise<void> {
    await BlockModel.updateOne({ _id: blockId }, { order: newOrder });
  }

  /**
   * Soft-delete a block and all its children.
   */
  async archive(blockId: ObjectId, archivedBy: ObjectId): Promise<void> {
    const now = new Date();
    // Archive the block itself
    await BlockModel.updateOne(
      { _id: blockId },
      { archived: true, archivedAt: now, archivedBy },
    );
    // Archive all descendant blocks (recursive via parentBlockId)
    await this.archiveDescendants(blockId, archivedBy, now);
  }

  private async archiveDescendants(parentId: ObjectId, archivedBy: ObjectId, now: Date): Promise<void> {
    const children = await BlockModel.find({ parentBlockId: parentId }).select('_id').lean();
    if (children.length === 0) return;

    const childIds = children.map((c) => c._id);
    await BlockModel.updateMany(
      { _id: { $in: childIds } },
      { archived: true, archivedAt: now, archivedBy },
    );

    // Recurse into each child's descendants
    for (const child of children) {
      await this.archiveDescendants(child._id.toString(), archivedBy, now);
    }
  }
}
