// ─── Block — atomic content unit ─────────────────────────────────────────────
// Blocks are stored as a standalone collection (not embedded in pages)
// to avoid the 16MB BSON document limit on large databases.

import type { ObjectId, Timestamps, SoftDeletable } from './common';

export type BlockType =
  | 'paragraph'
  | 'heading_1'
  | 'heading_2'
  | 'heading_3'
  | 'heading_4'
  | 'heading_5'
  | 'heading_6'
  | 'bulleted_list'
  | 'numbered_list'
  | 'to_do'
  | 'toggle'
  | 'code'
  | 'quote'
  | 'callout'
  | 'divider'
  | 'image'
  | 'video'
  | 'audio'
  | 'file'
  | 'bookmark'
  | 'page'
  | 'link_to_page'
  | 'table_block'
  | 'column'
  | 'table_of_contents'
  | 'equation'
  | 'spacer'
  | 'embed'
  | 'breadcrumb'
  | 'synced_block'
  | 'table_view'
  | 'board_view'
  | 'gallery_view'
  | 'list_view'
  | 'database_inline'
  | 'database_full_page';

/**
 * Block document — stored in the `blocks` collection.
 * Parent reference via `pageId` + `parentBlockId` enables tree traversal.
 * `order` is a fractional index (e.g. "a0", "a1") for efficient reordering.
 */
export interface Block extends Timestamps, SoftDeletable {
  _id: ObjectId;
  pageId: ObjectId;
  workspaceId: ObjectId;
  parentBlockId?: ObjectId;
  type: BlockType;
  content: string;
  order: string;

  // Type-specific fields
  checked?: boolean;
  language?: string;
  color?: string;
  url?: string;
  caption?: string;
  collapsed?: boolean;
  embedType?: string;
  tableData?: string[][];
  databaseId?: string;
  viewId?: string;
  columns?: string[][]; // block ID arrays for columns
  columnRatios?: number[];
  spacerHeight?: number;
  expression?: string;
  syncedBlockId?: string;
}
