// ─── Workspace model ────────────────────────────────────────────────────────

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
  ownerId: { type: Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  plan: {
    type: String,
    enum: ['free', 'plus', 'business', 'enterprise'],
    default: 'free',
  },
  settings: { type: workspaceSettingsSchema, default: () => ({}) },
  domain: { type: String, sparse: true, unique: true, lowercase: true, trim: true },
}, { timestamps: true });

workspaceSchema.index({ ownerId: 1 });
workspaceSchema.index({ domain: 1 }, { sparse: true, unique: true });

export const WorkspaceModel = model<WorkspaceDocument>('Workspace', workspaceSchema);
