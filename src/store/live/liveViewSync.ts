import type { ViewConfig } from '../../component/types';
import { requestLive } from './liveMountClient';
import { postLiveWrite } from './liveWriteClient';

/**
 * A live mount's views follow the account (#252): localStorage alone left a saved
 * view in the browser that made it. They live in the owner's object-database table
 * under their own key prefix, so no schema change, and the object-database sync
 * skips that prefix. Views are UI config: nothing here touches the engine.
 *
 * Caveat: last writer wins across browsers, and a push lost offline is only retried by
 * the next view edit. A key over the bridge's limit (a table name past ~70 characters)
 * stays local rather than being truncated onto another table's views.
 */
export const LIVE_VIEWS_KEY_PREFIX = 'liveviews:';

const DB_KEY_MAX = 128;
const PUSH_DEBOUNCE_MS = 1_000;
const pendingPushes = new Map<string, ReturnType<typeof setTimeout>>();

type Views = Record<string, ViewConfig>;

export function liveViewsKey(databaseId: string): string | null {
  const key = `${LIVE_VIEWS_KEY_PREFIX}${databaseId}`;
  return key.length <= DB_KEY_MAX ? key : null;
}

/** The account's saved views, or null when it has none or the bridge is unreachable. */
export async function pullLiveViews(databaseId: string): Promise<Views | null> {
  const key = liveViewsKey(databaseId);
  if (!key) return null;
  try {
    const { databases } = await requestLive<{ databases?: { state?: { views?: Views } }[] }>(
      `/api/object-databases?dbKey=${encodeURIComponent(key)}`,
      { method: 'GET' },
    );
    return databases?.[0]?.state?.views ?? null;
  } catch {
    return null;
  }
}

/** Debounced: a drag of a column emits one view change per frame. */
export function pushLiveViews(databaseId: string, views: Views): void {
  const key = liveViewsKey(databaseId);
  if (!key) return;
  clearTimeout(pendingPushes.get(key));
  pendingPushes.set(key, setTimeout(() => {
    pendingPushes.delete(key);
    void postLiveWrite('/api/object-databases', { dbKey: key, title: 'Live views', state: { views } });
  }, PUSH_DEBOUNCE_MS));
}
