/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   liveCrossMount.ts                                  :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/26 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/06/26 12:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * Cross-mount relation seam. A foreign key whose target table lives in ANOTHER
 * mount (e.g. an IoT `device.product_ref` pointing at the commerce mount's
 * `products`) can only be resolved if the inference knows every mount's table
 * set. That catalog lives in the embedding app (it knows all the user's
 * mounts); the app registers a provider here (inversion of control, exactly
 * like dataSourceRegistry) and the submodule reads it. The catalog is already
 * access-scoped by the app/bridge, so cross-mount resolution can only reach
 * mounts the user may read.
 */

/** One mount and the names of the tables it exposes. */
export interface LiveMountTableSet {
  dbId: string;
  tables: string[];
}

type CrossMountCatalogProvider = () => Promise<LiveMountTableSet[]>;

let catalogProvider: CrossMountCatalogProvider | null = null;
/** Memoized so opening a table doesn't re-fetch every mount's schema each time
 *  (a per-open burst that, with the browser's ~6-connections-per-host cap, can
 *  stall/fail the primary load). One fetch per TTL, shared across concurrent
 *  opens via the in-flight promise. */
const CATALOG_TTL_MS = 60_000;
let cached: { value: LiveMountTableSet[]; expiresAt: number } | null = null;
let inflight: Promise<LiveMountTableSet[]> | null = null;

/** App-side registration of the all-mounts table catalog (null clears it). */
export function registerCrossMountCatalog(provider: CrossMountCatalogProvider | null): void {
  catalogProvider = provider;
  cached = null;
  inflight = null;
}

/** The registered catalog (cached), or [] when none is registered / it fails
 *  (so cross-mount resolution degrades cleanly to same-mount only). */
export async function getCrossMountCatalog(): Promise<LiveMountTableSet[]> {
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  if (inflight) return inflight;
  if (!catalogProvider) return [];
  const provider = catalogProvider;
  inflight = (async () => {
    try {
      const value = await provider();
      cached = { value, expiresAt: Date.now() + CATALOG_TTL_MS };
      return value;
    } catch {
      return cached?.value ?? []; // keep the last good catalog on a transient failure
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}
