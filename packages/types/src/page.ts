/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   page.ts                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 15:07:23 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 22:31:03 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { Timestamps, SoftDeletable } from './common';
import type { Block } from './block';

/**
 * Page document — stored in the `pages` collection.
 * A page is always scoped to a workspace and optionally to a parent database.
 * `content` is kept for backward compatibility with the frontend but new
 * blocks should be stored in the `blocks` collection with `pageId` references.
 */
export interface Page extends Timestamps, SoftDeletable {
  _id: string;
  workspaceId: string;
  databaseId?: string;
  parentPageId?: string;
  title?: string;
  icon?: string;
  cover?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  properties: Record<string, any>;
  /** @deprecated Use blocks collection instead — kept for migration compat */
  content?: Block[];
  createdBy: string;
  lastEditedBy: string;
}

/**
 * PageTemplate — reusable template for new pages within a database
 */
export interface PageTemplate {
  _id: string;
  databaseId: string;
  workspaceId: string;
  name: string;
  icon?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  defaultProperties: Record<string, any>;
  defaultContent: Block[];
  createdAt: string;
}
