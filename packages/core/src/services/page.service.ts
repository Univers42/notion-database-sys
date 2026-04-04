/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   page.service.ts                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 15:06:05 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 22:31:03 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { PageModel } from '../models/page.model';

export class PageService {
  /**
   * Create a new page in a workspace, optionally in a database.
   */
  async create(data: {
    workspaceId: string;
    databaseId?: string;
    parentPageId?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    properties?: Record<string, any>;
    createdBy: string;
    icon?: string;
    cover?: string;
    title?: string;
    content?: unknown[];
  }): Promise<unknown> {
    const page = await PageModel.create({
      ...data,
      lastEditedBy: data.createdBy,
      properties: data.properties ?? {},
    });
    return page.toObject();
  }

  /**
   * Get a page by ID.
   */
  async getById(pageId: string): Promise<unknown> {
    return PageModel.findById(pageId).lean();
  }

  /**
   * List pages in a database within a workspace.
   */
  async listByDatabase(workspaceId: string, databaseId: string): Promise<unknown[]> {
    return PageModel.find({
      workspaceId,
      databaseId,
      archived: { $ne: true },
    }).lean();
  }

  /**
   * List top-level pages in a workspace (no parent database).
   */
  async listRootPages(workspaceId: string): Promise<unknown[]> {
    return PageModel.find({
      workspaceId,
      databaseId: null,
      parentPageId: null,
      archived: { $ne: true },
    }).lean();
  }

  /**
   * Update page properties (partial merge).
   */
  async updateProperties(
    pageId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    properties: Record<string, any>,
    editedBy: string,
  ): Promise<unknown> {
    const update: Record<string, unknown> = { lastEditedBy: editedBy };
    for (const [key, val] of Object.entries(properties)) {
      update[`properties.${key}`] = val;
    }
    return PageModel.findByIdAndUpdate(pageId, { $set: update }, { new: true }).lean();
  }

  /**
   * General page update — title, icon, cover, content.
   */
  async updatePage(
    pageId: string,
    data: { title?: string; icon?: string; cover?: string; content?: unknown[]; parentPageId?: string | null },
    editedBy: string,
  ): Promise<unknown> {
    const update: Record<string, unknown> = { lastEditedBy: editedBy };
    if (data.title !== undefined)        update.title        = data.title;
    if (data.icon !== undefined)         update.icon         = data.icon;
    if (data.cover !== undefined)        update.cover        = data.cover;
    if (data.content !== undefined)      update.content      = data.content;
    if (data.parentPageId !== undefined) update.parentPageId  = data.parentPageId;
    return PageModel.findByIdAndUpdate(pageId, { $set: update }, { new: true }).lean();
  }

  /**
   * List ALL pages in a workspace (root + children, for sidebar tree).
   */
  async listAllPages(workspaceId: string): Promise<unknown[]> {
    return PageModel.find({
      workspaceId,
      databaseId: null,
      archived: { $ne: true },
    }).lean();
  }

  /**
   * Soft-delete (archive) a page.
   */
  async archive(pageId: string, archivedBy: string): Promise<void> {
    await PageModel.updateOne(
      { _id: pageId },
      { archived: true, archivedAt: new Date(), archivedBy },
    );
  }

  /**
   * Restore an archived page.
   */
  async restore(pageId: string): Promise<void> {
    await PageModel.updateOne(
      { _id: pageId },
      { archived: false, $unset: { archivedAt: 1, archivedBy: 1 } },
    );
  }
}
