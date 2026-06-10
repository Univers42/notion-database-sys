/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   FeedActionBar.tsx                                  :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/10 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * Like / Comment / Share bar for one feed card, wired to the bridge feed
 * endpoints via useFeedInteractions; degrades to the original inert buttons
 * when the bridge is absent.
 */

import React, { useState } from 'react';
import { Heart, MessageCircle, Share2 } from 'lucide-react';

import { cn } from '../../../utils/cn';
import { useFeedInteractions } from './useFeedInteractions';

export function FeedActionBar({ pageId }: Readonly<{ pageId: string }>) {
  const { available, likes, comments, toggleLike, loadComments, addComment } = useFeedInteractions(pageId);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [draft, setDraft] = useState('');

  const buttonClass = cn('flex items-center gap-1.5 py-1.5 px-3 text-ink-secondary hover:bg-hover-surface2 rounded-lg transition-colors text-sm');

  return (
    <div onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()} role="presentation">
      <div className={cn('flex items-center gap-1 px-3 py-2 border-t border-line-light')}>
        <button onClick={() => { void toggleLike(); }} className={buttonClass}>
          <Heart className={cn(`w-4 h-4 ${likes?.likedByMe ? 'fill-current text-rose-500' : ''}`)} />
          Like{likes && likes.count > 0 ? ` · ${likes.count}` : ''}
        </button>
        <button
          onClick={() => {
            setCommentsOpen((open) => !open);
            if (!commentsOpen && comments === null) void loadComments();
          }}
          className={buttonClass}
        >
          <MessageCircle className={cn('w-4 h-4')} />
          Comment{comments && comments.length > 0 ? ` · ${comments.length}` : ''}
        </button>
        <button className={buttonClass}>
          <Share2 className={cn('w-4 h-4')} /> Share
        </button>
      </div>
      {commentsOpen && available && (
        <div className={cn('px-5 pb-3 border-t border-line-light pt-2 flex flex-col gap-2')}>
          {(comments ?? []).map((comment) => (
            <p key={comment.id} className={cn('text-sm text-ink-body-light')}>
              <span className={cn('font-semibold text-ink')}>{comment.authorName}</span> {comment.content}
            </p>
          ))}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void addComment(draft).then(() => setDraft(''));
            }}
            className={cn('flex gap-2')}
          >
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Write a comment…"
              className={cn('flex-1 rounded-lg border border-line bg-surface-secondary px-3 py-1.5 text-sm outline-none')}
            />
            <button type="submit" disabled={!draft.trim()} className={cn('text-sm font-medium text-accent-text-soft disabled:opacity-40')}>
              Post
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
