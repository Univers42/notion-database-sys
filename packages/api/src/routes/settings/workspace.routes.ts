import type { FastifyInstance } from 'fastify';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import type {
  WorkspaceInviteDocument,
  WorkspaceMemberDocument,
  WorkspaceSettingsDocument,
} from '../../db/collections.js';
import {
  appendAudit,
  createRecordId,
  csvEscape,
  documentSelector,
  getActor,
  hashToken,
  idSelector,
  looseRecordSchema,
  objectIdOrNull,
  nowIso,
  parseBody,
  rawCollection,
  requireWorkspaceMember,
  requireWorkspaceRole,
  sendError,
  settingsCollection,
  workspaceRoleSchema,
} from './helpers.js';
import { zipStream } from './zip.js';

const workspaceSettingsPatchSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  icon: z.string().trim().optional(),
  landingPageId: z.string().trim().nullable().optional(),
  sidebar: looseRecordSchema.optional(),
  analytics: looseRecordSchema.optional(),
}).strict();

const memberRolePatchSchema = z.object({ role: workspaceRoleSchema }).strict();
const transferOwnershipSchema = z.object({ toUserId: z.string().trim().min(1) }).strict();
const inviteCreateSchema = z.object({
  email: z.string().trim().toLowerCase().regex(/^\S+@\S+\.\S+$/),
  role: workspaceRoleSchema.exclude(['owner']),
  message: z.string().trim().max(1000).optional(),
}).strict();
const inviteAcceptSchema = z.object({ token: z.string().trim().min(16) }).strict();

interface ExistingWorkspace {
  _id?: unknown;
  name?: unknown;
  icon?: unknown;
}

function defaultWorkspaceSettings(workspaceId: string, workspace?: ExistingWorkspace | null): WorkspaceSettingsDocument {
  const timestamp = nowIso();
  return {
    workspaceId,
    name: typeof workspace?.name === 'string' ? workspace.name : 'Workspace',
    icon: typeof workspace?.icon === 'string' ? workspace.icon : undefined,
    landingPageId: null,
    sidebar: { collapsed: false, favoritesFirst: true },
    analytics: { enabled: false },
    createdAt: timestamp,
    updatedAt: timestamp,
    removedAt: null,
  };
}

async function getExistingWorkspace(workspaceId: string) {
  const workspace = await rawCollection('workspaces').findOne(documentSelector(workspaceId));
  return workspace as ExistingWorkspace | null;
}

async function getWorkspaceSettings(workspaceId: string) {
  const settings = await settingsCollection('workspace_settings').findOne({ workspaceId, removedAt: null });
  if (settings) return settings;
  return defaultWorkspaceSettings(workspaceId, await getExistingWorkspace(workspaceId));
}

function serializeInvite(invite: WorkspaceInviteDocument, token?: string) {
  const { tokenHash: _tokenHash, ...publicInvite } = invite;
  return token ? { ...publicInvite, token } : publicInvite;
}

async function listMembers(workspaceId: string) {
  return settingsCollection('workspace_members').find({ workspaceId, removedAt: null }).sort({ role: 1, joinedAt: 1 }).toArray();
}

async function ensureTargetMember(workspaceId: string, userId: string, reply: Parameters<typeof sendError>[0]) {
  const member = await settingsCollection('workspace_members').findOne({ workspaceId, userId, removedAt: null });
  if (!member) sendError(reply, 404, 'MEMBER_NOT_FOUND', 'Member not found');
  return member;
}

async function wouldRemoveLastOwner(workspaceId: string, member: WorkspaceMemberDocument) {
  if (member.role !== 'owner') return false;
  const owners = await settingsCollection('workspace_members').countDocuments({ workspaceId, role: 'owner', removedAt: null });
  return owners <= 1;
}

