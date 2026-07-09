/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useFeedReactions.ts                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * Discord-style multi-emoji reactions for one feed card. Optimistic: the pill
 * flips (mine + count ±1) immediately, then POST/DELETE confirms; any failure
 * (network, or 409 when >20 distinct emoji) reconciles via a refetch.
 */

import { useCallback, useEffect, useState } from 'react';

import { feedFetch } from './feedBridge';

export interface FeedReaction { emoji: string; count: number; mine: boolean }

/** Pure optimistic transform: returns the next pill list + whether we ADD. */
export function applyToggle(list: FeedReaction[], emoji: string): { next: FeedReaction[]; add: boolean } {
  const index = list.findIndex((reaction) => reaction.emoji === emoji);
  if (index === -1) return { next: [...list, { emoji, count: 1, mine: true }], add: true };
  const current = list[index];
  const add = !current.mine;
  const count = current.count + (add ? 1 : -1);
  const next = list.slice();
  if (count <= 0) next.splice(index, 1);
  else next[index] = { ...current, mine: add, count };
  return { next, add };
}

export function useFeedReactions(pageId: string, usable: boolean) {
  const [reactions, setReactions] = useState<FeedReaction[] | null>(null);
  // Server comment count at mount — rides along on the one reactions probe so the
  // card can show "💬 N" without a second request. The live thread length wins
  // once comments are loaded (see useFeedInteractions).
  const [probeCommentCount, setProbeCommentCount] = useState(0);
  // The realtime workspace this page publishes to (server-authoritative) — the
  // feed socket subscribes to it. Also on the probe, so no extra request.
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  // Re-pull the summary (reactions + comment count) — the mount probe AND the
  // handler realtime calls when someone else reacts.
  const refresh = useCallback(async () => {
    if (!usable) return;
    const reply = await feedFetch<{ reactions: FeedReaction[]; commentCount?: number; workspaceId?: string }>('GET', `/api/feed/${pageId}/reactions`);
    if (!reply) return;
    setReactions(reply.reactions);
    setProbeCommentCount(reply.commentCount ?? 0);
    if (reply.workspaceId) setWorkspaceId(reply.workspaceId);
  }, [pageId, usable]);

  useEffect(() => { void refresh(); }, [refresh]);

  const toggleReaction = useCallback(async (emoji: string) => {
    if (!usable) return;
    const add = !(reactions ?? []).find((reaction) => reaction.emoji === emoji)?.mine;
    // applyToggle is its own inverse per emoji, so optimistic-apply and rollback are
    // the SAME functional update — touches only this emoji, never clobbers a
    // concurrent toggle (unlike a whole-list refetch).
    const flip = () => setReactions((list) => applyToggle(list ?? [], emoji).next);
    flip();
    const ok = await feedFetch<{ ok: true }>(add ? 'POST' : 'DELETE', `/api/feed/${pageId}/reactions`, { emoji });
    if (!ok) flip(); // roll this one emoji back (network failure / 409 distinct-emoji cap)
  }, [pageId, usable, reactions]);

  return { reactions, toggleReaction, probeCommentCount, workspaceId, refresh };
}
