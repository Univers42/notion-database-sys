/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   member.model.ts                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 15:04:55 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 15:04:56 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { Schema, model, type Document } from 'mongoose';
import type { WorkspaceMember } from '@notion-db/types';

export type WorkspaceMemberDocument = WorkspaceMember & Document;

const memberSchema = new Schema({
  workspaceId: { type: Schema.Types.ObjectId, required: true, ref: 'Workspace', index: true },
  userId: { type: Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  role: {
    type: String,
    enum: ['owner', 'admin', 'member', 'guest'],
    default: 'member',
  },
  invitedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  joinedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// One membership per user per workspace
memberSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });
// Fast lookup: "which workspaces does this user belong to?"
memberSchema.index({ userId: 1, workspaceId: 1 });

export const WorkspaceMemberModel = model<WorkspaceMemberDocument>('WorkspaceMember', memberSchema);
