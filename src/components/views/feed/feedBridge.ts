/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   feedBridge.ts                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * Single transport + identity seam for the feed engagement UI (reactions /
 * comments / share) against the osionos bridge (`/api/feed/:pageId/...`).
 *
 * notion-database-sys decoupling rule: resolve the bridge URL + app JWT +
 * current user from env/globals, never import app feature modules. Feature-
 * detects ONCE — the first hard failure (no bridge route / network down)
 * silences the whole feature so playground/offline feeds stay inert.
 */

const env = (import.meta.env ?? {}) as Record<string, string | undefined>;
export const BRIDGE_URL = (env.VITE_API_URL ?? '').trim().replace(/\/$/, '');
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let featurePresent: boolean | null = null; // null = not probed yet

interface UserStoreShape {
  getState: () => {
    activePageJwt?: () => string | null;
    activeJwt?: () => string | null;
    activePersona?: () => { id?: string | null } | null;
  };
}

function userStore(): UserStoreShape | undefined {
  return (globalThis as Record<string, unknown>).__playgroundUserStore as UserStoreShape | undefined;
}

export function bridgeJwt(): string | null {
  try {
    const state = userStore()?.getState();
    return state?.activePageJwt?.() || state?.activeJwt?.() || null;
  } catch {
    return null;
  }
}

/** Current signed-in user id — drives the "own comment" edit/delete gate. */
export function currentUserId(): string | null {
  try {
    return userStore()?.getState().activePersona?.()?.id ?? null;
  } catch {
    return null;
  }
}

export async function feedFetch<T>(method: string, path: string, body?: unknown): Promise<T | null> {
  const jwt = bridgeJwt();
  if (!BRIDGE_URL || !jwt || featurePresent === false) return null;
  try {
    const response = await fetch(`${BRIDGE_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    // Feature-detect only on a probe (GET) 404 = route truly absent. A 404 from a
    // PUT/DELETE is a resource-not-found (comment gone), NOT an absent feature.
    if (response.status === 404 && featurePresent === null && method === 'GET') featurePresent = false;
    if (!response.ok) return null;
    featurePresent = true;
    return await response.json() as T;
  } catch {
    // Transient (offline/DNS/timeout) — never latch the whole feature off. A later
    // call can still succeed; only an explicit route-absent 404 disables it.
    return null;
  }
}

/**
 * cyrb128 → a deterministic v5-shaped UUID. Feed cards for demo/seed/live-DB rows
 * carry short ids (`pj1`, `crm-lead`), not UUIDs, but the bridge + engagement
 * tables are keyed by UUID — so a non-UUID id would make the whole card inert.
 * Deriving a STABLE UUID (pure function of the id) keeps engagement working AND
 * shared: every client viewing the same page derives the same key.
 */
function hashToUuid(input: string): string {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0; i < input.length; i += 1) {
    const k = input.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  const hex = [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0].map((n) => n.toString(16).padStart(8, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

/** The engagement key for a feed page: real UUID pass-through, else a stable
 *  derived UUID — so EVERY page (demo/seed/live-DB included) is engageable. */
export function toFeedUuid(pageId: string): string {
  return UUID_RE.test(pageId) ? pageId : hashToUuid(pageId);
}

/** Engageable when there's a page id and a live bridge (id is normalised to a UUID
 *  by toFeedUuid, so a non-UUID demo id no longer silences the card). */
export function feedUsable(pageId: string): boolean {
  return Boolean(pageId) && Boolean(BRIDGE_URL) && featurePresent !== false;
}
