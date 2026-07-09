/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   pageSliceTypes.ts                                  :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/02 14:39:14 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/05 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { Page, Block } from '../../types/database';

export interface PageSliceState {
  pages: Record<string, Page>;
  openPageId: string | null;
}

export interface PageSliceActions {
  addPage: (databaseId: string, properties?: Record<string, unknown>) => string;
  updatePageProperty: (pageId: string, propertyId: string, value: unknown) => void;
  deletePage: (pageId: string) => void;
  duplicatePage: (pageId: string) => void;
  updatePageContent: (pageId: string, content: Block[]) => void;
  /** Set page display meta (icon / cover). An undefined value clears the field. */
  updatePageMeta: (pageId: string, meta: { icon?: string; cover?: string }) => void;
  /** Create a template page (hidden from views). Returns its id. */
  addTemplatePage: (databaseId: string) => string;
  /** Instantiate a template into a real record. Returns the new page id. */
  createPageFromTemplate: (templateId: string) => string;
  changeBlockType: (pageId: string, blockId: string, newType: Block['type']) => void;
  insertBlock: (pageId: string, afterBlockId: string | null, block: Block) => void;
  deleteBlock: (pageId: string, blockId: string) => void;
  moveBlock: (pageId: string, blockId: string, targetIndex: number) => void;
  toggleBlockChecked: (pageId: string, blockId: string) => void;
  toggleBlockCollapsed: (pageId: string, blockId: string) => void;
  updateBlock: (pageId: string, blockId: string, updates: Partial<Block>) => void;
  openPage: (pageId: string | null) => void;
}

export type PageSlice = PageSliceState & PageSliceActions;
