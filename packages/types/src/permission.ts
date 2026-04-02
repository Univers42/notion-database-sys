/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   permission.ts                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 15:07:27 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 15:07:28 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { ObjectId, Timestamps } from './common';

/** Permission levels, ordered from least to most access */
export type PermissionLevel =
  | 'no_access'
  | 'can_view'
  | 'can_comment'
  | 'can_edit'
  | 'full_access';

/** Who the rule targets */
export type PermissionTarget =
  | { type: 'user'; userId: ObjectId }
  | { type: 'role'; role: string }
  | { type: 'workspace' }
  | { type: 'public' };

/**
 * Access rule — stored in the `access_rules` collection.
 * Cascading: page rules inherit from workspace unless overridden.
 */
export interface AccessRule extends Timestamps {
  _id: ObjectId;
  workspaceId: ObjectId;
  /** The page/block this rule applies to. null = workspace-level default */
  resourceId?: ObjectId;
  resourceType: 'workspace' | 'page' | 'database' | 'block';
  target: PermissionTarget;
  permission: PermissionLevel;
  /** If true, this rule overrides any inherited rule (explicit deny/grant) */
  explicit: boolean;
}

/**
 * Materialized effective permission — cached in a TTL collection.
 * Pre-computed for fast authorization checks. Refreshed on access rule changes.
 */
export interface EffectivePermission {
  _id: ObjectId;
  userId: ObjectId;
  workspaceId: ObjectId;
  resourceId: ObjectId;
  resourceType: 'workspace' | 'page' | 'database' | 'block';
  permission: PermissionLevel;
  computedAt: string;
  /** TTL: auto-expires after 5 minutes, forcing recomputation */
  expiresAt: Date;
}
