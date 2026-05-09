export type IndexDirection = 1 | -1;

export interface EncryptedSecret {
  algorithm: 'aes-256-gcm';
  iv: string;
  ciphertext: string;
  authTag: string;
  keyVersion?: string;
}

export const CONNECTION_TOKEN_ENCRYPTION = {
  algorithm: 'aes-256-gcm',
  keyEnv: 'BRIDGE_ENCRYPTION_KEY',
} as const;

export const CONNECTION_SECRET_FIELDS = ['accessTokenEnc', 'refreshTokenEnc'] as const;

export interface CollectionIndexSpec {
  keys: Record<string, IndexDirection>;
  options?: {
    name: string;
    unique?: boolean;
    sparse?: boolean;
    expireAfterSeconds?: number;
    partialFilterExpression?: Record<string, unknown>;
  };
}

export interface CollectionDefinition<TKey extends string = string> {
  key: TKey;
  name: TKey;
  indexes: CollectionIndexSpec[];
}

export interface AuditTargetRef {
  type: string;
  id?: string;
}

export interface AccountProfileSettings {
  preferredName?: string;
  avatar?: string;
  locale?: string;
}

export interface AccountSecuritySettings {
  hasPassword?: boolean;
  twoStepEnabled?: boolean;
  passkeysEnabled?: boolean;
  passwordUpdatedAt?: string;
}

