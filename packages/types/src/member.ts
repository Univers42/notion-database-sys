// ─── WorkspaceMember — user ↔ workspace mapping ─────────────────────────────

import type { ObjectId, Timestamps } from './common';

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'guest';

export interface WorkspaceMember extends Timestamps {
  _id: ObjectId;
  workspaceId: ObjectId;
  userId: ObjectId;
  role: WorkspaceRole;
  invitedBy?: ObjectId;
  joinedAt: string;
}
