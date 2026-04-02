/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   workspace.model.ts                                 :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 15:05:40 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 15:05:41 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { Schema, model, type Document } from 'mongoose';
import type { Workspace } from '@notion-db/types';

export type WorkspaceDocument = Workspace & Document;

const workspaceSettingsSchema = new Schema({
  defaultPermission: {
    type: String,
    enum: ['full_access', 'can_edit', 'can_comment', 'can_view'],
    default: 'can_edit',
  },
  allowPublicPages: { type: Boolean, default: false },
  allowGuestAccess: { type: Boolean, default: false },
  defaultPageIcon: String,
  timezone: String,
}, { _id: false });

const workspaceSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  icon: String,
  ownerId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  plan: {
    type: String,
    enum: ['free', 'plus', 'business', 'enterprise'],
    default: 'free',
  },
  settings: { type: workspaceSettingsSchema, default: () => ({}) },
  domain: { type: String, lowercase: true, trim: true },
}, { timestamps: true });

workspaceSchema.index({ ownerId: 1 });
workspaceSchema.index({ domain: 1 }, { sparse: true, unique: true });

export const WorkspaceModel = model<WorkspaceDocument>('Workspace', workspaceSchema);
