// ─── Page model ─────────────────────────────────────────────────────────────

import { Schema, model, type Document } from 'mongoose';
import type { Page } from '@notion-db/types';

export type PageDocument = Omit<Page, '_id'> & Document;

const pageSchema = new Schema({
  workspaceId: { type: Schema.Types.ObjectId, required: true, ref: 'Workspace', index: true },
  databaseId: { type: Schema.Types.ObjectId, ref: 'Page', index: true },
  parentPageId: { type: Schema.Types.ObjectId, ref: 'Page' },
  icon: String,
  cover: String,
  properties: { type: Schema.Types.Mixed, default: {} },
  content: { type: [Schema.Types.Mixed], default: undefined },
  createdBy: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  lastEditedBy: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  archived: { type: Boolean, default: false },
  archivedAt: Date,
  archivedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Primary query: all pages in a database within a workspace
pageSchema.index({ workspaceId: 1, databaseId: 1 });
// Page tree traversal
pageSchema.index({ parentPageId: 1 });
// Archive filter
pageSchema.index({ workspaceId: 1, archived: 1 });
// Wildcard index for querying arbitrary property fields
pageSchema.index({ 'properties.$**': 1 });

export const PageModel = model<PageDocument>('Page', pageSchema);
