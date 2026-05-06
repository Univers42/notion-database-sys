/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   page.model.ts                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 15:05:01 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 19:01:01 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { Schema, model, type Document } from 'mongoose';
import type { DomainPage } from '@notion-db/types';

export type PageDocument = Omit<DomainPage, '_id'> & Document;

const pageSchema = new Schema({
  workspaceId: { type: Schema.Types.ObjectId, required: true, ref: 'Workspace', index: true },
  databaseId: { type: Schema.Types.ObjectId, ref: 'Page', index: true },
  parentPageId: { type: Schema.Types.ObjectId, ref: 'Page' },
  title: { type: String, default: '' },
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
