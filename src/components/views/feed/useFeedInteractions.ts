/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useFeedInteractions.ts                             :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * Composes the feed engagement engine for one card — reactions + comments +
 * share — over the bridge. `available` gates the whole UI: it flips true only
 * after the reactions probe succeeds, so an absent/offline bridge degrades to
 * inert buttons (feature-detect lives in feedBridge). Replaces the old binary
 * Like; the like GET is intentionally no longer called.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import { currentUserId, feedFetch, feedUsable, toFeedUuid } from './feedBridge';
import { useFeedReactions } from './useFeedReactions';
import { useFeedComments } from './useFeedComments';
import { useFeedRealtime } from './useFeedRealtime';

export type { FeedReaction } from './useFeedReactions';
export type { FeedComment } from './useFeedComments';

export interface FeedShareResult { count: number; link: string }
export type FeedShareTarget = 'profile' | 'link' | 'dm';

export function useFeedInteractions(pageId: string) {
  // Normalise to the engagement UUID once — every bridge call + realtime topic
  // keys off this, so demo/non-UUID pages are engageable (see toFeedUuid).
  const feedId = useMemo(() => toFeedUuid(pageId), [pageId]);
  const usable = feedUsable(feedId);
  const myId = useMemo(() => currentUserId(), []);
  const { reactions, toggleReaction, probeCommentCount, workspaceId, refresh: refreshReactions } = useFeedReactions(feedId, usable);
  const { comments, loadComments, addComment, editComment, deleteComment } = useFeedComments(feedId, usable, myId);
  const [shareCount, setShareCount] = useState(0);

  // The loaded thread length is authoritative; before it loads, show the server
  // snapshot from the mount probe so the badge isn't blank on a commented post.
  const commentCount = comments?.length ?? probeCommentCount;

  // Seed the running share count from the server (others' shares), not just this
  // session's — mirrors the reactions probe. Reused as the realtime refresh.
  const refreshShareCount = useCallback(async () => {
    if (!usable) return;
    const reply = await feedFetch<{ count: number }>('GET', `/api/feed/${feedId}/share`);
    if (reply) setShareCount(reply.count);
  }, [feedId, usable]);
  useEffect(() => { void refreshShareCount(); }, [refreshShareCount]);

  // Live push: someone else reacted/commented/shared this post → refresh just that
  // slice (own echoes are already filtered inside the socket).
  const onRemote = useCallback((kind: 'reaction' | 'comment' | 'share') => {
    if (kind === 'reaction') void refreshReactions();
    else if (kind === 'comment') void loadComments();
    else void refreshShareCount();
  }, [refreshReactions, loadComments, refreshShareCount]);
  useFeedRealtime(feedId, workspaceId, usable, onRemote);

  const share = useCallback(async (target: FeedShareTarget, dmUserId?: string): Promise<FeedShareResult | null> => {
    if (!usable) return null;
    const reply = await feedFetch<{ ok: true; count: number; link: string }>('POST', `/api/feed/${feedId}/share`, { target, dmUserId });
    if (!reply) return null;
    setShareCount(reply.count);
    return { count: reply.count, link: reply.link };
  }, [feedId, usable]);

  return {
    // Gate on bridge-presence alone; a transient reactions-probe miss no longer
    // silences the whole card (only a real route-absent 404 flips usable false).
    available: usable,
    myId,
    reactions, toggleReaction,
    comments, commentCount, loadComments, addComment, editComment, deleteComment,
    share, shareCount,
  };
}
