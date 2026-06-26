/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   liveViewStore.ts                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/26 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/26 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * localStorage persistence for the VIEWS a user creates/edits on a LIVE mount
 * table (id `baas:<dbId>:<table>`). The live adapter is read-mostly: row edits
 * sync through the engine outbox, but VIEWS are pure UI config with no engine
 * home, so without this they vanish on reload (buildLiveViews only regenerates
 * defaults). One shared key holds a `databaseId → views` map (mirrors the
 * liveWriteOutbox single-key shape); the adapter saves its own db's views on
 * change and merges them over the rebuilt defaults on load. Engine-free.
 */

import type { ViewConfig } from '../../component/types';

const LIVE_VIEW_STATE_KEY = 'osionos.liveViewState.v1';

type StoredViews = Record<string, Record<string, ViewConfig>>;

function storage(): Storage | null {
  try {
    return globalThis.window === undefined ? null : globalThis.localStorage;
  } catch {
    return null;
  }
}

function readAll(): StoredViews {
  try {
    const raw = storage()?.getItem(LIVE_VIEW_STATE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? (parsed as StoredViews) : {};
  } catch {
    return {};
  }
}

/** Persisted views for one live database (empty when none / unavailable). */
export function loadLiveViews(databaseId: string): Record<string, ViewConfig> {
  const stored = readAll()[databaseId];
  return stored && typeof stored === 'object' ? stored : {};
}

/** Replace the stored views for one live database (the full current set). An
 *  empty set clears the entry so a fully-reset table stops shadowing defaults. */
export function saveLiveViews(databaseId: string, views: Record<string, ViewConfig>): void {
  const target = storage();
  if (!target) return;
  const all = readAll();
  if (Object.keys(views).length === 0) {
    delete all[databaseId];
  } else {
    all[databaseId] = views;
  }
  try {
    target.setItem(LIVE_VIEW_STATE_KEY, JSON.stringify(all));
  } catch {
    // quota / private mode — views just won't persist this session.
  }
}
