/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   FeedView.tsx                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:38:13 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 13:36:40 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { useDatabaseStore } from '../../../store/dbms/hardcoded/useDatabaseStore';
import { useActiveViewId } from '../../../hooks/useDatabaseScope';
import { MessageCircle, Heart, Share2, MoreHorizontal, FileText } from 'lucide-react';
import { parseISO, formatDistanceToNow } from 'date-fns';
import { cn } from '../../../utils/cn';

/** Renders a social-media-style feed of database pages with actions and property tags. */
export function FeedView() {
  const activeViewId = useActiveViewId();
  const { views, databases, getPagesForView, openPage, getPageTitle, addPage } = useDatabaseStore();
  const view = activeViewId ? views[activeViewId] : null;
  const database = view ? databases[view.databaseId] : null;

  if (!view || !database) return null;

  const settings = view.settings || {};
  const showAuthorByline = settings.showAuthorByline !== false;
  const showPageIcon = settings.showPageIcon !== false;
  const wrapProperties = settings.wrapProperties !== false;

  const pages = getPagesForView(view.id);
  const visibleProps = view.visibleProperties.map(id => database.properties[id]).filter(Boolean);
  const nonTitleProps = visibleProps.filter(p => p.id !== database.titlePropertyId);

  const userProp = Object.values(database.properties).find(p => p.type === 'user');
  const dateProp = Object.values(database.properties).find(p => p.type === 'date');
  const textProp = Object.values(database.properties).find(p => p.type === 'text' && p.id !== database.titlePropertyId);

  return (
    <div className={cn("flex-1 overflow-auto bg-surface-secondary")}>
      <div className={cn("max-w-2xl mx-auto py-6 px-4 flex flex-col gap-4")}>
        {pages.map(page => {
          const title = getPageTitle(page);
          const author = userProp ? page.properties[userProp.id] : null;
          const date = dateProp ? page.properties[dateProp.id] : page.createdAt;
          const body = textProp ? page.properties[textProp.id] : null;

          return (
            <article key={page.id}
              className={cn("bg-surface-primary rounded-xl border border-line overflow-hidden hover:shadow-md transition-shadow cursor-pointer")}
              onClick={() => openPage(page.id)}>

              {/* Header */}
              <div className={cn("flex items-center justify-between px-5 pt-4 pb-2")}>
                <div className={cn("flex items-center gap-3")}>
                  {showAuthorByline && author ? (
                    <div className={cn("w-9 h-9 rounded-full bg-gradient-to-br from-gradient-purple-from to-gradient-purple-to flex items-center justify-center text-ink-inverse text-sm font-bold")}>
                      {String(author).charAt(0).toUpperCase()}
                    </div>
                  ) : showPageIcon && page.icon ? (
                    <span className={cn("text-2xl")}>{page.icon}</span>
                  ) : (
                    <div className={cn("w-9 h-9 rounded-full bg-surface-muted flex items-center justify-center")}>
                      <FileText className={cn("w-4 h-4 text-ink-muted")} />
                    </div>
                  )}
                  <div>
                    {showAuthorByline && author && (
                      <div className={cn("text-sm font-semibold text-ink")}>{author}</div>
                    )}
                    {date && (
                      <div className={cn("text-xs text-ink-muted")}>
                        {(() => {
                          try { return formatDistanceToNow(parseISO(date), { addSuffix: true }); }
                          catch { return ''; }
                        })()}
                      </div>
                    )}
                  </div>
                </div>
                <button onClick={e => e.stopPropagation()}
                  className={cn("p-1.5 text-ink-muted hover:text-hover-text rounded-lg hover:bg-hover-surface2 transition-colors")}>
                  <MoreHorizontal className={cn("w-4 h-4")} />
                </button>
              </div>

              {/* Body */}
              <div className={cn("px-5 pb-3")}>
                <h3 className={cn("text-lg font-semibold text-ink mb-1 leading-snug")}>
                  {showPageIcon && page.icon && !author && <span className={cn("mr-1")}>{page.icon}</span>}
                  {title || <span className={cn("text-ink-muted")}>Untitled</span>}
                </h3>
                {body && (
                  <p className={cn("text-sm text-ink-body-light leading-relaxed line-clamp-3")}>{body}</p>
                )}
              </div>

              {/* Properties */}
              {nonTitleProps.length > 0 && (
                <div className={cn(`px-5 pb-3 flex gap-2 ${wrapProperties ? 'flex-wrap' : 'flex-nowrap overflow-hidden'}`)}>
                  {nonTitleProps.map(prop => {
                    const val = page.properties[prop.id];
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
                  })}
                </div>
              )}

              {/* Cover image if exists */}
              {page.cover && (
                <div className={cn("mx-5 mb-3 rounded-lg overflow-hidden bg-surface-tertiary")}>
                  <img src={page.cover} alt="" className={cn("w-full h-48 object-cover")} />
                </div>
              )}

              {/* Action bar */}
              <div className={cn("flex items-center gap-1 px-3 py-2 border-t border-line-light")}>
                <button onClick={e => e.stopPropagation()}
                  className={cn("flex items-center gap-1.5 py-1.5 px-3 text-ink-secondary hover:bg-hover-surface2 rounded-lg transition-colors text-sm")}>
                  <Heart className={cn("w-4 h-4")} /> Like
                </button>
                <button onClick={e => e.stopPropagation()}
                  className={cn("flex items-center gap-1.5 py-1.5 px-3 text-ink-secondary hover:bg-hover-surface2 rounded-lg transition-colors text-sm")}>
                  <MessageCircle className={cn("w-4 h-4")} /> Comment
                </button>
                <button onClick={e => e.stopPropagation()}
                  className={cn("flex items-center gap-1.5 py-1.5 px-3 text-ink-secondary hover:bg-hover-surface2 rounded-lg transition-colors text-sm")}>
                  <Share2 className={cn("w-4 h-4")} /> Share
                </button>
              </div>
            </article>
          );
        })}

        {pages.length === 0 && (
          <div className={cn("text-center py-20 text-ink-muted")}>
            <FileText className={cn("w-10 h-10 mx-auto mb-3 text-ink-disabled")} />
            <p className={cn("text-sm mb-3")}>No pages to display</p>
            <button onClick={() => addPage(database.id)}
              className={cn("text-sm text-accent-text-soft hover:text-hover-accent-text font-medium")}>
              Create a page
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
