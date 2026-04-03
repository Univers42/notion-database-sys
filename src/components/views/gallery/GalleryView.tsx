/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   GalleryView.tsx                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:38:38 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 13:36:40 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { useDatabaseStore } from '../../../store/dbms/hardcoded/useDatabaseStore';
import { useActiveViewId } from '../../../hooks/useDatabaseScope';
import { Plus, Image, MoreHorizontal, ArrowUpRight } from 'lucide-react';
import type { Page, Block } from '../../../types/database';
import { CURSORS } from '../../ui/cursors';
import { renderPropertyValue, coverColors } from './GalleryViewHelpers';
import { cn } from '../../../utils/cn';

/** Renders a gallery view of database pages as cards with optional cover previews. */
export function GalleryView() {
  const activeViewId = useActiveViewId();
  const { views, databases, getPagesForView, openPage, getPageTitle, addPage } = useDatabaseStore();
  const view = activeViewId ? views[activeViewId] : null;
  const database = view ? databases[view.databaseId] : null;

  if (!view || !database) return null;

  const settings = view.settings || {};
  const cardSize = settings.cardSize || 'medium';
  const fitMedia = settings.fitMedia !== false;
  const showPageIcon = settings.showPageIcon !== false;
  const wrapContent = settings.wrapContent === true;
  const cardPreview = settings.cardPreview || 'none';

  const pages = getPagesForView(view.id);
  const visibleProps = view.visibleProperties.map(id => database.properties[id]).filter(Boolean);
  const nonTitleProps = visibleProps.filter(p => p.id !== database.titlePropertyId);

  const gridColsMap: Record<string, string> = {
    small: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
    large: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    xl: 'grid-cols-1 sm:grid-cols-2',
  };
  const gridCols = gridColsMap[cardSize] || 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';

  const coverHeightMap: Record<string, string> = {
    small: 'h-24',
    large: 'h-48',
    xl: 'h-56',
  };
  const coverHeight = coverHeightMap[cardSize] || 'h-36';

  const minHeightMap: Record<string, string> = {
    small: '120px',
    large: '240px',
  };

  // Render cover based on cardPreview setting
  const renderCover = (page: Page, idx: number) => {
    const coverColor = coverColors[idx % coverColors.length];

    if (cardPreview === 'none') {
      // No cover area at all
      return null;
    }

    if (cardPreview === 'page_cover') {
      // Show page cover image, icon, or colored placeholder
      return (
        <div className={cn(`${coverHeight} ${coverColor} relative flex items-center justify-center`)}>
          {(() => {
            if (page.cover) {
              return <img src={page.cover} alt="" className={cn(`w-full h-full ${fitMedia ? 'object-cover' : 'object-contain'}`)} />;
            }
            if (page.icon) {
              return <span className={cn("text-4xl")}>{page.icon}</span>;
            }
            return <Image className={cn("w-8 h-8 text-ink-disabled")} />;
          })()}
          <button className={cn("absolute top-2 right-2 p-1 rounded bg-overlay-medium text-ink-muted hover:text-hover-text opacity-0 group-hover:opacity-100 transition-opacity shadow-sm")}
            onClick={(e) => { e.stopPropagation(); }}>
            <MoreHorizontal className={cn("w-4 h-4")} />
          </button>
        </div>
      );
    }

    if (cardPreview === 'page_content') {
      // Show a preview of the page's block content
      const textContent = page.content?.map((b: Block) => b.content).filter(Boolean).join(' ') || '';
      return (
        <div className={cn(`${coverHeight} ${coverColor} relative p-3 overflow-hidden`)}>
          <p className={cn("text-xs text-ink-secondary leading-relaxed line-clamp-5")}>{textContent || 'No content'}</p>
          <div className={cn("absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gradient-fade-from to-transparent")} />
          <button className={cn("absolute top-2 right-2 p-1 rounded bg-overlay-medium text-ink-muted hover:text-hover-text opacity-0 group-hover:opacity-100 transition-opacity shadow-sm")}
            onClick={(e) => { e.stopPropagation(); }}>
            <MoreHorizontal className={cn("w-4 h-4")} />
          </button>
        </div>
      );
    }

    if (cardPreview === 'page_properties') {
      // Show a compact property overview in the cover area
      return (
        <div className={cn(`${coverHeight} bg-surface-secondary relative p-3 overflow-hidden flex flex-col gap-1.5`)}>
          {nonTitleProps.slice(0, 6).map(prop => {
            const val = page.properties[prop.id];
            const rendered = renderPropertyValue(prop, val, wrapContent);
            if (!rendered) return null;
            return (
              <div key={prop.id} className={cn("flex items-center gap-2")}>
                <span className={cn("text-[10px] uppercase text-ink-muted tracking-wide shrink-0 w-14 truncate")}>{prop.name}</span>
                {rendered}
              </div>
            );
          })}
          <button className={cn("absolute top-2 right-2 p-1 rounded bg-overlay-medium text-ink-muted hover:text-hover-text opacity-0 group-hover:opacity-100 transition-opacity shadow-sm")}
            onClick={(e) => { e.stopPropagation(); }}>
            <MoreHorizontal className={cn("w-4 h-4")} />
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <div className={cn("flex-1 overflow-auto p-6 bg-surface-primary")}>
      <div className={cn(`grid ${gridCols} gap-4`)}>
        {pages.map((page, idx) => {
          const title = getPageTitle(page);

          return (
            <button type="button" key={page.id} onClick={() => openPage(page.id)}
              style={{ cursor: CURSORS.pointer }}
              className={cn("group border border-line rounded-xl overflow-hidden hover:shadow-lg hover:border-hover-border transition-all duration-200 bg-surface-primary text-left w-full")}>
              {/* Cover / Preview */}
              {renderCover(page, idx)}

              {/* Content */}
              <div className={cn("p-3")}>
                <div className={cn("flex items-center gap-1.5 mb-1.5")}>
                  {showPageIcon && page.icon && <span className={cn("text-sm")}>{page.icon}</span>}
                  <span className={cn(`font-semibold text-sm text-ink ${wrapContent ? 'break-words' : 'truncate'} flex-1 min-w-0`)}>{title || <span className={cn("text-ink-muted")}>Untitled</span>}</span>
                  <button
                    className={cn("shrink-0 flex items-center gap-0.5 text-[10px] font-medium text-accent-text-soft bg-accent-soft hover:bg-hover-accent-muted px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity")}
                    onClick={(e) => { e.stopPropagation(); openPage(page.id); }}>
                    <ArrowUpRight className={cn("w-3 h-3")} /> Open
                  </button>
                </div>
                {/* Only show property rows when preview is NOT page_properties (avoid duplication) */}
                {cardPreview !== 'page_properties' && nonTitleProps.length > 0 && (
                  <div className={cn("flex flex-col gap-1.5 mt-2")}>
                    {nonTitleProps.slice(0, 4).map(prop => {
                      const val = page.properties[prop.id];
                      const rendered = renderPropertyValue(prop, val, wrapContent);
                      if (!rendered) return null;
                      return (
                        <div key={prop.id} className={cn("flex items-center gap-2")}>
                          <span className={cn("text-[10px] uppercase text-ink-muted tracking-wide shrink-0 w-16 truncate")}>{prop.name}</span>
                          {rendered}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </button>
          );
        })}

        {/* Add card */}
        <button type="button" onClick={() => addPage(database.id)}
          className={cn("border-2 border-dashed border-line rounded-xl flex items-center justify-center hover:border-hover-border-strong hover:bg-hover-surface transition-all duration-200")}
          style={{ cursor: CURSORS.pointer, minHeight: minHeightMap[cardSize] || '180px' }}>
          <div className={cn("flex flex-col items-center gap-1 text-ink-muted")}>
            <Plus className={cn("w-6 h-6")} />
            <span className={cn("text-sm")}>New page</span>
          </div>
        </button>
      </div>

      {pages.length === 0 && (
        <div className={cn("text-center py-20 text-ink-muted")}>
          <Image className={cn("w-10 h-10 mx-auto mb-3 text-ink-disabled")} />
          <p className={cn("text-sm")}>No pages to display</p>
        </div>
      )}
    </div>
  );
}
