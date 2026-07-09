/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   FeedView.tsx                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:38:13 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 23:14:06 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { useDatabaseStore } from '../../../store/dbms/hardcoded/useDatabaseStore';
import { useDefaultTemplateCreate } from '../useDefaultTemplateCreate';
import { useActiveViewId } from '../../../hooks/useDatabaseScope';
import { FileText, Clock } from 'lucide-react';
import { parseISO, formatDistanceToNow } from 'date-fns';
import { cn } from '../../../utils/cn';
import { cardCoverGradient } from '../../../utils/color';
import { FeedActionBar } from './FeedActionBar';
import { FeedCardDescription } from './FeedCardDescription';
import { FeedReaderOverlay, type ReaderArticle } from './FeedReaderOverlay';
import { useViewPages } from '../../../hooks/useViewPages';
import { useViewPager } from '../../../hooks/useViewPager';
import { ViewPaginationBar } from '../shared/ViewPaginationBar';
import { useStackedGroups } from '../../../hooks/useViewGrouping';
import type { Page } from '../../../types/database';
import { GroupSectionHeader } from '../shared/GroupSectionHeader';

type FeedProp = { id: string; type: string; name: string; options?: { id: string; value: string; color: string }[] };

/** Relative time ("3 hours ago") from an ISO/date string; empty on unparseable. */
function relativeTime(value: string): string {
  try { return formatDistanceToNow(parseISO(value), { addSuffix: true }); }
  catch { return ''; }
}

/** Rough read-time from the excerpt: ~225 wpm, floored at 1 min. Omitted for very short bodies. */
function readMinutes(body: string | null): number | null {
  if (!body) return null;
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  if (words < 25) return null;
  return Math.max(1, Math.round(words / 225));
}

/** Deterministic fallback cover gradient (by id) so every gallery card is cover-forward. */
function coverGradientFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash + id.charCodeAt(i)) | 0;
  return cardCoverGradient(Math.abs(hash));
}

/** Renders compact property tags for a single feed card. */
function renderFeedPropertyTags(
  nonTitleProps: FeedProp[],
  properties: Record<string, unknown>,
): React.ReactNode[] {
  return nonTitleProps.map(prop => {
    const val = properties[prop.id];
    if (val === undefined || val === null || val === '') return null;

    if (prop.type === 'select') {
      const opt = prop.options?.find(o => o.id === val);
      return opt ? <span key={prop.id} className={cn(`px-2 py-0.5 rounded-full text-xs font-medium ${opt.color}`)}>{opt.value}</span> : null;
    }
    if (prop.type === 'multi_select') {
      const ids: string[] = Array.isArray(val) ? val : [];
      return ids.map(id => {
        const opt = prop.options?.find(o => o.id === id);
        return opt ? <span key={id} className={cn(`px-2 py-0.5 rounded-full text-xs font-medium ${opt.color}`)}>{opt.value}</span> : null;
      });
    }
    if (prop.type === 'checkbox') {
      return val ? <span key={prop.id} className={cn("text-success-text text-xs font-medium")}>✓ {prop.name}</span> : null;
    }
    return null;
  });
}

