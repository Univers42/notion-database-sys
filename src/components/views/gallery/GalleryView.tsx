/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   GalleryView.tsx                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:38:38 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/10 00:36:01 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { useDatabaseStore, useStoreApi } from '../../../store/dbms/hardcoded/useDatabaseStore';
import { useDefaultTemplateCreate } from '../useDefaultTemplateCreate';
import { useActiveViewId } from '../../../hooks/useDatabaseScope';
import { Plus, Image, MoreHorizontal, ArrowUpRight } from 'lucide-react';
import type { Page, Block } from '../../../types/database';
import { CURSORS } from '../../ui/cursors';
import { renderPropertyValue, coverColors } from './GalleryViewHelpers';
import { cn } from '../../../utils/cn';
import { useViewPages } from '../../../hooks/useViewPages';
import { useViewPager } from '../../../hooks/useViewPager';
import { ViewPaginationBar } from '../shared/ViewPaginationBar';
import { useStackedGroups } from '../../../hooks/useViewGrouping';
import { GroupSectionHeader } from '../shared/GroupSectionHeader';
import { colorForPage } from '../../../lib/conditionalColor';

/** Renders a gallery view of database pages as cards with optional cover previews. */
export function GalleryView() {
  const activeViewId = useActiveViewId();
  // Narrow selectors (MapView's fixed idiom): a bare useDatabaseStore() re-
  // rendered the gallery on EVERY store write in this database. useViewPages
  // subscribes pages; searchQuery is subscribed here because getPagesForView
  // filters by it — actions come off the store api (stable, no subscription).
  const views = useDatabaseStore(s => s.views);
  const databases = useDatabaseStore(s => s.databases);
  useDatabaseStore(s => s.searchQuery);
  const storeApi = useStoreApi();
  const { openPage, getPageTitle, addPage } = storeApi.getState();
  const view = activeViewId ? views[activeViewId] : null;
  const database = view ? databases[view.databaseId] : null;
  const pages = useViewPages(view?.id);
  const pager = useViewPager(pages, view?.settings?.loadLimit, view?.id);
  // Notion-mode grouping: stacked, collapsible sections (null when inactive).
  const { groups, collapsed, toggleCollapse } = useStackedGroups(view?.id);
  const createRecord = useDefaultTemplateCreate(() => { if (database) addPage(database.id); });

  if (!view || !database) return null;

  const settings = view.settings || {};
  const cardSize = settings.cardSize || 'medium';
  const fitMedia = settings.fitMedia !== false;
  const showPageIcon = settings.showPageIcon !== false;
  const wrapContent = settings.wrapContent === true;
  // Notion parity: a gallery previews the page cover unless explicitly disabled.
  const cardPreview = settings.cardPreview || 'page_cover';
  // Carousel = a single horizontally-scrolling row (show one row, scroll sideways
  // for the rest) instead of the wrapping grid. Cards get a fixed width per size.
  const isCarousel = settings.galleryLayout === 'carousel';
  const carouselWidthMap: Record<string, string> = { small: '180px', large: '300px', xl: '340px' };
  const carouselWidth = carouselWidthMap[cardSize] || '248px';

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
        <div data-testid="gallery-card-cover" className={cn(`${coverHeight} ${coverColor} relative flex items-center justify-center`)}>
          {(() => {
            if (page.cover) {
              // A cover is a URL or a CSS gradient — gradients render as a
              // painted div, not an <img> (which would show a broken image).
              const isGradientCover = page.cover.startsWith('linear-gradient')
                || page.cover.startsWith('radial-gradient');
              if (isGradientCover) {
                return <div className={cn("w-full h-full")} style={{ background: page.cover }} />;
              }
              return <img src={page.cover} alt="" className={cn(`w-full h-full ${fitMedia ? 'object-cover' : 'object-contain'}`)} />;
            }
            if (page.icon) {
              return <span className={cn("text-4xl")}>{page.icon}</span>;
            }
            return <Image className={cn("w-8 h-8 text-ink-disabled")} />;
          })()}
          <span className={cn("absolute top-2 right-2 p-1 rounded bg-overlay-medium text-ink-muted opacity-0 group-hover:opacity-100 transition-opacity shadow-sm")}
            aria-hidden="true">
            <MoreHorizontal className={cn("w-4 h-4")} />
          </span>
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
          <button aria-label="Card options" className={cn("absolute top-2 right-2 p-1 rounded bg-overlay-medium text-ink-muted hover:text-hover-text opacity-0 group-hover:opacity-100 transition-opacity shadow-sm")}
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
          <button aria-label="Card options" className={cn("absolute top-2 right-2 p-1 rounded bg-overlay-medium text-ink-muted hover:text-hover-text opacity-0 group-hover:opacity-100 transition-opacity shadow-sm")}
            onClick={(e) => { e.stopPropagation(); }}>
            <MoreHorizontal className={cn("w-4 h-4")} />
          </button>
        </div>
      );
    }

    return null;
  };

  const renderCard = (page: Page, idx: number) => {
          const title = getPageTitle(page);

          const accent = colorForPage(page, settings.conditionalColors, database.properties)?.accent ?? null;
          return (
            <button type="button" key={page.id} onClick={() => openPage(page.id)}
              style={{
                cursor: CURSORS.pointer,
                ...(accent ? { boxShadow: `inset 0 3px 0 0 ${accent}` } : {}),
                ...(isCarousel ? { width: carouselWidth, scrollSnapAlign: "start" } : {}),
              }}
              className={cn("group border border-line rounded-xl overflow-hidden hover:shadow-lg hover:border-hover-border transition-all duration-200 bg-surface-primary text-left", isCarousel ? "shrink-0" : "w-full")}>
              {/* Cover / Preview */}
              {renderCover(page, idx)}

              {/* Content */}
              <div className={cn("p-3")}>
                <div className={cn("flex items-center gap-1.5 mb-1.5")}>
                  {showPageIcon && page.icon && <span className={cn("text-sm")}>{page.icon}</span>}
                  <span className={cn(`font-semibold text-sm text-ink ${wrapContent ? 'break-words' : 'truncate'} flex-1 min-w-0`)}>{title || <span className={cn("text-ink-muted")}>Untitled</span>}</span>
                  <span
                    className={cn("shrink-0 flex items-center gap-0.5 text-[10px] font-medium text-accent-text-soft bg-accent-soft px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity")}
                    aria-hidden="true">
                    <ArrowUpRight className={cn("w-3 h-3")} /> Open
                  </span>
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
  };

  /* One card grid (or carousel row). groupValue === undefined → ungrouped
     (template-aware New); a group's grid seeds new cards into that group. */
  const renderGrid = (list: Page[], groupValue?: string | null) => (
      <div
        className={cn(isCarousel ? "flex gap-4" : `grid ${gridCols} gap-4`)}
        style={isCarousel ? { scrollSnapType: "x proximity" } : undefined}
      >
        {list.map((page, idx) => renderCard(page, idx))}
        {/* Add card — a short Notion-style bar, not a full-height ghost card
            (self-start opts out of the grid row's stretch alignment). */}
        <button type="button" data-testid="gallery-new-page"
          onClick={groupValue === undefined
            ? createRecord
            : () => { if (view.grouping) addPage(database.id, { [view.grouping.propertyId]: groupValue }); }}
          className={cn("self-start h-10 border-2 border-dashed border-line rounded-xl flex items-center justify-center hover:border-hover-border-strong hover:bg-hover-surface transition-all duration-200", isCarousel ? "shrink-0" : "w-full")}
          style={{ cursor: CURSORS.pointer, ...(isCarousel ? { width: carouselWidth } : {}) }}>
          <div className={cn("flex items-center gap-1.5 text-ink-muted")}>
            <Plus className={cn("w-4 h-4")} />
            <span className={cn("text-sm")}>New page</span>
          </div>
        </button>
      </div>
  );

  // Notion-mode grouping: one collapsible section per group value.
  if (groups) {
    return (
      <div className={cn("flex-1 p-6 bg-surface-primary overflow-auto flex flex-col gap-5")}>
        {groups.map(g => (
          <section key={g.groupId} data-testid="gallery-group-section">
            <GroupSectionHeader label={g.groupLabel} color={g.groupColor} count={g.pages.length}
              collapsed={collapsed.has(g.groupId)} onToggle={() => toggleCollapse(g.groupId)} />
            {!collapsed.has(g.groupId) && (
              <div className={cn("mt-2")}>
                {renderGrid(g.pages, g.groupId === '__unassigned__' ? null : g.groupId)}
              </div>
            )}
          </section>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("flex-1 flex flex-col min-h-0")}>
      <ViewPaginationBar pager={pager} />
      <div className={cn("flex-1 p-6 bg-surface-primary", isCarousel ? "overflow-x-auto overflow-y-hidden" : "overflow-auto")}>
        {renderGrid(pager.items)}
        {pager.items.length === 0 && (
          <div className={cn("text-center py-20 text-ink-muted")}>
            <Image className={cn("w-10 h-10 mx-auto mb-3 text-ink-disabled")} />
            <p className={cn("text-sm")}>No pages to display</p>
          </div>
        )}
      </div>
    </div>
  );
}
