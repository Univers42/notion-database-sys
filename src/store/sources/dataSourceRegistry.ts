/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   dataSourceRegistry.ts                              :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 12:00:00 by dlesieur          #+#    #+#             */
/*                                                +#+#+#+#+#+   +#+           */
/* ************************************************************************** */

/**
 * App→NDS injection point for the account-wide data-source catalog (same
 * composable pattern as liveViewPresets): the embedding app registers
 * providers that know how to LIST every database a view could bind to
 * (live mounts → tables, workspace tables, local demo databases) and how to
 * LOAD one of them as a mergeable state slice. NDS itself stays free of app
 * imports; without a registered provider the Source picker shows an empty
 * catalog and rebinding is unavailable.
 */

import type { DatabaseSchema, Page } from '../../component/types';

/** One pickable source in the catalog (a database id a view can bind to). */
export interface DataSourceDescriptor {
  id: string;
  name: string;
  /** Section header in the picker (mount name, "Workspace", "Demo data"…). */
  group: string;
  /** Engine chip (postgresql/mysql/mongodb) when the source is a live mount. */
  engineBadge?: string;
  columnCount?: number;
  /** Bound views render this source but edits will not persist to it. */
  readOnly?: boolean;
}

/** A loaded source: state slice mergeable into a running store (no views). */
export interface LoadedDataSource {
  databases: Record<string, DatabaseSchema>;
  pages: Record<string, Page>;
  readOnly?: boolean;
}

export interface DataSourceProvider {
  listSources(): Promise<DataSourceDescriptor[]>;
  /** The source's database(s)+pages, or null when the id is not theirs. */
  loadDatabase(sourceId: string): Promise<LoadedDataSource | null>;
}

const providers: DataSourceProvider[] = [];

/** App-side registration. COMPOSABLE: providers accumulate in registration
 *  order. Re-registering the same provider is a no-op; `null` clears (tests). */
export function registerDataSourceProvider(provider: DataSourceProvider | null): void {
  if (provider === null) {
    providers.length = 0;
    return;
  }
  if (!providers.includes(provider)) providers.push(provider);
}

/** The full catalog across providers; a broken provider is isolated (its
 *  sources are simply missing) and duplicate ids keep the first descriptor. */
export async function listRegisteredDataSources(): Promise<DataSourceDescriptor[]> {
  const settled = await Promise.allSettled(providers.map((provider) => provider.listSources()));
  const seen = new Set<string>();
  const catalog: DataSourceDescriptor[] = [];
  for (const result of settled) {
    if (result.status !== 'fulfilled') continue;
    for (const descriptor of result.value) {
      if (seen.has(descriptor.id)) continue;
      seen.add(descriptor.id);
      catalog.push(descriptor);
    }
  }
  return catalog;
}

/** Load one source through the first provider that claims it (errors from a
 *  provider that DID claim the id propagate — the picker reports them). */
export async function loadRegisteredDataSource(sourceId: string): Promise<LoadedDataSource | null> {
  for (const provider of providers) {
    const loaded = await provider.loadDatabase(sourceId);
    if (loaded) return loaded;
  }
  return null;
}
