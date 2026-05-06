/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   view.model.ts                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 15:05:34 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 19:01:02 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { Schema, model, type Document } from 'mongoose';
import type { DomainViewConfig } from '@notion-db/types';

export type ViewConfigDocument = Omit<DomainViewConfig, '_id'> & Document;

const _filterConditionSchema = new Schema({
  type: { type: String, enum: ['condition'], required: true },
  id: { type: String, required: true },
  propertyId: { type: String, required: true },
  operator: { type: String, required: true },
  value: Schema.Types.Mixed,
}, { _id: false });

const _filterGroupSchema = new Schema({
  type: { type: String, enum: ['group'], required: true },
  id: { type: String, required: true },
  conjunction: { type: String, enum: ['and', 'or'], required: true },
  children: [Schema.Types.Mixed], // recursive — FilterNode[]
}, { _id: false });

const flatFilterSchema = new Schema({
  id: { type: String, required: true },
  propertyId: { type: String, required: true },
  operator: { type: String, required: true },
  value: Schema.Types.Mixed,
}, { _id: false });

const sortSchema = new Schema({
  id: { type: String, required: true },
  propertyId: { type: String, required: true },
  direction: { type: String, enum: ['asc', 'desc'], default: 'asc' },
}, { _id: false });

const groupingSchema = new Schema({
  propertyId: { type: String, required: true },
  hiddenGroups: [String],
  sort: { type: String, enum: ['alphabetical', 'manual'] },
}, { _id: false });

const subGroupingSchema = new Schema({
  propertyId: { type: String, required: true },
}, { _id: false });

const fieldConfigSchema = new Schema({
  propertyId: { type: String, required: true },
  visible: { type: Boolean, default: true },
  width: Number,
  order: { type: Number, required: true },
}, { _id: false });

const viewConfigSchema = new Schema({
  databaseId: { type: Schema.Types.ObjectId, required: true, ref: 'Page', index: true },
  workspaceId: { type: Schema.Types.ObjectId, required: true, ref: 'Workspace', index: true },
  createdBy: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  name: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: ['table', 'board', 'calendar', 'timeline', 'gallery', 'list', 'chart', 'feed', 'map', 'dashboard'],
    required: true,
  },

  filterTree: Schema.Types.Mixed,
  filters: { type: [flatFilterSchema], default: [] },
  filterConjunction: { type: String, enum: ['and', 'or'], default: 'and' },

  sorts: { type: [sortSchema], default: [] },
  grouping: groupingSchema,
  subGrouping: subGroupingSchema,
  visibleProperties: { type: [String], default: [] },
  fieldConfigs: { type: [fieldConfigSchema], default: [] },
  settings: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });

// Primary query: all views for a database
viewConfigSchema.index({ databaseId: 1, workspaceId: 1 });

export const ViewConfigModel = model<ViewConfigDocument>('ViewConfig', viewConfigSchema);
