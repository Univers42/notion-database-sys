/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   block.model.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 15:04:40 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 19:01:02 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// Blocks stored as standalone documents — avoids 16MB BSON limit.
// Tree structure via parentBlockId. Ordering via fractional index string.

import { Schema, model, type Document } from 'mongoose';
import type { DomainBlock } from '@notion-db/types';

export type BlockDocument = Omit<DomainBlock, '_id'> & Document;

const blockSchema = new Schema({
  pageId: { type: Schema.Types.ObjectId, required: true, ref: 'Page', index: true },
  workspaceId: { type: Schema.Types.ObjectId, required: true, ref: 'Workspace', index: true },
  parentBlockId: { type: Schema.Types.ObjectId, ref: 'Block' },
  type: { type: String, required: true },
  content: { type: String, default: '' },
  order: { type: String, required: true },

  // Type-specific optional fields
  checked: Boolean,
  language: String,
  color: String,
  url: String,
  caption: String,
  collapsed: Boolean,
  embedType: String,
  tableData: [[String]],
  databaseId: String,
  viewId: String,
  columns: [[String]],
  columnRatios: [Number],
  spacerHeight: Number,
  expression: String,
  syncedBlockId: String,

  // Soft-delete
  archived: { type: Boolean, default: false },
  archivedAt: Date,
  archivedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Primary query: all blocks for a page, ordered
blockSchema.index({ pageId: 1, order: 1 });
// Workspace-scoped queries (change streams, permissions)
blockSchema.index({ workspaceId: 1, pageId: 1 });
// Parent block traversal (for nested blocks / columns)
blockSchema.index({ parentBlockId: 1, order: 1 });
// Synced block lookup
blockSchema.index({ syncedBlockId: 1 }, { sparse: true });

export const BlockModel = model<BlockDocument>('Block', blockSchema);
