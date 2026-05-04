/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   dbmsStoreHelpers.ts                                :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/05 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/05 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { ExtendedDatabaseState } from "./dbmsStoreTypes";
import { LIVE_DB_SOURCES } from "./dbmsStoreTypes";
import { readViewFromHash, writeHash } from "../hooks/useDbSource";

let persistTimer: ReturnType<typeof setTimeout> | null = null;

export function flushState(get: () => ExtendedDatabaseState): void {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  const { databases, pages, views, activeDbmsSource } = get();
  // Live DB: only persist schema (databases + views) — pages live in the container
  const body = LIVE_DB_SOURCES.has(activeDbmsSource)
    ? { databases, views, _source: activeDbmsSource }
    : { databases, pages, views, _source: activeDbmsSource };
  fetch("/api/dbms/state", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch((err) => console.error("[dbms] State flush error:", err));
}

/** Dispatches an ops request for query generation (fire-and-forget). */
export function dispatchOps(
  action: string,
  payload: Record<string, unknown>,
  source: string,
): void {
  fetch("/api/dbms/ops", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, _source: source, ...payload }),
  }).catch(() => {
    /* ops dispatch is best-effort */
  });
}

export async function switchSource(
  source: string,
  set: (partial: Partial<ExtendedDatabaseState>) => void,
): Promise<void> {
  const switchRes = await fetch("/api/dbms/source", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source }),
  });
  if (!switchRes.ok) throw new Error(`Switch failed: ${switchRes.statusText}`);
  const switched = await switchRes.json();
  const hashView = readViewFromHash();
  const firstView = Object.keys(switched.views)[0] ?? null;
  const viewId = hashView && switched.views[hashView] ? hashView : firstView;
  set({
    databases: switched.databases,
    pages: switched.pages,
    views: switched.views,
    activeViewId: viewId,
    activeDbmsSource: source,
    dbmsLoading: false,
  });
  writeHash(source, viewId);
}

export async function loadInitialState(
  set: (partial: Partial<ExtendedDatabaseState>) => void,
  get: () => ExtendedDatabaseState,
): Promise<void> {
  const res = await fetch("/api/dbms/state");
  if (!res.ok) throw new Error(`Load failed: ${res.statusText}`);
  const state = await res.json();
  const serverSource = state._source as string | undefined;
  const hashView = readViewFromHash();
  const firstView = Object.keys(state.views)[0] ?? null;
  const currentView = get().activeViewId;

  let viewId: string | null;
  if (currentView && state.views[currentView]) viewId = currentView;
  else if (hashView && state.views[hashView]) viewId = hashView;
  else viewId = firstView;
  set({
    databases: state.databases,
    pages: state.pages,
    views: state.views,
    activeViewId: viewId,
    activeDbmsSource: serverSource ?? get().activeDbmsSource,
    dbmsLoading: false,
  });
  if (serverSource) writeHash(serverSource, viewId);
}

/** Sends a debounced property-persist request to the DBMS server. */
export function sendPersistRequest(
  pageId: string,
  propertyId: string,
  value: unknown,
  sourceAtCallTime: string,
  timers: Map<string, ReturnType<typeof setTimeout>>,
  getSource: () => string,
): void {
  timers.delete(`${pageId}::${propertyId}`);
  if (getSource() !== sourceAtCallTime) {
    console.log(
      `[dbms] Persist skipped: source changed (${sourceAtCallTime} → ${getSource()})`,
    );
    return;
  }
  fetch(`/api/dbms/pages/${encodeURIComponent(pageId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ propertyId, value, _source: sourceAtCallTime }),
  }).catch((err) => console.error("[dbms] Persist error:", err));
}

export const persistTimers = new Map<string, ReturnType<typeof setTimeout>>();

/** Update database metadata via API. */
export async function persistDatabaseMetadata(
  databaseId: string,
  updates: { name?: string; icon?: string; description?: string },
  source: string,
): Promise<void> {
  try {
    await fetch(`/api/dbms/databases/${databaseId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...updates, _source: source }),
    });
  } catch (err) {
    console.error("[dbms] Database metadata persist error:", err);
  }
}

/** Create a new view via API. */
export async function persistViewCreate(
  view: Record<string, unknown>,
  source: string,
): Promise<void> {
  try {
    await fetch("/api/dbms/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...view, _source: source }),
    });
  } catch (err) {
    console.error("[dbms] View create error:", err);
  }
}

/** Update a view via API. */
export async function persistViewUpdate(
  viewId: string,
  updates: Record<string, unknown>,
  source: string,
): Promise<void> {
  try {
    await fetch(`/api/dbms/views/${viewId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...updates, _source: source }),
    });
  } catch (err) {
    console.error("[dbms] View update error:", err);
  }
}

/** Delete a view via API. */
export async function persistViewDelete(
  viewId: string,
  source: string,
): Promise<void> {
  try {
    await fetch(`/api/dbms/views/${viewId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _source: source }),
    });
  } catch (err) {
    console.error("[dbms] View delete error:", err);
  }
}