/** Renders a social-media-style feed of database pages with actions and property tags. */
export function FeedView() {
  const activeViewId = useActiveViewId();
  const { views, databases, openPage, getPageTitle, addPage, updatePageProperty } = useDatabaseStore();
  const view = activeViewId ? views[activeViewId] : null;
  const database = view ? databases[view.databaseId] : null;

  const pages = useViewPages(view?.id);
  const pager = useViewPager(pages, view?.settings?.loadLimit, view?.id);
  // Notion-mode grouping: stacked, collapsible sections (null when inactive).
  const { groups, collapsed, toggleCollapse } = useStackedGroups(view?.id);
  const createRecord = useDefaultTemplateCreate(() => { if (database) addPage(database.id); });
  // Distraction-free reader overlay (the card's own data; null = closed).
  const [reader, setReader] = React.useState<ReaderArticle | null>(null);

  if (!view || !database) return null;

  const settings = view.settings || {};
  const showAuthorByline = settings.showAuthorByline !== false;
  const showPageIcon = settings.showPageIcon !== false;
  const wrapProperties = settings.wrapProperties !== false;

  const visibleProps = view.visibleProperties.map(id => database.properties[id]).filter(Boolean);
  const nonTitleProps = visibleProps.filter(p => p.id !== database.titlePropertyId);

  const userProp = Object.values(database.properties).find(p => p.type === 'user');
  const dateProp = Object.values(database.properties).find(p => p.type === 'date');
  const textProp = Object.values(database.properties).find(p => p.type === 'text' && p.id !== database.titlePropertyId);

  const renderPost = (page: Page) => {
          const title = getPageTitle(page);
          const author = userProp ? page.properties[userProp.id] : null;
          const date = dateProp ? page.properties[dateProp.id] : page.createdAt;
          const body = textProp ? page.properties[textProp.id] : null;

          let headerIcon: React.ReactNode;
          if (showAuthorByline && author) {
            headerIcon = (
              <div className={cn("w-9 h-9 rounded-full bg-gradient-to-br from-gradient-purple-from to-gradient-purple-to flex items-center justify-center text-ink-inverse text-sm font-bold")}>
                {String(author).charAt(0).toUpperCase()}
              </div>
            );
          } else if (showPageIcon && page.icon) {
            headerIcon = <span className={cn("text-2xl")}>{page.icon}</span>;
          } else {
            headerIcon = (
              <div className={cn("w-9 h-9 rounded-full bg-surface-muted flex items-center justify-center")}>
                <FileText className={cn("w-4 h-4 text-ink-muted")} />
              </div>
            );
          }

          const isImageCover = Boolean(page.cover) && !String(page.cover).startsWith('linear-gradient');
          const minutes = readMinutes(typeof body === 'string' ? body : null);

          return (
            <article key={page.id} // NOSONAR
              role="button" // NOSONAR
              tabIndex={0}
              className={cn("group bg-surface-primary rounded-xl border border-line overflow-hidden hover:shadow-md transition-shadow cursor-pointer")}
              onClick={() => openPage(page.id)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPage(page.id); } }}>

              {/* Cover — every card is gallery-forward: an image cover cropped to fill,
                  a page's gradient cover, else a deterministic fallback gradient + icon
                  so coverless cards keep the same shape (mirrors GalleryView). */}
              <div className={cn("relative w-full aspect-[16/9] overflow-hidden bg-surface-tertiary",
                    !isImageCover && !page.cover && coverGradientFor(page.id))}
                style={isImageCover ? undefined : (page.cover ? { background: String(page.cover) } : undefined)}>
                {isImageCover && (
                  <img src={String(page.cover)} alt=""
                    className={cn("absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]")} />
                )}
                {!page.cover && (
                  <div className={cn("absolute inset-0 flex items-center justify-center text-4xl text-ink-inverse")}>
                    {page.icon ?? <FileText className={cn("w-8 h-8 opacity-80")} />}
                  </div>
                )}
                {/* Read: distraction-free reader overlay (doesn't navigate away). */}
                <button type="button" aria-label="Read article"
                  onClick={e => { e.stopPropagation(); setReader({
                    pageId: page.id, title, author: author != null ? String(author) : null,
                    when: date ? relativeTime(date) : '', body: typeof body === 'string' ? body : null,
                    cover: page.cover ?? null, icon: page.icon ?? null, minutes,
                    coverGradient: coverGradientFor(page.id), tags: renderFeedPropertyTags(nonTitleProps, page.properties),
                  }); }}
                  className={cn("absolute right-2 top-2 z-10 rounded-lg bg-surface-inverse/70 px-2 py-1 text-xs font-medium text-ink-inverse opacity-0 transition-opacity group-hover:opacity-100")}>
                  Read
                </button>
              </div>

              {/* Header — author identity + when + read-time */}
              <div className={cn("flex items-center justify-between px-5 pt-4 pb-2")}>
                <div className={cn("flex items-center gap-3 min-w-0")}>
                  {headerIcon}
                  <div className={cn("min-w-0")}>
                    {showAuthorByline && author && (
                      <div className={cn("text-sm font-semibold text-ink truncate")}>{author}</div>
                    )}
                    <div className={cn("flex items-center gap-1.5 text-xs text-ink-muted")}>
                      {date && <span>{relativeTime(date)}</span>}
                      {date && minutes && <span aria-hidden>·</span>}
                      {minutes && (
                        <span className={cn("inline-flex items-center gap-1")}>
                          <Clock className={cn("w-3 h-3")} />{minutes} min read
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Body — title + description excerpt */}
              <div className={cn("px-5 pb-3")}>
                <h3 className={cn("text-lg font-semibold text-ink mb-1 leading-snug line-clamp-2")}>
                  {showPageIcon && page.icon && !author && <span className={cn("mr-1")}>{page.icon}</span>}
                  {title || <span className={cn("text-ink-muted")}>Untitled</span>}
                </h3>
                {textProp ? (
                  <FeedCardDescription
                    value={typeof body === 'string' ? body : ''}
                    onCommit={(next) => updatePageProperty(page.id, textProp.id, next)} />
                ) : body ? (
                  <p className={cn("text-sm text-ink-body-light leading-relaxed line-clamp-3")}>{body}</p>
                ) : null}
              </div>

              {/* Properties */}
              {nonTitleProps.length > 0 && (
                <div className={cn(`px-5 pb-3 flex gap-2 ${wrapProperties ? 'flex-wrap' : 'flex-nowrap overflow-hidden'}`)}>
                  {renderFeedPropertyTags(nonTitleProps, page.properties)}
                </div>
              )}

              {/* Action bar — reactions / comments / share (bridge-backed) */}
              <FeedActionBar pageId={page.id} />
            </article>
          );
  };

  const readerOverlay = reader && (
    <FeedReaderOverlay article={reader} onClose={() => setReader(null)}
      onOpenFull={() => { openPage(reader.pageId); setReader(null); }} />
  );

  // Notion-mode grouping: one collapsible section per group value.
  if (groups) {
    return (
      <div className={cn("flex-1 overflow-auto bg-surface-secondary")}>
        {readerOverlay}
        <div className={cn("max-w-2xl mx-auto py-6 px-4 flex flex-col gap-5")}>
          {groups.map(g => (
            <section key={g.groupId} data-testid="feed-group-section">
              <GroupSectionHeader label={g.groupLabel} color={g.groupColor} count={g.pages.length}
                collapsed={collapsed.has(g.groupId)} onToggle={() => toggleCollapse(g.groupId)} />
              {!collapsed.has(g.groupId) && (
                <div className={cn("mt-2 flex flex-col gap-4")}>{g.pages.map(renderPost)}</div>
              )}
            </section>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex-1 flex flex-col min-h-0")}>
      <ViewPaginationBar pager={pager} />
      <div className={cn("flex-1 overflow-auto bg-surface-secondary")}>
        {readerOverlay}
        <div className={cn("max-w-2xl mx-auto py-6 px-4 flex flex-col gap-4")}>
          {pager.items.map(renderPost)}

          {pager.items.length === 0 && (
            <div className={cn("text-center py-20 text-ink-muted")}>
              <FileText className={cn("w-10 h-10 mx-auto mb-3 text-ink-disabled")} />
              <p className={cn("text-sm mb-3")}>No pages to display</p>
              <button onClick={createRecord}
                className={cn("text-sm text-accent-text-soft hover:text-hover-accent-text font-medium")}>
                Create a page
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
