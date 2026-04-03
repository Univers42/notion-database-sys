// ─── Session model — JWT refresh tokens with TTL ────────────────────────────

import { Schema, model, type Document } from 'mongoose';
import type { Session } from '@notion-db/types';

export type SessionDocument = Omit<Session, '_id'> & Document;

const sessionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  refreshToken: { type: String, required: true },
  userAgent: String,
  ip: String,
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
});

// TTL index: auto-expire sessions after their expiresAt
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// Lookup by refresh token (used during token refresh)
sessionSchema.index({ refreshToken: 1 }, { unique: true });
// Purge all sessions for a user (logout everywhere)
sessionSchema.index({ userId: 1 });

export const SessionModel = model<SessionDocument>('Session', sessionSchema);