export interface AccountSettingsDocument {
  userId: string;
  profile: AccountProfileSettings;
  security: AccountSecuritySettings;
  supportAccessGrantedUntil?: string | null;
  pendingDeletionAt?: string | null;
  removedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AccountDeviceDocument {
  _id: string;
  userId: string;
  deviceFingerprint: string;
  userAgent?: string;
  ipHash?: string;
  location?: string;
  lastActiveAt: string;
  revokedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AccountPasskeyDocument {
  _id: string;
  userId: string;
  credentialId: string;
  publicKey: string;
  counter: number;
  transports: string[];
  nickname?: string;
  createdAt: string;
  updatedAt: string;
  removedAt?: string | null;
}

export interface AccountEmailDocument {
  _id: string;
  userId: string;
  email: string;
  isPrimary: boolean;
  verifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  removedAt?: string | null;
}

export interface UserPreferencesDocument {
  userId: string;
  theme: 'light' | 'dark' | 'system';
  language: string;
  weekStart: 'sunday' | 'monday';
  dateFormat: string;
  timezone: string;
  autoTimezone: boolean;
  numberFormat: string;
  enterAddsNewline: boolean;
  cookies: Record<string, unknown>;
  privacy: Record<string, unknown>;
  desktop: Record<string, unknown>;
  updatedAt: string;
  createdAt: string;
  removedAt?: string | null;
}

export interface NotificationSettingsDocument {
  userId: string;
  slack: Record<string, unknown>;
  discord: Record<string, unknown>;
  email: Record<string, unknown>;
  inApp: Record<string, unknown>;
  perPageOverrides: Array<Record<string, unknown>>;
  updatedAt: string;
  createdAt: string;
  removedAt?: string | null;
}

export type ConnectionStatus = 'connected' | 'disabled' | 'error' | 'revoked';

export interface ConnectionDocument {
  _id: string;
  userId: string;
  provider: string;
  label: string;
  scopes: string[];
  status: ConnectionStatus;
  accessTokenEnc?: EncryptedSecret;
  refreshTokenEnc?: EncryptedSecret;
  connectedAt: string;
  lastSyncAt?: string | null;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
  removedAt?: string | null;
}

export type WorkspaceMemberRole = 'owner' | 'admin' | 'member' | 'guest';

export interface WorkspaceMemberDocument {
  _id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceMemberRole;
  invitedBy?: string;
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
  removedAt?: string | null;
}

export interface WorkspaceInviteDocument {
  _id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceMemberRole;
  tokenHash: string;
  invitedBy: string;
  expiresAt: string;
  acceptedAt?: string | null;
  revokedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceSettingsDocument {
  workspaceId: string;
  name: string;
  icon?: string;
  landingPageId?: string | null;
  sidebar: Record<string, unknown>;
  analytics: Record<string, unknown>;
  updatedAt: string;
  createdAt: string;
  removedAt?: string | null;
}

export type ImportStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface ImportHistoryDocument {
  _id: string;
  userId: string;
  workspaceId: string;
  source: string;
  fileName?: string;
  byteSize?: number;
  status: ImportStatus;
  pageIds: string[];
  error?: string | null;
  startedAt: string;
  finishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  removedAt?: string | null;
}

export interface AuditLogDocument {
  _id: string;
  actorId: string;
  workspaceId?: string;
  action: string;
  target: AuditTargetRef;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface BillingStateDocument {
  workspaceId: string;
  plan: string;
  paymentMethod?: Record<string, unknown> | null;
  billedTo?: Record<string, unknown> | null;
  billingEmail?: string | null;
  vatNumber?: string | null;
  upcomingInvoice?: Record<string, unknown> | null;
  updatedAt: string;
  createdAt: string;
  removedAt?: string | null;
}

export interface BillingInvoiceDocument {
  _id: string;
  workspaceId: string;
  number: string;
  status: string;
  amount: number;
  currency: string;
  periodStart: string;
  periodEnd: string;
  pdfUrl?: string | null;
  createdAt: string;
  removedAt?: string | null;
}

export interface CollectionDocuments {
  account_settings: AccountSettingsDocument;
  account_devices: AccountDeviceDocument;
  account_passkeys: AccountPasskeyDocument;
  account_emails: AccountEmailDocument;
  user_preferences: UserPreferencesDocument;
  notification_settings: NotificationSettingsDocument;
  connections: ConnectionDocument;
  workspace_members: WorkspaceMemberDocument;
  workspace_invites: WorkspaceInviteDocument;
  workspace_settings: WorkspaceSettingsDocument;
  import_history: ImportHistoryDocument;
  audit_log: AuditLogDocument;
  billing_state: BillingStateDocument;
  billing_invoices: BillingInvoiceDocument;
}

export type CollectionKey = keyof CollectionDocuments;

export const SETTINGS_COLLECTION_KEYS = [
  'account_settings',
  'account_devices',
  'account_passkeys',
  'account_emails',
  'user_preferences',
  'notification_settings',
  'connections',
  'workspace_members',
  'workspace_invites',
  'workspace_settings',
  'import_history',
  'audit_log',
  'billing_state',
  'billing_invoices',
] as const satisfies readonly CollectionKey[];

export type CollectionDocument<TKey extends CollectionKey> = CollectionDocuments[TKey];

export const COLLECTION_DEFINITIONS: Record<CollectionKey, CollectionDefinition<CollectionKey>> = {
  account_settings: {
    key: 'account_settings',
    name: 'account_settings',
    indexes: [
      { keys: { userId: 1 }, options: { name: 'account_settings_userId_unique', unique: true } },
    ],
  },
  account_devices: {
    key: 'account_devices',
    name: 'account_devices',
    indexes: [
      { keys: { userId: 1 }, options: { name: 'account_devices_userId' } },
      { keys: { userId: 1, lastActiveAt: -1 }, options: { name: 'account_devices_userId_lastActiveAt' } },
      { keys: { deviceFingerprint: 1 }, options: { name: 'account_devices_deviceFingerprint' } },
    ],
  },
  account_passkeys: {
    key: 'account_passkeys',
    name: 'account_passkeys',
    indexes: [
      { keys: { userId: 1 }, options: { name: 'account_passkeys_userId' } },
      { keys: { credentialId: 1 }, options: { name: 'account_passkeys_credentialId_unique', unique: true } },
    ],
  },
  account_emails: {
    key: 'account_emails',
    name: 'account_emails',
    indexes: [
      { keys: { userId: 1, email: 1 }, options: { name: 'account_emails_userId_email_unique', unique: true } },
    ],
  },
  user_preferences: {
    key: 'user_preferences',
    name: 'user_preferences',
    indexes: [
      { keys: { userId: 1 }, options: { name: 'user_preferences_userId_unique', unique: true } },
    ],
  },
  notification_settings: {
    key: 'notification_settings',
    name: 'notification_settings',
    indexes: [
      { keys: { userId: 1 }, options: { name: 'notification_settings_userId_unique', unique: true } },
    ],
  },
  connections: {
    key: 'connections',
    name: 'connections',
    indexes: [
      { keys: { userId: 1 }, options: { name: 'connections_userId' } },
      { keys: { userId: 1, provider: 1 }, options: { name: 'connections_userId_provider' } },
    ],
  },
  workspace_members: {
    key: 'workspace_members',
    name: 'workspace_members',
    indexes: [
      { keys: { workspaceId: 1 }, options: { name: 'workspace_members_workspaceId' } },
      { keys: { userId: 1 }, options: { name: 'workspace_members_userId' } },
      { keys: { workspaceId: 1, userId: 1 }, options: { name: 'workspace_members_workspaceId_userId_unique', unique: true } },
    ],
  },
  workspace_invites: {
    key: 'workspace_invites',
    name: 'workspace_invites',
    indexes: [
      { keys: { tokenHash: 1 }, options: { name: 'workspace_invites_tokenHash_unique', unique: true } },
      { keys: { workspaceId: 1, email: 1 }, options: { name: 'workspace_invites_workspaceId_email' } },
    ],
  },
  workspace_settings: {
    key: 'workspace_settings',
    name: 'workspace_settings',
    indexes: [
      { keys: { workspaceId: 1 }, options: { name: 'workspace_settings_workspaceId_unique', unique: true } },
    ],
  },
  import_history: {
    key: 'import_history',
    name: 'import_history',
    indexes: [
      { keys: { userId: 1 }, options: { name: 'import_history_userId' } },
      { keys: { workspaceId: 1, startedAt: -1 }, options: { name: 'import_history_workspaceId_startedAt' } },
    ],
  },
  audit_log: {
    key: 'audit_log',
    name: 'audit_log',
    indexes: [
      { keys: { actorId: 1 }, options: { name: 'audit_log_actorId' } },
      { keys: { workspaceId: 1, createdAt: -1 }, options: { name: 'audit_log_workspaceId_createdAt' } },
      { keys: { createdAt: 1 }, options: { name: 'audit_log_createdAt_ttl_365d', expireAfterSeconds: 365 * 24 * 60 * 60 } },
    ],
  },
  billing_state: {
    key: 'billing_state',
    name: 'billing_state',
    indexes: [
      { keys: { workspaceId: 1 }, options: { name: 'billing_state_workspaceId_unique', unique: true } },
    ],
  },
  billing_invoices: {
    key: 'billing_invoices',
    name: 'billing_invoices',
    indexes: [
      { keys: { workspaceId: 1, createdAt: -1 }, options: { name: 'billing_invoices_workspaceId_createdAt' } },
    ],
  },
};
