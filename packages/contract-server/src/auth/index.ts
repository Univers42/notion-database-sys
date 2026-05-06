/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   index.ts                                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/06 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 19:24:16 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { createHmac, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { ChangeEvent } from '@notion-db/contract-types';

/** Database scope attached to authenticated contract-server users. */
export interface AuthScope {
  databases: string[];
}

/** Minimum token claims accepted by the reference auth implementation. */
export interface AuthClaims {
  sub: string;
  iat: number;
  exp: number;
  scope: AuthScope;
}

/** Authenticated user metadata attached to Fastify requests. */
export interface AuthenticatedUser extends AuthClaims {
  authDisabled?: boolean;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

/** Registers /v1 authentication enforcement on a Fastify instance. */
export function registerAuthHook(app: FastifyInstance): void {
  const mode = process.env.CONTRACT_SERVER_AUTH ?? 'disabled';
  const isRequired = mode === 'required';
  const secret = process.env.CONTRACT_SERVER_JWT_SECRET;
  if (isRequired && !secret) {
    throw new Error('CONTRACT_SERVER_JWT_SECRET is required when CONTRACT_SERVER_AUTH=required');
  }

  app.addHook('onRequest', async (request, reply) => {
    if (request.method === 'OPTIONS') return;
    if (!isRequired) {
      request.user = createDevBypassUser();
      return;
    }

    const token = readBearerToken(request) ?? readSubscribeQueryToken(request);
    if (!token) {
      sendUnauthorized(reply, 'Missing bearer token', 'AUTH_MISSING');
      return;
    }

    try {
      request.user = verifyHs256Token(token, secret as string);
    } catch (error) {
      const code = error instanceof AuthTokenError ? error.code : 'AUTH_INVALID';
      sendUnauthorized(reply, errorMessage(error), code);
    }
  });
}

/** Returns true when the user can access the requested database id. */
export function canAccessDatabase(user: AuthenticatedUser | undefined, databaseId: string): boolean {
  if (!user) return true;
  const databases = user.scope.databases;
  return databases.includes('*') || databases.includes(databaseId);
}

/** Filters database ids down to the ids visible to the current user. */
export function filterDatabaseIds(user: AuthenticatedUser | undefined, databaseIds: string[]): string[] {
  if (!user || user.scope.databases.includes('*')) return databaseIds;
  return databaseIds.filter(databaseId => user.scope.databases.includes(databaseId));
}

/** Throws a 403 error if the current user cannot access the database id. */
export function assertDatabaseAccess(user: AuthenticatedUser | undefined, databaseId: string): void {
  if (canAccessDatabase(user, databaseId)) return;
  const error = new Error('Forbidden') as Error & { statusCode: number; code: string };
  error.statusCode = 403;
  error.code = 'FORBIDDEN';
  throw error;
}

/** Returns true when a ChangeEvent should be delivered to the current user. */
export function canReceiveEvent(user: AuthenticatedUser | undefined, event: ChangeEvent): boolean {
  const databaseId = getEventDatabaseId(event);
  if (!databaseId) return true;
  return canAccessDatabase(user, databaseId);
}

/** Returns the database id attached to an event, if any. */
export function getEventDatabaseId(event: ChangeEvent): string | null {
  switch (event.type) {
    case 'page-inserted': return event.page.databaseId;
    case 'page-changed': return event.databaseId ?? null;
    case 'page-deleted': return event.databaseId ?? null;
    case 'schema-changed': return event.databaseId;
    case 'state-replaced': return null;
    default: return null;
  }
}

class AuthTokenError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'AuthTokenError';
  }
}

function verifyHs256Token(token: string, secret: string): AuthenticatedUser {
  const parts = token.split('.');
  if (parts.length !== 3) throw new AuthTokenError('Malformed token', 'AUTH_INVALID');

  const [encodedHeader, encodedPayload, signature] = parts;
  const header = decodeJson<{ alg?: unknown; typ?: unknown }>(encodedHeader, 'AUTH_INVALID');
  if (header.alg !== 'HS256') throw new AuthTokenError('Unsupported token algorithm', 'AUTH_INVALID');

  const expectedSignature = createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');
  if (!safeEqual(signature, expectedSignature)) throw new AuthTokenError('Invalid token signature', 'AUTH_INVALID');

  const claims = decodeJson<Partial<AuthClaims>>(encodedPayload, 'AUTH_INVALID');
  validateClaims(claims);
  return claims;
}

function validateClaims(claims: Partial<AuthClaims>): asserts claims is AuthClaims {
  if (typeof claims.sub !== 'string' || claims.sub.length === 0) {
    throw new AuthTokenError('Token is missing sub', 'AUTH_INVALID');
  }
  if (typeof claims.iat !== 'number' || !Number.isFinite(claims.iat)) {
    throw new AuthTokenError('Token is missing iat', 'AUTH_INVALID');
  }
  if (typeof claims.exp !== 'number' || !Number.isFinite(claims.exp)) {
    throw new AuthTokenError('Token is missing exp', 'AUTH_INVALID');
  }
  if (!claims.scope || !Array.isArray(claims.scope.databases)) {
    throw new AuthTokenError('Token is missing scope.databases', 'AUTH_INVALID');
  }
  if (!claims.scope.databases.every(item => typeof item === 'string' && item.length > 0)) {
    throw new AuthTokenError('Token has invalid database scope', 'AUTH_INVALID');
  }
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (claims.exp <= nowSeconds) throw new AuthTokenError('Token expired', 'AUTH_EXPIRED');
}

function decodeJson<T>(value: string, code: string): T {
  try {
    return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as T;
  } catch {
    throw new AuthTokenError('Invalid token encoding', code);
  }
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function readBearerToken(request: FastifyRequest): string | null {
  const value = request.headers.authorization;
  if (!value) return null;
  const match = /^Bearer\s+(.+)$/i.exec(value);
  return match?.[1] ?? null;
}

function readSubscribeQueryToken(request: FastifyRequest): string | null {
  const url = new URL(request.url, 'http://contract.local');
  if (!url.pathname.endsWith('/subscribe')) return null;
  return url.searchParams.get('token');
}

function sendUnauthorized(reply: FastifyReply, message: string, code: string): void {
  void reply.status(401).send({ error: message, code });
}

function createDevBypassUser(): AuthenticatedUser {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return {
    sub: 'dev-bypass',
    iat: nowSeconds,
    exp: nowSeconds + 31_536_000,
    scope: { databases: ['*'] },
    authDisabled: true,
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
