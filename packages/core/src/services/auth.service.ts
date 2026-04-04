// ─── AuthService — user registration, login, JWT token management ───────────

import crypto from 'crypto';
import { UserModel } from '../models/user.model';
import { SessionModel } from '../models/session.model';
import type { ObjectId } from '@notion-db/types';

/** 30 days in milliseconds */
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  constructor(
    private readonly jwtSecret: string,
    private readonly jwtExpiresIn: string = '15m',
  ) {}

  /**
   * Register a new user. Returns the created user (without password hash).
   */
  async register(email: string, password: string, name: string) {
    const existing = await UserModel.findOne({ email }).lean();
    if (existing) throw new Error('Email already in use');

    const user = await UserModel.create({
      email,
      name,
      passwordHash: password, // pre-save hook will hash this
    });

    return { _id: user._id.toString(), email: user.email, name: user.name };
  }

  /**
   * Authenticate user by email + password. Returns user ID or throws.
   */
  async authenticate(email: string, password: string): Promise<string> {
    const user = await UserModel.findOne({ email }).select('+passwordHash');
    if (!user) throw new Error('Invalid credentials');

    const valid = await user.comparePassword(password);
    if (!valid) throw new Error('Invalid credentials');

    await UserModel.updateOne({ _id: user._id }, { lastLoginAt: new Date() });
    return user._id.toString();
  }

  /**
   * Create a new refresh token session. Returns the raw refresh token.
   */
  async createSession(userId: ObjectId, meta?: { userAgent?: string; ip?: string }): Promise<string> {
    const refreshToken = crypto.randomBytes(48).toString('hex');
    await SessionModel.create({
      userId,
      refreshToken,
      userAgent: meta?.userAgent,
      ip: meta?.ip,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    });
    return refreshToken;
  }

  /**
   * Validate a refresh token. Returns userId or null if expired/invalid.
   */
  async validateRefreshToken(token: string): Promise<string | null> {
    const session = await SessionModel.findOne({
      refreshToken: token,
      expiresAt: { $gt: new Date() },
    }).lean();

    return session ? session.userId.toString() : null;
  }

  /**
   * Revoke a single session (logout).
   */
  async revokeSession(token: string): Promise<void> {
    await SessionModel.deleteOne({ refreshToken: token });
  }

  /**
   * Revoke all sessions for a user (logout everywhere).
   */
  async revokeAll(userId: ObjectId): Promise<void> {
    await SessionModel.deleteMany({ userId });
  }
}
