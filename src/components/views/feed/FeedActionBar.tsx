/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   FeedActionBar.tsx                                  :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * Engagement bar for one feed card: multi-emoji reactions + a comment thread +
 * a share menu, wired to the bridge via useFeedInteractions. The outer wrapper
 * stops click/keydown so interacting never opens the card's page. Degrades to
 * the original inert buttons when the bridge feature is absent (offline feeds).
 */

import React, { useState } from 'react';
import { SmilePlus, MessageCircle, Share2 } from 'lucide-react';

import { cn } from '../../../utils/cn';
import { useFeedInteractions } from './useFeedInteractions';
import { FeedReactionBar } from './FeedReactions';
import { FeedComments } from './FeedComments';
import { FeedShareMenu } from './FeedShareMenu';

function InertBar() {
  const inert = cn('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-ink-secondary');
  return (
    <div className={cn('flex items-center gap-1 border-t border-line-light px-3 py-2')}>
      <span className={inert}><SmilePlus className={cn('h-4 w-4')} /> React</span>
      <span className={inert}><MessageCircle className={cn('h-4 w-4')} /> Comment</span>
      <span className={inert}><Share2 className={cn('h-4 w-4')} /> Share</span>
    </div>
  );
}

export function FeedActionBar({ pageId }: Readonly<{ pageId: string }>) {
  const feed = useFeedInteractions(pageId);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const commentCount = feed.commentCount;

  const stop = (event: React.SyntheticEvent) => event.stopPropagation();

  if (!feed.available) {
    return (
      <div onClick={stop} onKeyDown={stop} role="presentation">
        <InertBar />
      </div>
    );
  }

  return (
    <div onClick={stop} onKeyDown={stop} role="presentation">
      <div className={cn('flex flex-wrap items-center gap-2 border-t border-line-light px-3 py-2')}>
        <FeedReactionBar reactions={feed.reactions} onToggle={feed.toggleReaction} />
        <button
          type="button"
          aria-expanded={commentsOpen}
          onClick={() => {
            setCommentsOpen((open) => !open);
            if (feed.comments === null) void feed.loadComments();
          }}
          className={cn('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-ink-secondary transition-colors hover:bg-hover-surface2')}
        >
          <span aria-hidden>💬</span>
          Comment{commentCount > 0 ? ` · ${commentCount}` : ''}
        </button>
        <div className={cn('ml-auto')}>
          <FeedShareMenu onShare={feed.share} count={feed.shareCount} />
        </div>
      </div>
      {commentsOpen && (
        <div className={cn('border-t border-line-light px-5 pb-3 pt-3')}>
          <FeedComments
            comments={feed.comments}
            myId={feed.myId}
            onAdd={feed.addComment}
            onEdit={feed.editComment}
            onDelete={feed.deleteComment}
          />
        </div>
      )}
    </div>
  );
}
