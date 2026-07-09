/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   EngineTemplatesProvider.tsx                        :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/07 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/07 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useMemo } from 'react';
import { useDatabaseStore, useStoreApi } from '../../store/dbms/hardcoded/useDatabaseStore';
import { TemplatesContext, useTemplatesController } from './templatesContext';
import type { ObjectDatabaseTemplatesController } from '../../component/types';
import type { DatabaseSchema } from '../../types/database';

/** Engine-native templates: template pages live in the store (flagged
 *  `isTemplate`, hidden from views) and open through the ordinary record-page
 *  surface. Mounted as a FALLBACK — a host-supplied controller (the templates
 *  prop) always wins, so this only backs databases without one, giving every
 *  header the split "New | ▾" button. */
export function EngineTemplatesProvider({ database, children }: Readonly<{
  database: DatabaseSchema;
  children: React.ReactNode;
}>) {
  const host = useTemplatesController();
  const pages = useDatabaseStore(s => s.pages);
  const getPageTitle = useDatabaseStore(s => s.getPageTitle);
  const storeApi = useStoreApi();

  const controller = useMemo<ObjectDatabaseTemplatesController>(() => {
    const list = Object.values(pages)
      .filter(p => p.databaseId === database.id && p.isTemplate)
      .map(p => ({
        id: p.id,
        title: String(getPageTitle(p) || 'New template'),
        icon: p.icon,
        isDefault: database.defaultTemplateId === p.id,
      }));
    const s = () => storeApi.getState();
    return {
      list,
      onCreateFrom: (templateId) => {
        const pageId = s().createPageFromTemplate(templateId);
        if (pageId) s().openPage(pageId);
      },
      onOpen: (templateId) => s().openPage(templateId),
      onNew: () => {
        const templateId = s().addTemplatePage(database.id);
        s().openPage(templateId);
      },
      onSetDefault: (templateId) => s().setDefaultTemplate(
        database.id,
        database.defaultTemplateId === templateId ? undefined : templateId,
      ),
      onDuplicate: (templateId) => s().duplicatePage(templateId),
      onDelete: (templateId) => s().deletePage(templateId),
    };
  }, [pages, database.id, database.defaultTemplateId, getPageTitle, storeApi]);

  if (host) return <>{children}</>;
  return <TemplatesContext.Provider value={controller}>{children}</TemplatesContext.Provider>;
}
