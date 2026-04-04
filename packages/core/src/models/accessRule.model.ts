// ─── AccessRule model — ABAC permission rules ───────────────────────────────

import { Schema, model, type Document } from 'mongoose';
import type { AccessRule } from '@notion-db/types';

export type AccessRuleDocument = Omit<AccessRule, '_id'> & Document;

const targetSchema = new Schema({
  type: { type: String, enum: ['user', 'role', 'workspace', 'public'], required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  role: String,
}, { _id: false });

const accessRuleSchema = new Schema({
  workspaceId: { type: Schema.Types.ObjectId, required: true, ref: 'Workspace', index: true },
  resourceId: { type: Schema.Types.ObjectId },
  resourceType: {
    type: String,
    enum: ['workspace', 'page', 'database', 'block'],
    required: true,
  },
  target: { type: targetSchema, required: true },
  permission: {
    type: String,
    enum: ['no_access', 'can_view', 'can_comment', 'can_edit', 'full_access'],
    required: true,
  },
  explicit: { type: Boolean, default: false },
}, { timestamps: true });

// Primary: all rules for a resource
accessRuleSchema.index({ workspaceId: 1, resourceId: 1, resourceType: 1 });
// Cascading lookup: workspace-level defaults
accessRuleSchema.index({ workspaceId: 1, resourceType: 1 }, { sparse: true });
// User-specific rules
accessRuleSchema.index({ 'target.userId': 1, workspaceId: 1 }, { sparse: true });

export const AccessRuleModel = model<AccessRuleDocument>('AccessRule', accessRuleSchema);
