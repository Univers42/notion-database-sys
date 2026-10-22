/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useFeedComments.ts                                 :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/10/22 14:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * Persistent per-profile comment thread for one feed card: load (oldest→newest),
 * add (optimistic temp id, replaced by the server object), edit + delete (own
 * only), one level of replies via parentId. Failures roll the optimistic state
 * back so the UI never drifts from the server.
 *
 * A write may also be ANSWERED: L0 runs before the comment is written, so a
 * risky comment comes back as a 409 warning and NOTHING is written until the
 * author says "post it anyway" (`acknowledgeWarning`). The answer is TYPED, so
 * the composer can show it — and keep the author's words, which a silent
 * failure used to swallow.
 */

import { useCallback, useState } from 'react';

import { feedFetch, feedFetchResult, type FeedFetchResult } from './feedBridge';

export interface FeedComment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string | null;
  content: string;
  createdAt: string;
  updatedAt?: string | null;
  parentId?: string | null;
  /** The soft moderation state: 'held' means only the author sees it. */
  moderationState?: 'visible' | 'held' | 'removed' | null;
}

/**
 * What L0 answered before the comment was written: the author's own words may
 * hurt someone. The terms are the words that tripped a rule — they belong to
 * this screen and to nothing else.
 */
export interface FeedModerationWarning {
  message: string;
  reasons: string[];
  terms: string[];
}

/** The typed answer of a comment write: written, warned about, or failed. */
export type FeedCommentWriteResult =
  | { ok: true }
  | { ok: false; warning: FeedModerationWarning }
  | { ok: false, failed: true };

function tempComment(myId: string | null, content: string, parentId?: string): FeedComment {
  return {
    id: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    authorId: myId ?? '', authorName: 'You', authorAvatar: null,
    content, createdAt: new Date().toISOString(), updatedAt: null, parentId: parentId ?? null,
  };
}

/**
 * The 409's warning, when the answer is one. The lists sit at the top level of
 * the body and again in `details` — the app's HTTP client keeps the envelope's
 * known fields only, so the flat lists may be missing.
 */
function warningFrom(reply: { status: number; body: unknown }): FeedModerationWarning | null {
  if (reply.status !== 409) return null;
  const body = reply.body as {
    code?: unknown; message?: unknown; reasons?: unknown; terms?: unknown;
    details?: { reasons?: unknown; terms?: unknown };
  } | null;
  if (!body || body.code !== 'moderation_warning') return null;
  const details = body.details ?? {};
  const list = (value: unknown): string[] => (Array.isArray(value) ? value.map(String) : []);
  return {
    message: typeof body.message === 'string' && body.message
      ? body.message
      : 'This may hurt someone. Edit it, or post it anyway.',
    reasons: list(body.reasons ?? details.reasons),
    terms: list(body.terms ?? details.terms),
  };
}

/** The typed answer of a write: written, warned about, or failed. */
export function writeResult(reply: FeedFetchResult<FeedComment>): FeedCommentWriteResult {
  if (reply === null) return { ok: false, failed: true };
  if (reply.ok) return { ok: true };
  const warning = warningFrom(reply);
  return warning ? { ok: false, warning } : { ok: false, failed: true };
}

/**
 * The list after an add: the saved comment takes the optimistic one's place; a
 * failure — a warning above all — takes the optimistic one back out. The words
 * themselves are the COMPOSER's business: it keeps them for the next try.
 */
export function applyAddResult(
  current: FeedComment[] | null,
  temp: FeedComment,
  reply: FeedFetchResult<FeedComment>,
): FeedComment[] {
  const base = current ?? [];
  if (reply && reply.ok) return base.map((c) => (c.id === temp.id ? reply.data : c));
  return base.filter((c) => c.id !== temp.id);
}

/**
 * The add's round-trip, without React: the request and the bridge's answer.
 * The hook owns the state; this owns the wire, so the same path runs under a
 * test with a stubbed fetch.
 */
export async function addFeedComment(
  pageId: string,
  content: string,
  parentId: string | undefined,
  acknowledgeWarning: boolean,
): Promise<FeedFetchResult<FeedComment>> {
  return feedFetchResult<FeedComment>('POST', `/api/feed/${pageId}/comments`, {
    content, parentId, acknowledgeWarning,
  });
}

export function useFeedComments(pageId: string, usable: boolean, myId: string | null) {
  const [comments, setComments] = useState<FeedComment[] | null>(null);

  const loadComments = useCallback(async () => {
    if (!usable) return;
    const reply = await feedFetch<{ comments: FeedComment[] }>('GET', `/api/feed/${pageId}/comments`);
    if (reply) setComments(reply.comments);
  }, [pageId, usable]);

  const addComment = useCallback(async (
    content: string,
    parentId?: string,
    acknowledgeWarning?: boolean,
  ): Promise<FeedCommentWriteResult> => {
    const text = content.trim();
    if (!usable || !text) return { ok: false, failed: true };
    const temp = tempComment(myId, text, parentId);
    setComments((current) => [...(current ?? []), temp]);
    const reply = await addFeedComment(pageId, text, parentId, acknowledgeWarning === true);
    // The optimistic comment goes back out when the write did not land — the
    // author's words are NOT lost: the composer still holds them.
    setComments((current) => applyAddResult(current, temp, reply));
    return writeResult(reply);
  }, [pageId, usable, myId]);

  const editComment = useCallback(async (
    id: string,
    content: string,
    acknowledgeWarning?: boolean,
  ): Promise<FeedCommentWriteResult> => {
    const text = content.trim();
    if (!usable || !text) return { ok: false, failed: true };
    const prev = (comments ?? []).find((c) => c.id === id); // pre-edit value of THIS comment only
    setComments((current) => (current ?? []).map((c) => (c.id === id ? { ...c, content: text, updatedAt: new Date().toISOString() } : c)));
    const reply = await feedFetchResult<FeedComment>('PUT', `/api/feed/${pageId}/comments/${id}`, {
      content: text, acknowledgeWarning: acknowledgeWarning === true,
    });
    // Functional, id-scoped reconcile: only this comment changes, so a concurrent
    // add/edit/delete of another comment during the round-trip is never lost.
    // A failed write puts the pre-edit words back where they were.
    setComments((current) => (current ?? []).map((c) => (c.id === id ? (reply && reply.ok ? reply.data : (prev ?? c)) : c)));
    return writeResult(reply);
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
