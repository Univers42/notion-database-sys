/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   userViewOverride.model.ts                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 15:05:13 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 15:05:15 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { Schema, model, type Document } from 'mongoose';
import type { UserViewOverride } from '@notion-db/types';

export type UserViewOverrideDocument = Omit<UserViewOverride, '_id'> & Document;

const overrideSchema = new Schema({
  viewId: { type: Schema.Types.ObjectId, required: true, ref: 'ViewConfig', index: true },
  userId: { type: Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  workspaceId: { type: Schema.Types.ObjectId, required: true, ref: 'Workspace' },
  overrides: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });

// One override per user per view
overrideSchema.index({ viewId: 1, userId: 1 }, { unique: true });
// Fast lookup: all overrides for a user in a workspace
overrideSchema.index({ userId: 1, workspaceId: 1 });

export const UserViewOverrideModel = model<UserViewOverrideDocument>('UserViewOverride', overrideSchema);
