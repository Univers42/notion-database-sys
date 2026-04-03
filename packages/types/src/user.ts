// ─── User — global identity ─────────────────────────────────────────────────

import type { ObjectId, Timestamps } from './common';

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  locale: string;
  startPage?: ObjectId;
  sidebarCollapsed: boolean;
}

export interface User extends Timestamps {
  _id: ObjectId;
  email: string;
  name: string;
  avatar?: string;
  passwordHash: string;
  preferences: UserPreferences;
  lastLoginAt?: string;
}
