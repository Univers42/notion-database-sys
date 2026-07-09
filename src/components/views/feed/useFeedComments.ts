/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useFeedComments.ts                                 :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * Persistent per-profile comment thread for one feed card: load (oldest→newest),
 * add (optimistic temp id, replaced by the server object), edit + delete (own
 * only), one level of replies via parentId. Failures roll the optimistic state
 * back so the UI never drifts from the server.
 */

import { useCallback, useState } from 'react';

import { feedFetch } from './feedBridge';

export interface FeedComment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string | null;
  content: string;
  createdAt: string;
  updatedAt?: string | null;
  parentId?: string | null;
}

function tempComment(myId: string | null, content: string, parentId?: string): FeedComment {
  return {
    id: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    authorId: myId ?? '', authorName: 'You', authorAvatar: null,
    content, createdAt: new Date().toISOString(), updatedAt: null, parentId: parentId ?? null,
  };
}

export function useFeedComments(pageId: string, usable: boolean, myId: string | null) {
  const [comments, setComments] = useState<FeedComment[] | null>(null);

  const loadComments = useCallback(async () => {
    if (!usable) return;
    const reply = await feedFetch<{ comments: FeedComment[] }>('GET', `/api/feed/${pageId}/comments`);
    if (reply) setComments(reply.comments);
  }, [pageId, usable]);

  const addComment = useCallback(async (content: string, parentId?: string) => {
    const text = content.trim();
    if (!usable || !text) return;
    const temp = tempComment(myId, text, parentId);
    setComments((current) => [...(current ?? []), temp]);
    const saved = await feedFetch<FeedComment>('POST', `/api/feed/${pageId}/comments`, { content: text, parentId });
    setComments((current) => {
      const base = current ?? [];
      return saved ? base.map((c) => (c.id === temp.id ? saved : c)) : base.filter((c) => c.id !== temp.id);
    });
  }, [pageId, usable, myId]);

  const editComment = useCallback(async (id: string, content: string) => {
    const text = content.trim();
    if (!usable || !text) return;
    const prev = (comments ?? []).find((c) => c.id === id); // pre-edit value of THIS comment only
    setComments((current) => (current ?? []).map((c) => (c.id === id ? { ...c, content: text, updatedAt: new Date().toISOString() } : c)));
    const saved = await feedFetch<FeedComment>('PUT', `/api/feed/${pageId}/comments/${id}`, { content: text });
    // Functional, id-scoped reconcile: only this comment changes, so a concurrent
    // add/edit/delete of another comment during the round-trip is never lost.
    setComments((current) => (current ?? []).map((c) => (c.id === id ? (saved ?? prev ?? c) : c)));
  }, [pageId, usable, comments]);

  const deleteComment = useCallback(async (id: string) => {
    if (!usable) return;
    const removed = (comments ?? []).filter((c) => c.id === id || c.parentId === id); // the subtree we drop
    setComments((current) => (current ?? []).filter((c) => c.id !== id && c.parentId !== id));
    const ok = await feedFetch<{ ok: true }>('DELETE', `/api/feed/${pageId}/comments/${id}`);
    if (!ok) setComments((current) => { // re-insert only what's still missing — keep concurrent changes
      const base = current ?? [];
      const have = new Set(base.map((c) => c.id));
      return [...base, ...removed.filter((c) => !have.has(c.id))];
    });
  }, [pageId, usable, comments]);

  return { comments, loadComments, addComment, editComment, deleteComment };
}
