/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   FeedReaderOverlay.tsx                              :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * Distraction-free reader for a gallery/feed article: a centered overlay with the
 * cover hero, byline + read-time, title, property tags and the description — the
 * card's own data, so it stays in the submodule (no app imports). "Open full page"
 * hands off to the editable page for the full block body. Escape / backdrop close.
 */

import React, { useEffect } from 'react';
import { X, Clock, FileText, ExternalLink } from 'lucide-react';

import { cn } from '../../../utils/cn';

export interface ReaderArticle {
  pageId: string;
  title: string;
  author: string | null;
  when: string;
  body: string | null;
  cover: string | null;
  icon: string | null;
  minutes: number | null;
  coverGradient: string;
  tags: React.ReactNode;
}

export function FeedReaderOverlay({ article, onClose, onOpenFull }: Readonly<{
  article: ReaderArticle;
  onClose: () => void;
  onOpenFull: () => void;
}>) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const isImage = Boolean(article.cover) && !String(article.cover).startsWith('linear-gradient');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={article.title || 'Article'}
      onClick={onClose}
      className={cn('fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-8')}
    >
      <div onClick={(event) => event.stopPropagation()}
        className={cn('relative w-full max-w-2xl overflow-hidden rounded-2xl bg-surface-primary shadow-2xl')}>
        <button type="button" aria-label="Close reader" onClick={onClose}
          className={cn('absolute right-3 top-3 z-10 rounded-full bg-surface-inverse/60 p-1.5 text-ink-inverse hover:bg-surface-inverse')}>
          <X className={cn('h-4 w-4')} />
        </button>

        <div
          className={cn('relative aspect-[16/9] w-full overflow-hidden bg-surface-tertiary', !isImage && !article.cover && article.coverGradient)}
          style={isImage ? undefined : (article.cover ? { background: String(article.cover) } : undefined)}
        >
          {isImage && <img src={String(article.cover)} alt="" className={cn('absolute inset-0 h-full w-full object-cover')} />}
          {!article.cover && (
            <div className={cn('absolute inset-0 flex items-center justify-center text-5xl text-ink-inverse')}>
              {article.icon ?? <FileText className={cn('h-10 w-10 opacity-80')} />}
            </div>
          )}
        </div>

        <div className={cn('px-6 py-5 sm:px-8')}>
          <div className={cn('mb-2 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted')}>
            {article.author && <span className={cn('font-medium text-ink-secondary')}>{article.author}</span>}
            {article.author && article.when && <span aria-hidden>·</span>}
            {article.when && <span>{article.when}</span>}
            {article.minutes && (
              <span className={cn('inline-flex items-center gap-1')}><Clock className={cn('h-3 w-3')} />{article.minutes} min read</span>
            )}
          </div>
          <h1 className={cn('text-2xl font-bold leading-tight text-ink')}>{article.title || 'Untitled'}</h1>
          {article.tags && <div className={cn('mt-3 flex flex-wrap gap-2')}>{article.tags}</div>}
          {article.body && (
            <p className={cn('mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-ink-body-light')}>{article.body}</p>
          )}
          <button type="button" onClick={onOpenFull}
            className={cn('mt-6 inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink-secondary hover:bg-hover-surface2')}>
            <ExternalLink className={cn('h-4 w-4')} /> Open full page
          </button>
        </div>
      </div>
    </div>
  );
}
