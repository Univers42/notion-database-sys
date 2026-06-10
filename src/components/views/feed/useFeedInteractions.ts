/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useFeedInteractions.ts                             :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/10 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * Feed likes/comments against the osionos bridge (`/api/feed/:pageId/...`).
 * notion-database-sys decoupling rule: resolve the bridge URL + app JWT from
 * env/globals, never import app feature modules. Feature-detects ONCE — the
 * first hard failure (no bridge route / network down) silences the whole
 * feature so playground/offline feeds keep their inert buttons.
 */

import { useCallback, useEffect, useState } from 'react';

const env = (import.meta.env ?? {}) as Record<string, string | undefined>;
const BRIDGE_URL = (env.VITE_API_URL ?? '').trim().replace(/\/$/, '');
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let featurePresent: boolean | null = null; // null = not probed yet

function bridgeJwt(): string | null {
  try {
    const store = (globalThis as Record<string, unknown>).__playgroundUserStore as
      | { getState: () => { activePageJwt?: () => string | null; activeJwt?: () => string | null } }
      | undefined;
    const state = store?.getState();
    return state?.activePageJwt?.() || state?.activeJwt?.() || null;
  } catch {
    return null;
  }
}

async function feedFetch<T>(method: string, path: string, body?: unknown): Promise<T | null> {
  const jwt = bridgeJwt();
  if (!BRIDGE_URL || !jwt || featurePresent === false) return null;
  try {
    const response = await fetch(`${BRIDGE_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (response.status === 404 && featurePresent === null) featurePresent = false; // route absent
    if (!response.ok) return null;
    featurePresent = true;
    return await response.json() as T;
  } catch {
    if (featurePresent === null) featurePresent = false; // bridge unreachable
    return null;
  }
}

export interface FeedLikes { count: number; likedByMe: boolean }
export interface FeedComment { id: string; authorName: string; content: string; createdAt: string }

export function useFeedInteractions(pageId: string) {
  const usable = UUID_RE.test(pageId) && Boolean(BRIDGE_URL) && featurePresent !== false;
  const [likes, setLikes] = useState<FeedLikes | null>(null);
  const [comments, setComments] = useState<FeedComment[] | null>(null);

  useEffect(() => {
    let alive = true;
    if (!usable) return undefined;
    void feedFetch<FeedLikes>('GET', `/api/feed/${pageId}/likes`).then((reply) => {
      if (alive && reply) setLikes(reply);
    });
    return () => { alive = false; };
  }, [pageId, usable]);

  const toggleLike = useCallback(async () => {
    if (!usable) return;
    const reply = await feedFetch<FeedLikes>(likes?.likedByMe ? 'DELETE' : 'POST', `/api/feed/${pageId}/like`);
    if (reply) setLikes(reply);
  }, [pageId, usable, likes?.likedByMe]);

  const loadComments = useCallback(async () => {
    if (!usable) return;
    const reply = await feedFetch<{ comments: FeedComment[] }>('GET', `/api/feed/${pageId}/comments`);
    if (reply) setComments(reply.comments);
  }, [pageId, usable]);

  const addComment = useCallback(async (content: string) => {
    if (!usable || !content.trim()) return;
    const reply = await feedFetch<{ comment: FeedComment }>('POST', `/api/feed/${pageId}/comments`, { content: content.trim() });
    if (reply) setComments((current) => [...(current ?? []), reply.comment]);
  }, [pageId, usable]);

  return { available: usable && likes !== null, likes, comments, toggleLike, loadComments, addComment };
}
