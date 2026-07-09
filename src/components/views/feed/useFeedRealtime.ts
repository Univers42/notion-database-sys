/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useFeedRealtime.ts                                 :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * Live feed updates. The bridge publishes `feed_<kind>` on `feed:<workspaceId>`
 * after every mutation; this reuses the submodule's own LiveRealtimeSocket (no
 * app imports, no new infra) to receive them. One socket per DISTINCT workspace
 * is shared across every mounted card on it (ref-counted) — cards register by
 * pageId and get a callback when someone else touches their post (own echoes are
 * filtered, since the actor already applied the change optimistically). The
 * workspace is the server-authoritative one from the reactions probe — NOT
 * decoded from the token, which the demo's namespace-less token doesn't carry.
 * No credential / no WebSocket → cards just don't live-refresh; nothing breaks.
 */

import { useEffect } from 'react';

import { LiveRealtimeSocket, type LiveRealtimeEventFrame } from '../../../store/live/liveRealtimeSocket';
import { resolveLiveRealtimeToken, liveRealtimeUrl } from '../../../store/live/liveRealtime';
import { currentUserId } from './feedBridge';

export type FeedEventKind = 'reaction' | 'comment' | 'share';
type Listener = (kind: FeedEventKind) => void;

// One socket per distinct feed workspace, ref-counted across mounted cards.
const sockets = new Map<string, Pick<LiveRealtimeSocket, 'start' | 'stop'>>();
const refs = new Map<string, number>();          // workspace → live card count
const listeners = new Map<string, Set<Listener>>(); // pageId → callbacks

/** Collapse the bridge's kinds (like and reaction; any comment variant; share)
 *  onto the three refresh slices the card understands; else ignore. */
function toKind(eventType: string): FeedEventKind | null {
  const raw = eventType.slice('feed_'.length);
  if (raw === 'reaction' || raw === 'like') return 'reaction';
  if (raw.startsWith('comment')) return 'comment';
  if (raw === 'share') return 'share';
  return null;
}

function dispatch(frame: LiveRealtimeEventFrame): void {
  if (!frame.event_type?.startsWith('feed_')) return;
  const kind = toKind(frame.event_type);
  if (!kind) return;
  const payload = (frame.payload ?? {}) as { pageId?: string; userId?: string };
  if (!payload.pageId) return;
  if (payload.userId && payload.userId === currentUserId()) return; // our own echo
  listeners.get(payload.pageId)?.forEach((callback) => callback(kind));
}

function acquire(workspace: string): void {
  refs.set(workspace, (refs.get(workspace) ?? 0) + 1);
  if (sockets.has(workspace)) return;
  const url = liveRealtimeUrl();
  const token = resolveLiveRealtimeToken();
  if (!url || !token) return; // no credential to offer the gateway
  const socket = new LiveRealtimeSocket({ url, token, topic: `feed:${workspace}`, onEvent: dispatch });
  sockets.set(workspace, socket);
  socket.start();
}

function release(workspace: string): void {
  const next = (refs.get(workspace) ?? 1) - 1;
  if (next > 0) { refs.set(workspace, next); return; }
  refs.delete(workspace);
  sockets.get(workspace)?.stop();
  sockets.delete(workspace);
}

/** Subscribe one card to live reaction/comment/share events for its page, on the
 *  workspace the server publishes them to (from the reactions probe). */
export function useFeedRealtime(pageId: string, workspaceId: string | null, usable: boolean, onRemote: Listener): void {
  useEffect(() => {
    if (!usable || !workspaceId) return undefined;
    let set = listeners.get(pageId);
    if (!set) { set = new Set(); listeners.set(pageId, set); }
    set.add(onRemote);
    acquire(workspaceId);
    return () => {
      set.delete(onRemote);
      if (set.size === 0) listeners.delete(pageId);
      release(workspaceId);
    };
  }, [pageId, workspaceId, usable, onRemote]);
}
