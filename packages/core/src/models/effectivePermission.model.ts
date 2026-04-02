/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   effectivePermission.model.ts                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 15:04:47 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 15:04:49 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { Schema, model, type Document } from 'mongoose';
import type { EffectivePermission } from '@notion-db/types';

export type EffectivePermissionDocument = Omit<EffectivePermission, '_id'> & Document;

const effectivePermissionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  workspaceId: { type: Schema.Types.ObjectId, required: true, ref: 'Workspace' },
  resourceId: { type: Schema.Types.ObjectId, required: true },
  resourceType: {
    type: String,
    enum: ['workspace', 'page', 'database', 'block'],
    required: true,
  },
  permission: {
    type: String,
    enum: ['no_access', 'can_view', 'can_comment', 'can_edit', 'full_access'],
    required: true,
  },
  computedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
});

// TTL index: auto garbage-collect expired entries
effectivePermissionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// Primary query: check permission for a user on a resource
effectivePermissionSchema.index({ userId: 1, resourceId: 1 }, { unique: true });
// Invalidation: drop all cached permissions for a resource when rules change
effectivePermissionSchema.index({ resourceId: 1 });

export const EffectivePermissionModel = model<EffectivePermissionDocument>(
  'EffectivePermission',
  effectivePermissionSchema,
);
