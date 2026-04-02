/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   seedData.ts                                        :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:43:35 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/02 14:49:14 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ═══════════════════════════════════════════════════════════════════════════════
// seedData.ts — aggregates all seed databases, pages and views
// ═══════════════════════════════════════════════════════════════════════════════

import type { DatabaseSchema, Page, ViewConfig } from '../../../types/database';
import { coreDatabases, corePages, coreViews } from './coreSeed';
import { DB_PRODUCTS, productDatabase, productPages, productViews } from './productSeed';
import {
  DB_PROJECTS, projectDatabase, projectPages, projectViews,
  reverseRelationProps, reverseRelationData,
} from './relationSeed';

/** Merge all databases, pages, views into a single initial state. */
export function buildInitialState(): {
  databases: Record<string, DatabaseSchema>;
  pages: Record<string, Page>;
  views: Record<string, ViewConfig>;
} {
  const databases: Record<string, DatabaseSchema> = {
    ...coreDatabases,
    [DB_PRODUCTS]: productDatabase,
    [DB_PROJECTS]: projectDatabase,
  };

  // Inject reverse-relation properties
  for (const [dbId, props] of Object.entries(reverseRelationProps)) {
    if (databases[dbId]) {
      Object.assign(databases[dbId].properties, props);
    }
  }

  const pages: Record<string, Page> = {
    ...corePages,
    ...productPages,
    ...projectPages,
  };

  // Inject reverse-relation data
  for (const [pageId, propPatch] of Object.entries(reverseRelationData)) {
    if (pages[pageId]) {
      Object.assign(pages[pageId].properties, propPatch);
    }
  }

  const views: Record<string, ViewConfig> = {
    ...coreViews,
    ...productViews,
    ...projectViews,
  };

  return { databases, pages, views };
}