export async function workspaceSettingsRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>('/workspaces/:id/settings', async (request, reply) => {
    const { actorId } = getActor(request);
    if (!await requireWorkspaceMember(request.params.id, actorId, reply)) return undefined;
    return getWorkspaceSettings(request.params.id);
  });

  app.patch<{ Params: { id: string } }>('/workspaces/:id/settings', async (request, reply) => {
    const body = parseBody(workspaceSettingsPatchSchema, request.body, reply);
    if (!body) return undefined;
    const { actorId } = getActor(request);
    if (!await requireWorkspaceRole(request.params.id, actorId, ['owner', 'admin'], reply)) return undefined;
    const current = await getWorkspaceSettings(request.params.id);
    const settings: WorkspaceSettingsDocument = { ...current, ...body, updatedAt: nowIso() };
    await settingsCollection('workspace_settings').updateOne(
      { workspaceId: request.params.id },
      { $set: settings },
      { upsert: true },
    );
    if (body.name || body.icon) {
      await rawCollection('workspaces').updateOne(documentSelector(request.params.id), { $set: { ...('name' in body ? { name: body.name } : {}), ...('icon' in body ? { icon: body.icon } : {}) } });
    }
    await appendAudit({ actorId, workspaceId: request.params.id, action: 'workspace.settings.update', target: { type: 'workspace_settings', id: request.params.id }, metadata: body });
    return settings;
  });

  app.delete<{ Params: { id: string } }>('/workspaces/:id', async (request, reply) => {
    const { actorId } = getActor(request);
    if (!await requireWorkspaceRole(request.params.id, actorId, ['owner'], reply)) return undefined;
    const timestamp = nowIso();
    await rawCollection('workspaces').updateOne(documentSelector(request.params.id), { $set: { removedAt: timestamp, updatedAt: timestamp } });
    await settingsCollection('workspace_settings').updateOne({ workspaceId: request.params.id }, { $set: { removedAt: timestamp, updatedAt: timestamp } });
    await settingsCollection('workspace_members').updateMany({ workspaceId: request.params.id, removedAt: null }, { $set: { removedAt: timestamp, updatedAt: timestamp } });
    await settingsCollection('workspace_invites').updateMany({ workspaceId: request.params.id, revokedAt: null }, { $set: { revokedAt: timestamp, updatedAt: timestamp } });
    await rawCollection('pages').updateMany({ workspaceId: idSelector(request.params.id) }, { $set: { archived: true, archivedAt: timestamp, removedAt: timestamp, updatedAt: timestamp } });
    await rawCollection('blocks').updateMany({ workspaceId: idSelector(request.params.id) }, { $set: { archived: true, archivedAt: timestamp, removedAt: timestamp, updatedAt: timestamp } });
    await appendAudit({ actorId, workspaceId: request.params.id, action: 'workspace.remove', target: { type: 'workspace', id: request.params.id } });
    return { ok: true };
  });

  app.get<{ Params: { id: string } }>('/workspaces/:id/members', async (request, reply) => {
    const { actorId } = getActor(request);
    if (!await requireWorkspaceMember(request.params.id, actorId, reply)) return undefined;
    return listMembers(request.params.id);
  });

  app.patch<{ Params: { id: string; userId: string } }>('/workspaces/:id/members/:userId', async (request, reply) => {
    const body = parseBody(memberRolePatchSchema, request.body, reply);
    if (!body) return undefined;
    const { actorId } = getActor(request);
    if (!await requireWorkspaceRole(request.params.id, actorId, ['owner', 'admin'], reply)) return undefined;
    const target = await ensureTargetMember(request.params.id, request.params.userId, reply);
    if (!target) return undefined;
    const timestamp = nowIso();
    await settingsCollection('workspace_members').updateOne(
      { workspaceId: request.params.id, userId: request.params.userId, removedAt: null },
      { $set: { role: body.role, updatedAt: timestamp } },
    );
    await appendAudit({ actorId, workspaceId: request.params.id, action: 'workspace.member.role_update', target: { type: 'workspace_member', id: request.params.userId }, metadata: body });
    return { ...target, role: body.role, updatedAt: timestamp };
  });

  app.delete<{ Params: { id: string; userId: string } }>('/workspaces/:id/members/:userId', async (request, reply) => {
    const { actorId } = getActor(request);
    const actorMember = await requireWorkspaceMember(request.params.id, actorId, reply);
    if (!actorMember) return undefined;
    const canRemove = request.params.userId === actorId || actorMember.role === 'owner' || actorMember.role === 'admin';
    if (!canRemove) return sendError(reply, 403, 'FORBIDDEN', 'Forbidden');
    const target = await ensureTargetMember(request.params.id, request.params.userId, reply);
    if (!target) return undefined;
    if (await wouldRemoveLastOwner(request.params.id, target)) {
      return sendError(reply, 400, 'LAST_OWNER_REQUIRED', 'Workspace must keep at least one owner');
    }
    const timestamp = nowIso();
    await settingsCollection('workspace_members').updateOne(
      { workspaceId: request.params.id, userId: request.params.userId, removedAt: null },
      { $set: { removedAt: timestamp, updatedAt: timestamp } },
    );
    await appendAudit({ actorId, workspaceId: request.params.id, action: 'workspace.member.remove', target: { type: 'workspace_member', id: request.params.userId } });
    return { ok: true };
  });

  app.post<{ Params: { id: string } }>('/workspaces/:id/members/transfer-ownership', async (request, reply) => {
    const body = parseBody(transferOwnershipSchema, request.body, reply);
    if (!body) return undefined;
    const { actorId } = getActor(request);
    if (!await requireWorkspaceRole(request.params.id, actorId, ['owner'], reply)) return undefined;
    const target = await ensureTargetMember(request.params.id, body.toUserId, reply);
    if (!target) return undefined;
    const timestamp = nowIso();
    await settingsCollection('workspace_members').updateOne(
      { workspaceId: request.params.id, userId: actorId, removedAt: null },
      { $set: { role: 'admin', updatedAt: timestamp } },
    );
    await settingsCollection('workspace_members').updateOne(
      { workspaceId: request.params.id, userId: body.toUserId, removedAt: null },
      { $set: { role: 'owner', updatedAt: timestamp } },
    );
    await rawCollection('workspaces').updateOne(documentSelector(request.params.id), { $set: { ownerId: objectIdOrNull(body.toUserId) ?? body.toUserId, updatedAt: timestamp } });
    await appendAudit({ actorId, workspaceId: request.params.id, action: 'workspace.ownership.transfer', target: { type: 'workspace_member', id: body.toUserId } });
    return listMembers(request.params.id);
  });

  app.get<{ Params: { id: string } }>('/workspaces/:id/invites', async (request, reply) => {
    const { actorId } = getActor(request);
    if (!await requireWorkspaceMember(request.params.id, actorId, reply)) return undefined;
    const invites = await settingsCollection('workspace_invites').find({ workspaceId: request.params.id, revokedAt: null }).sort({ createdAt: -1 }).toArray();
    return invites.map((invite) => serializeInvite(invite));
  });

  app.post<{ Params: { id: string } }>('/workspaces/:id/invites', async (request, reply) => {
    const body = parseBody(inviteCreateSchema, request.body, reply);
    if (!body) return undefined;
    const { actorId } = getActor(request);
    if (!await requireWorkspaceRole(request.params.id, actorId, ['owner', 'admin'], reply)) return undefined;
    const timestamp = nowIso();
    const token = randomBytes(32).toString('base64url');
    const invite: WorkspaceInviteDocument = {
      _id: createRecordId('invite'),
      workspaceId: request.params.id,
      email: body.email,
      role: body.role,
      tokenHash: hashToken(token),
      invitedBy: actorId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      acceptedAt: null,
      revokedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await settingsCollection('workspace_invites').insertOne(invite);
    await appendAudit({ actorId, workspaceId: request.params.id, action: 'workspace.invite.create', target: { type: 'workspace_invite', id: invite._id }, metadata: { email: body.email, role: body.role, message: body.message } });
    return reply.code(201).send(serializeInvite(invite, token));
  });

  app.post<{ Params: { id: string; inviteId: string } }>('/workspaces/:id/invites/:inviteId/resend', async (request, reply) => {
    const { actorId } = getActor(request);
    if (!await requireWorkspaceRole(request.params.id, actorId, ['owner', 'admin'], reply)) return undefined;
    const timestamp = nowIso();
    const invite = await settingsCollection('workspace_invites').findOneAndUpdate(
      { _id: request.params.inviteId, workspaceId: request.params.id, revokedAt: null },
      { $set: { updatedAt: timestamp } },
      { returnDocument: 'after' },
    );
    if (!invite) return sendError(reply, 404, 'INVITE_NOT_FOUND', 'Invite not found');
    await appendAudit({ actorId, workspaceId: request.params.id, action: 'workspace.invite.resend', target: { type: 'workspace_invite', id: request.params.inviteId } });
    return serializeInvite(invite);
  });

  app.delete<{ Params: { id: string; inviteId: string } }>('/workspaces/:id/invites/:inviteId', async (request, reply) => {
    const { actorId } = getActor(request);
    if (!await requireWorkspaceRole(request.params.id, actorId, ['owner', 'admin'], reply)) return undefined;
    const timestamp = nowIso();
    const result = await settingsCollection('workspace_invites').updateOne(
      { _id: request.params.inviteId, workspaceId: request.params.id, revokedAt: null },
      { $set: { revokedAt: timestamp, updatedAt: timestamp } },
    );
    if (!result.matchedCount) return sendError(reply, 404, 'INVITE_NOT_FOUND', 'Invite not found');
    await appendAudit({ actorId, workspaceId: request.params.id, action: 'workspace.invite.revoke', target: { type: 'workspace_invite', id: request.params.inviteId } });
    return { ok: true };
  });

  app.post('/invites/accept', async (request, reply) => {
    const body = parseBody(inviteAcceptSchema, request.body, reply);
    if (!body) return undefined;
    const { actorId } = getActor(request);
    const timestamp = nowIso();
    const invite = await settingsCollection('workspace_invites').findOne({ tokenHash: hashToken(body.token), acceptedAt: null, revokedAt: null });
    if (!invite || invite.expiresAt < timestamp) return sendError(reply, 404, 'INVITE_NOT_FOUND', 'Invite not found');
    await settingsCollection('workspace_members').updateOne(
      { workspaceId: invite.workspaceId, userId: actorId },
      {
        $setOnInsert: { _id: createRecordId('wm'), workspaceId: invite.workspaceId, userId: actorId, joinedAt: timestamp, createdAt: timestamp },
        $set: { role: invite.role, removedAt: null, updatedAt: timestamp },
      },
      { upsert: true },
    );
    await settingsCollection('workspace_invites').updateOne({ _id: invite._id }, { $set: { acceptedAt: timestamp, updatedAt: timestamp } });
    await appendAudit({ actorId, workspaceId: invite.workspaceId, action: 'workspace.invite.accept', target: { type: 'workspace_invite', id: invite._id } });
    return { workspaceId: invite.workspaceId };
  });

  app.get<{ Params: { id: string } }>('/workspaces/:id/export', async (request, reply) => {
    const { actorId } = getActor(request);
    if (!await requireWorkspaceMember(request.params.id, actorId, reply)) return undefined;
    const [workspace, settings, members, pages, blocks] = await Promise.all([
      getExistingWorkspace(request.params.id),
      getWorkspaceSettings(request.params.id),
      listMembers(request.params.id),
      rawCollection('pages').find({ workspaceId: idSelector(request.params.id) }).toArray(),
      rawCollection('blocks').find({ workspaceId: idSelector(request.params.id) }).toArray(),
    ]);
    reply.header('content-type', 'application/zip');
    reply.header('content-disposition', `attachment; filename="workspace-${request.params.id}.zip"`);
    return reply.send(zipStream([
      { path: 'workspace.json', data: JSON.stringify({ workspace, settings }, null, 2) },
      { path: 'members.json', data: JSON.stringify(members, null, 2) },
      { path: 'pages.json', data: JSON.stringify(pages, null, 2) },
      { path: 'blocks.json', data: JSON.stringify(blocks, null, 2) },
    ]));
  });

  app.get<{ Params: { id: string } }>('/workspaces/:id/members/export', async (request, reply) => {
    const { actorId } = getActor(request);
    if (!await requireWorkspaceMember(request.params.id, actorId, reply)) return undefined;
    const members = await listMembers(request.params.id);
    const rows = [['userId', 'role', 'joinedAt', 'invitedBy'], ...members.map((member) => [member.userId, member.role, member.joinedAt, member.invitedBy ?? ''])];
    const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n') + '\n';
    reply.header('content-type', 'text/csv; charset=utf-8');
    reply.header('content-disposition', `attachment; filename="workspace-${request.params.id}-members.csv"`);
    return csv;
  });
}
