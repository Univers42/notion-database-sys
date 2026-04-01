/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   BreadcrumbBlock.tsx                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:34:34 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 16:34:36 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import type { BlockRendererProps } from './BlockRenderer';
import { useDatabaseStore } from '../../store/useDatabaseStore';
import { ChevronRight, FileText } from 'lucide-react';

function getCrumbs(pageId: string, pages: Record<string, { title: string; icon?: string }>) {
  // For now show currentPage. Future: walk parent chain.
  const page = pages[pageId];
  return page ? [{ id: pageId, title: page.title || 'Untitled', icon: page.icon }] : [];
}

export function BreadcrumbBlock({ pageId }: BlockRendererProps) {
  const pages = useDatabaseStore(s => s.pages);
  const crumbs = getCrumbs(pageId, pages as Record<string, { title: string; icon?: string }>);

  return (
    <nav className="flex items-center gap-1 py-2 text-sm text-ink-secondary select-none">
      {crumbs.map((crumb, i) => (
        <React.Fragment key={crumb.id}>
          {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-ink-faint shrink-0" />}
          <span className="flex items-center gap-1 hover:text-ink-primary cursor-default">
            {crumb.icon ? (
              <span className="text-sm">{crumb.icon}</span>
            ) : (
              <FileText className="w-3.5 h-3.5" />
            )}
            <span className="max-w-[200px] truncate">{crumb.title}</span>
          </span>
        </React.Fragment>
      ))}
    </nav>
  );
}
