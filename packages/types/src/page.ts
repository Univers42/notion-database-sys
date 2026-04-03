// ─── Page — container for blocks and database rows ──────────────────────────

import type { ObjectId, ISODateString, Timestamps, SoftDeletable, PropertyValue } from './common';
import type { Block } from './block';

/**
 * Page document — stored in the `pages` collection.
 * A page is always scoped to a workspace and optionally to a parent database.
 * `content` is kept for backward compatibility with the frontend but new
 * blocks should be stored in the `blocks` collection with `pageId` references.
 */
export interface Page extends Timestamps, SoftDeletable {
  _id: ObjectId;
  workspaceId: ObjectId;
  databaseId?: ObjectId;
  parentPageId?: ObjectId;
  title?: string;
  icon?: string;
  cover?: string;
  properties: Record<string, PropertyValue>;
  /** @deprecated Use blocks collection instead — kept for migration compat */
  content?: Block[];
  createdBy: ObjectId;
  lastEditedBy: ObjectId;
}

/**
 * PageTemplate — reusable template for new pages within a database
 */
export interface PageTemplate {
  _id: ObjectId;
  databaseId: ObjectId;
  workspaceId: ObjectId;
  name: string;
  icon?: string;
  defaultProperties: Record<string, PropertyValue>;
  defaultContent: Block[];
  createdAt: ISODateString;
}
