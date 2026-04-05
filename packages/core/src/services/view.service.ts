/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   view.service.ts                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 15:06:12 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 22:31:03 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { ViewConfigModel } from '../models/view.model.js';
import { UserViewOverrideModel } from '../models/userViewOverride.model.js';
import type { ViewConfig, UserViewOverride } from '@notion-db/types';

export class ViewService {
  /**
   * Create a new shared view for a database.
   */
  async create(data: Omit<ViewConfig, '_id' | 'createdAt' | 'updatedAt'>): Promise<unknown> {
    const view = await ViewConfigModel.create(data);
    return view.toObject();
  }

  /**
   * List all views for a database.
   */
  async listByDatabase(databaseId: string, workspaceId: string): Promise<unknown[]> {
    return ViewConfigModel.find({ databaseId, workspaceId }).lean();
  }

  /**
   * Get the effective view for a user — base view merged with user overrides.
   */
  async getEffective(viewId: string, userId: string): Promise<unknown> {
    const [base, override] = await Promise.all([
      ViewConfigModel.findById(viewId).lean(),
      UserViewOverrideModel.findOne({ viewId, userId }).lean(),
    ]);

    if (!base) throw new Error(`View ${viewId} not found`);
    if (!override) return base;

    return this.mergeOverride(base as unknown as ViewConfig, override as unknown as UserViewOverride);
  }

  /**
   * Save user-specific overrides for a shared view.
   */
  async saveOverride(
    viewId: string,
    userId: string,
    workspaceId: string,
    overrides: UserViewOverride['overrides'],
  ): Promise<void> {
    await UserViewOverrideModel.findOneAndUpdate(
      { viewId, userId },
      { viewId, userId, workspaceId, overrides },
      { upsert: true },
    );
  }

  /**
   * Delete a user's overrides (reset to shared view).
   */
  async resetOverride(viewId: string, userId: string): Promise<void> {
    await UserViewOverrideModel.deleteOne({ viewId, userId });
  }

  /**
   * Merge user overrides on top of the base view.
   * Strategy: shallow merge at each field level. Override replaces base.
   */
  private mergeOverride(base: ViewConfig, override: UserViewOverride): ViewConfig {
    const merged = { ...base } as Record<string, unknown>;
    const ov = override.overrides;

    if (ov.filterTree !== undefined) merged.filterTree = ov.filterTree;
    if (ov.filters !== undefined) merged.filters = ov.filters;
    if (ov.filterConjunction !== undefined) merged.filterConjunction = ov.filterConjunction;
    if (ov.sorts !== undefined) merged.sorts = ov.sorts;
    if (ov.grouping !== undefined) merged.grouping = ov.grouping;
    if (ov.subGrouping !== undefined) merged.subGrouping = ov.subGrouping;
    if (ov.visibleProperties !== undefined) merged.visibleProperties = ov.visibleProperties;
    if (ov.fieldConfigs !== undefined) merged.fieldConfigs = ov.fieldConfigs;
    if (ov.settings !== undefined) merged.settings = { ...base.settings, ...ov.settings };

    return merged as unknown as ViewConfig;
  }
}
