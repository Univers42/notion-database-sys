// ─── PageService — page CRUD within a workspace/database ────────────────────

import { PageModel } from '../models/page.model';
import type { ObjectId, Page, PropertyValue } from '@notion-db/types';

export class PageService {
  /**
   * Create a new page in a workspace, optionally in a database.
   */
  async create(data: {
    workspaceId: ObjectId;
    databaseId?: ObjectId;
    parentPageId?: ObjectId;
    properties?: Record<string, PropertyValue>;
    createdBy: ObjectId;
    icon?: string;
    cover?: string;
  }): Promise<any> {
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
  async getById(pageId: ObjectId): Promise<any> {
    return PageModel.findById(pageId).lean();
  }

  /**
   * List pages in a database within a workspace.
   */
  async listByDatabase(workspaceId: ObjectId, databaseId: ObjectId): Promise<any[]> {
    return PageModel.find({
      workspaceId,
      databaseId,
      archived: { $ne: true },
    }).lean();
  }

  /**
   * List top-level pages in a workspace (no parent database).
   */
  async listRootPages(workspaceId: ObjectId): Promise<any[]> {
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
    pageId: ObjectId,
    properties: Record<string, PropertyValue>,
    editedBy: ObjectId,
  ): Promise<any> {
    const update: Record<string, unknown> = { lastEditedBy: editedBy };
    for (const [key, val] of Object.entries(properties)) {
      update[`properties.${key}`] = val;
    }
    return PageModel.findByIdAndUpdate(pageId, { $set: update }, { new: true }).lean();
  }

  /**
   * Soft-delete (archive) a page.
   */
  async archive(pageId: ObjectId, archivedBy: ObjectId): Promise<void> {
    await PageModel.updateOne(
      { _id: pageId },
      { archived: true, archivedAt: new Date(), archivedBy },
    );
  }

  /**
   * Restore an archived page.
   */
  async restore(pageId: ObjectId): Promise<void> {
    await PageModel.updateOne(
      { _id: pageId },
      { archived: false, $unset: { archivedAt: 1, archivedBy: 1 } },
    );
  }
}
