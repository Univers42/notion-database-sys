// ─── Session — JWT refresh tokens + presence ────────────────────────────────

import type { ObjectId } from './common';

/** Refresh token stored in MongoDB with TTL */
export interface Session {
  _id: ObjectId;
  userId: ObjectId;
  refreshToken: string;
  userAgent?: string;
  ip?: string;
  createdAt: Date;
  /** TTL index: auto-expires after 30 days */
  expiresAt: Date;
}

/** Ephemeral cursor presence (not persisted — managed in-memory or Redis) */
export interface CursorPresence {
  userId: ObjectId;
  pageId: ObjectId;
  blockId?: ObjectId;
  cursor?: { line: number; column: number };
  color: string;
  name: string;
  lastSeen: number;
}
