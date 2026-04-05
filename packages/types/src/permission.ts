/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   permission.ts                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 15:07:27 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 22:31:03 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { Timestamps } from './common.js';

/** Permission levels, ordered from least to most access */
export type PermissionLevel =
  | 'no_access'
  | 'can_view'
  | 'can_comment'
  | 'can_edit'
  | 'full_access';

/** Who the rule targets */
export type PermissionTarget =
  | { type: 'user'; userId: string }
  | { type: 'role'; role: string }
  | { type: 'workspace' }
  | { type: 'public' };

/**
 * Access rule — stored in the `access_rules` collection.
 * Cascading: page rules inherit from workspace unless overridden.
 */
export interface AccessRule extends Timestamps {
  _id: string;
  workspaceId: string;
  /** The page/block this rule applies to. null = workspace-level default */
  resourceId?: string;
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
  _id: string;
  userId: string;
  workspaceId: string;
  resourceId: string;
  resourceType: 'workspace' | 'page' | 'database' | 'block';
  permission: PermissionLevel;
  computedAt: string;
  /** TTL: auto-expires after 5 minutes, forcing recomputation */
  expiresAt: Date;
}
