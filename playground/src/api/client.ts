// ── Thin fetch wrapper around the Fastify API ─────────────────────────────────
// BASE is overridable via VITE_API_URL env var (useful for staging/prod)
const BASE = (import.meta.env as Record<string, string>)['VITE_API_URL'] ?? 'http://localhost:4000';

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  jwt?: string,
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (jwt) headers['Authorization'] = `Bearer ${jwt}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status} ${res.statusText}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get:    <T>(path: string, jwt?: string)                => request<T>('GET',    path, undefined, jwt),
  post:   <T>(path: string, body: unknown, jwt?: string) => request<T>('POST',   path, body,      jwt),
  patch:  <T>(path: string, body: unknown, jwt?: string) => request<T>('PATCH',  path, body,      jwt),
  delete: <T>(path: string, jwt?: string)                => request<T>('DELETE', path, undefined, jwt),
} as const;
