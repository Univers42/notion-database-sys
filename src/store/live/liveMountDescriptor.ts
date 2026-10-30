/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   liveMountDescriptor.ts                             :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/10/29 21:30:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/10/30 05:40:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * Where a live mount's data lives (G4): grobase's credential-free descriptor, read
 * through the bridge (`GET /api/databases/:dbId/descriptor`), and its display form.
 */

import { requestLive } from './liveMountClient';

export interface MountDescriptor {
  id: string;
  name?: string;
  engine: string;
  isolation?: string;
  credential_mode?: string;
  location: 'network' | 'platform' | 'file' | 'memory' | 'unknown' | string;
  host?: string;
  port?: number;
  file?: string;
  database?: string;
  tls: 'verify' | 'on' | 'insecure' | 'off' | 'default' | 'n/a' | 'unknown' | string;
  created_at?: string;
  last_healthy_at?: string | null;
}

export type TlsTone = 'secure' | 'plain' | 'warning' | 'neutral';

export interface MountLocationView {
  engine: string;
  where: string;
  tls: { label: string; tone: TlsTone } | null;
}

const ENGINE_NAMES: Record<string, string> = {
  postgresql: 'PostgreSQL', cockroachdb: 'CockroachDB', mysql: 'MySQL', mariadb: 'MariaDB',
  mongodb: 'MongoDB', redis: 'Redis', sqlite: 'SQLite', mssql: 'SQL Server',
  http: 'HTTP API', dynamodb: 'DynamoDB',
};

const TLS_VIEW: Record<string, { label: string; tone: TlsTone }> = {
  verify: { label: 'TLS, certificate verified', tone: 'secure' },
  on: { label: 'TLS', tone: 'secure' },
  insecure: { label: 'TLS, certificate not verified', tone: 'warning' },
  off: { label: 'No TLS', tone: 'plain' },
  default: { label: 'TLS: driver default', tone: 'neutral' },
};

export function engineDisplayName(engine: string): string {
  return ENGINE_NAMES[engine] ?? engine;
}

/** The descriptor as the toolbar says it: engine, a one-line "where", and the TLS
 *  the DSN requests (null where TLS does not apply or is unknown). */
export function formatMountLocation(d: MountDescriptor): MountLocationView {
  return { engine: engineDisplayName(d.engine), where: describeWhere(d), tls: TLS_VIEW[d.tls] ?? null };
}

function describeWhere(d: MountDescriptor): string {
  const db = d.database ? `/${d.database}` : '';
  switch (d.location) {
    case 'network':
      return `${d.host ?? ''}${d.port ? `:${d.port}` : ''}${db}`;
    case 'file':
      return d.file ?? 'file';
    case 'memory':
      return 'in memory';
    case 'platform':
      return d.database ? `platform${db}` : 'platform-hosted';
    default:
      return d.credential_mode && d.credential_mode !== 'inline' ? `via ${d.credential_mode}` : 'location not shown';
  }
}

// The descriptor changes only when the mount is re-pointed, so one fetch per mount
// per page life is enough. Caveat: a mount PATCHed in another tab keeps its old
// label here until reload; a failed fetch is not cached, so the next open retries.
const cache = new Map<string, Promise<MountDescriptor | null>>();

export function fetchMountDescriptor(dbId: string): Promise<MountDescriptor | null> {
  const hit = cache.get(dbId);
  if (hit) return hit;
  const pending = requestLive<{ descriptor?: MountDescriptor }>(
    `/api/databases/${encodeURIComponent(dbId)}/descriptor`,
    { method: 'GET' },
  ).then(
    (body) => (body?.descriptor?.engine ? body.descriptor : null),
    (error: unknown) => {
      cache.delete(dbId);
      throw error;
    },
  );
  cache.set(dbId, pending);
  return pending;
}

/** The query-router's live probe, as the bridge allowlists it (grobase ADR 0013). */
export interface MountProbe {
  available: boolean;
  server_version?: string;
  tls?: string;
  tls_version?: string;
}

export interface MountProbeView {
  server: string | null;
  connection: { label: string; tone: TlsTone } | null;
}

/** What the pool's own connection says: the server version and the TLS it opened with.
 *  A probe the platform disables (the default) or cannot read stays silent (all null). */
export function formatMountProbe(p: MountProbe | null): MountProbeView {
  if (!p?.available) return { server: null, connection: null };
  const v = p.server_version ?? '';
  const server = v === 'platform' ? 'Managed (version hidden)' : /^\d+(\.\d+){0,3}$/.test(v) ? v : null;
  const proto = /^TLSv1\.[23]$/.test(p.tls_version ?? '') ? ` ${p.tls_version!.slice(4)}` : '';
  const connection: Record<string, { label: string; tone: TlsTone }> = {
    verified: { label: `TLS${proto}, certificate verified`, tone: 'secure' },
    encrypted: { label: `TLS${proto}, certificate not verified`, tone: 'warning' },
    plaintext: { label: 'No TLS', tone: 'plain' },
    not_applicable: { label: 'Not applicable (local file)', tone: 'neutral' },
  };
  return { server, connection: connection[p.tls ?? ''] ?? null };
}

// Caveat: 60 s per mount — a pool re-opened with other TLS settings shows its old posture
// for up to a minute (the router caches 30 s on top). Failures are not cached.
const PROBE_TTL_MS = 60_000;
const probeCache = new Map<string, { value: Promise<MountProbe | null>; expiresAt: number }>();

export function fetchMountProbe(dbId: string): Promise<MountProbe | null> {
  const hit = probeCache.get(dbId);
  if (hit && hit.expiresAt > Date.now()) return hit.value;
  const value = requestLive<MountProbe>(`/api/databases/${encodeURIComponent(dbId)}/probe`, { method: 'GET' }).then(
    (body) => body ?? null,
    (error: unknown) => {
      probeCache.delete(dbId);
      throw error;
    },
  );
  probeCache.set(dbId, { value, expiresAt: Date.now() + PROBE_TTL_MS });
  return value;
}
