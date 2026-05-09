import type { FastifyInstance } from 'fastify';
import { randomBytes } from 'node:crypto';
import { UserModel } from '@notion-db/core';
import { z } from 'zod';
import type {
  AccountEmailDocument,
  AccountPasskeyDocument,
  AccountSettingsDocument,
} from '../../db/collections.js';
import {
  appendAudit,
  createRecordId,
  getActor,
  nowIso,
  parseBody,
  revokedFilter,
  sendError,
  settingsCollection,
} from './helpers.js';

const accountPatchSchema = z.object({
  profile: z.object({
    preferredName: z.string().trim().max(100).optional(),
    avatar: z.string().trim().optional(),
    locale: z.string().trim().max(32).optional(),
  }).partial().optional(),
  security: z.object({
    twoStepEnabled: z.boolean().optional(),
    passkeysEnabled: z.boolean().optional(),
  }).partial().optional(),
}).strict();

const emailCreateSchema = z.object({ email: z.string().trim().toLowerCase().regex(/^\S+@\S+\.\S+$/) }).strict();
const passwordSchema = z.object({ current: z.string().optional(), next: z.string().min(8) }).strict();
const passkeyOptionsSchema = z.object({ nickname: z.string().trim().max(80).optional() }).strict();
const passkeyVerifySchema = z.object({
  credentialId: z.string().trim().min(1),
  publicKey: z.string().trim().min(1),
  transports: z.array(z.string().trim()).default([]),
  nickname: z.string().trim().max(80).optional(),
}).strict();
const twoFactorVerifySchema = z.object({ token: z.string().trim().regex(/^\d{6}$/) }).strict();
const supportAccessSchema = z.object({ granted: z.boolean(), durationDays: z.number().int().min(1).max(30).optional() }).strict();

function defaultAccountSettings(userId: string): AccountSettingsDocument {
  const timestamp = nowIso();
  return {
    userId,
    profile: {},
    security: { hasPassword: true, twoStepEnabled: false, passkeysEnabled: false },
    supportAccessGrantedUntil: null,
    pendingDeletionAt: null,
    removedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

async function getAccountSettings(userId: string) {
  return await settingsCollection('account_settings').findOne({ userId, removedAt: null }) ?? defaultAccountSettings(userId);
}

async function saveAccountSettings(settings: AccountSettingsDocument) {
  await settingsCollection('account_settings').updateOne(
    { userId: settings.userId },
    { $set: settings },
    { upsert: true },
  );
}

function base32Secret() {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bytes = randomBytes(20);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
}

function transientPrimaryEmail(userId: string, email: string): AccountEmailDocument {
  const timestamp = nowIso();
  return {
    _id: `primary_${userId}`,
    userId,
    email,
    isPrimary: true,
    verifiedAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
    removedAt: null,
  };
}

export async function accountRoutes(app: FastifyInstance) {
  app.get('/account/settings', async (request) => getAccountSettings(getActor(request).actorId));

  app.patch('/account/settings', async (request, reply) => {
    const body = parseBody(accountPatchSchema, request.body, reply);
    if (!body) return undefined;
    const { actorId } = getActor(request);
    const current = await getAccountSettings(actorId);
    const timestamp = nowIso();
    const settings: AccountSettingsDocument = {
      ...current,
      profile: { ...current.profile, ...body.profile },
      security: { ...current.security, ...body.security },
      updatedAt: timestamp,
    };
    await saveAccountSettings(settings);
    await appendAudit({ actorId, action: 'account.settings.update', target: { type: 'account_settings', id: actorId }, metadata: body });
    return settings;
  });

  app.get('/account/devices', async (request) => {
    const { actorId } = getActor(request);
    return settingsCollection('account_devices').find({ userId: actorId, revokedAt: null }).sort({ lastActiveAt: -1 }).toArray();
  });

  app.delete<{ Params: { id: string } }>('/account/devices/:id', async (request, reply) => {
    const { actorId } = getActor(request);
    const timestamp = nowIso();
    const result = await settingsCollection('account_devices').updateOne(
      revokedFilter({ _id: request.params.id, userId: actorId }),
      { $set: { revokedAt: timestamp, updatedAt: timestamp } },
    );
    if (!result.matchedCount) return sendError(reply, 404, 'DEVICE_NOT_FOUND', 'Device not found');
    await appendAudit({ actorId, action: 'account.device.revoke', target: { type: 'account_device', id: request.params.id } });
    return { ok: true };
  });

  app.delete('/account/devices', async (request) => {
    const { actorId } = getActor(request);
    const currentDeviceId = String(request.headers['x-device-id'] ?? request.headers['x-device-fingerprint'] ?? '');
    const timestamp = nowIso();
    const filter = currentDeviceId
      ? { userId: actorId, revokedAt: null, _id: { $ne: currentDeviceId } }
      : { userId: actorId, revokedAt: null };
    const result = await settingsCollection('account_devices').updateMany(filter, { $set: { revokedAt: timestamp, updatedAt: timestamp } });
    await appendAudit({ actorId, action: 'account.devices.revoke_other', target: { type: 'account_device' }, metadata: { currentDeviceId } });
    return { ok: true, revokedCount: result.modifiedCount };
  });

  app.get('/account/passkeys', async (request) => {
    const { actorId } = getActor(request);
    return settingsCollection('account_passkeys').find({ userId: actorId, removedAt: null }).sort({ createdAt: -1 }).toArray();
  });

  app.post('/account/passkeys/register/options', async (request, reply) => {
    const body = parseBody(passkeyOptionsSchema, request.body, reply);
    if (!body) return undefined;
    const { actorId, email } = getActor(request);
    const challenge = randomBytes(32).toString('base64url');
    await appendAudit({ actorId, action: 'account.passkey.options', target: { type: 'account_passkey' }, metadata: { nickname: body.nickname } });
    return {
      challenge,
      rp: { name: 'Osionos', id: process.env.PASSKEY_RP_ID ?? 'localhost' },
      user: { id: Buffer.from(actorId).toString('base64url'), name: email, displayName: email },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      timeout: 60000,
      attestation: 'none',
      authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
    };
  });

  app.post('/account/passkeys/register/verify', async (request, reply) => {
    const body = parseBody(passkeyVerifySchema, request.body, reply);
    if (!body) return undefined;
    const { actorId } = getActor(request);
    const timestamp = nowIso();
    const passkey: AccountPasskeyDocument = {
      _id: createRecordId('passkey'),
      userId: actorId,
      credentialId: body.credentialId,
      publicKey: body.publicKey,
      counter: 0,
      transports: body.transports,
      nickname: body.nickname,
      createdAt: timestamp,
      updatedAt: timestamp,
      removedAt: null,
    };
    await settingsCollection('account_passkeys').insertOne(passkey);
    const settings = await getAccountSettings(actorId);
    await saveAccountSettings({ ...settings, security: { ...settings.security, passkeysEnabled: true }, updatedAt: timestamp });
    await appendAudit({ actorId, action: 'account.passkey.register', target: { type: 'account_passkey', id: passkey._id } });
    return passkey;
  });

  app.delete<{ Params: { id: string } }>('/account/passkeys/:id', async (request, reply) => {
    const { actorId } = getActor(request);
    const timestamp = nowIso();
    const result = await settingsCollection('account_passkeys').updateOne(
      { _id: request.params.id, userId: actorId, removedAt: null },
      { $set: { removedAt: timestamp, updatedAt: timestamp } },
    );
    if (!result.matchedCount) return sendError(reply, 404, 'PASSKEY_NOT_FOUND', 'Passkey not found');
    await appendAudit({ actorId, action: 'account.passkey.remove', target: { type: 'account_passkey', id: request.params.id } });
    return { ok: true };
  });

  app.get('/account/emails', async (request) => {
    const { actorId, email } = getActor(request);
    const emails = await settingsCollection('account_emails').find({ userId: actorId, removedAt: null }).sort({ isPrimary: -1, createdAt: 1 }).toArray();
    return emails.length ? emails : [transientPrimaryEmail(actorId, email)];
  });

  app.post('/account/emails', async (request, reply) => {
    const body = parseBody(emailCreateSchema, request.body, reply);
    if (!body) return undefined;
    const { actorId } = getActor(request);
    const timestamp = nowIso();
    const existing = await settingsCollection('account_emails').findOne({ userId: actorId, email: body.email, removedAt: null });
    if (existing) return sendError(reply, 409, 'EMAIL_EXISTS', 'Email already exists');
    const emailRecord: AccountEmailDocument = {
      _id: createRecordId('email'),
      userId: actorId,
      email: body.email,
      isPrimary: false,
      verifiedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      removedAt: null,
    };
    await settingsCollection('account_emails').insertOne(emailRecord);
    await appendAudit({ actorId, action: 'account.email.add', target: { type: 'account_email', id: emailRecord._id }, metadata: { email: body.email } });
    return reply.code(201).send(emailRecord);
  });

  app.delete<{ Params: { id: string } }>('/account/emails/:id', async (request, reply) => {
    const { actorId } = getActor(request);
    const record = await settingsCollection('account_emails').findOne({ _id: request.params.id, userId: actorId, removedAt: null });
    if (!record) return sendError(reply, 404, 'EMAIL_NOT_FOUND', 'Email not found');
    if (record.isPrimary) return sendError(reply, 400, 'PRIMARY_EMAIL_REQUIRED', 'Primary email cannot be removed');
    const timestamp = nowIso();
    await settingsCollection('account_emails').updateOne({ _id: record._id }, { $set: { removedAt: timestamp, updatedAt: timestamp } });
    await appendAudit({ actorId, action: 'account.email.remove', target: { type: 'account_email', id: record._id } });
    return { ok: true };
  });

  app.post<{ Params: { id: string } }>('/account/emails/:id/make-primary', async (request, reply) => {
    const { actorId } = getActor(request);
    const record = await settingsCollection('account_emails').findOne({ _id: request.params.id, userId: actorId, removedAt: null });
    if (!record) return sendError(reply, 404, 'EMAIL_NOT_FOUND', 'Email not found');
    const timestamp = nowIso();
    await settingsCollection('account_emails').updateMany({ userId: actorId, removedAt: null }, { $set: { isPrimary: false, updatedAt: timestamp } });
    await settingsCollection('account_emails').updateOne({ _id: record._id }, { $set: { isPrimary: true, updatedAt: timestamp } });
    await UserModel.updateOne({ _id: actorId }, { email: record.email });
    await appendAudit({ actorId, action: 'account.email.make_primary', target: { type: 'account_email', id: record._id }, metadata: { email: record.email } });
    return settingsCollection('account_emails').find({ userId: actorId, removedAt: null }).sort({ isPrimary: -1, createdAt: 1 }).toArray();
  });

  app.post('/account/password', async (request, reply) => {
    const body = parseBody(passwordSchema, request.body, reply);
    if (!body) return undefined;
    const { actorId } = getActor(request);
    const user = await UserModel.findById(actorId).select('+passwordHash');
    if (!user) return sendError(reply, 404, 'USER_NOT_FOUND', 'User not found');
    if (body.current && !await user.comparePassword(body.current)) {
      return sendError(reply, 400, 'INVALID_CURRENT_PASSWORD', 'Current password is invalid');
    }
    user.passwordHash = body.next;
    await user.save();
    const timestamp = nowIso();
    const settings = await getAccountSettings(actorId);
    await saveAccountSettings({ ...settings, security: { ...settings.security, hasPassword: true, passwordUpdatedAt: timestamp }, updatedAt: timestamp });
    await appendAudit({ actorId, action: 'account.password.update', target: { type: 'account_settings', id: actorId } });
    return { ok: true };
  });

  app.post('/account/2fa/enroll', async (request) => {
    const { actorId, email } = getActor(request);
    const secret = base32Secret();
    await appendAudit({ actorId, action: 'account.2fa.enroll', target: { type: 'account_settings', id: actorId } });
    return { secret, otpauthUrl: `otpauth://totp/Osionos:${encodeURIComponent(email)}?secret=${secret}&issuer=Osionos` };
  });

  app.post('/account/2fa/verify', async (request, reply) => {
    const body = parseBody(twoFactorVerifySchema, request.body, reply);
    if (!body) return undefined;
    const { actorId } = getActor(request);
    const timestamp = nowIso();
    const settings = await getAccountSettings(actorId);
    await saveAccountSettings({ ...settings, security: { ...settings.security, twoStepEnabled: true }, updatedAt: timestamp });
    await appendAudit({ actorId, action: 'account.2fa.verify', target: { type: 'account_settings', id: actorId }, metadata: { tokenLength: body.token.length } });
    return { ok: true };
  });

  app.post('/account/2fa/disable', async (request) => {
    const { actorId } = getActor(request);
    const timestamp = nowIso();
    const settings = await getAccountSettings(actorId);
    await saveAccountSettings({ ...settings, security: { ...settings.security, twoStepEnabled: false }, updatedAt: timestamp });
    await appendAudit({ actorId, action: 'account.2fa.disable', target: { type: 'account_settings', id: actorId } });
    return { ok: true };
  });

  app.post('/account/support-access', async (request, reply) => {
    const body = parseBody(supportAccessSchema, request.body, reply);
    if (!body) return undefined;
    const { actorId } = getActor(request);
    const timestamp = nowIso();
    const grantedUntil = body.granted ? new Date(Date.now() + (body.durationDays ?? 7) * 24 * 60 * 60 * 1000).toISOString() : null;
    const settings = await getAccountSettings(actorId);
    await saveAccountSettings({ ...settings, supportAccessGrantedUntil: grantedUntil, updatedAt: timestamp });
    await appendAudit({ actorId, action: 'account.support_access.set', target: { type: 'account_settings', id: actorId }, metadata: body });
    return getAccountSettings(actorId);
  });

  app.post('/account/request-deletion', async (request) => {
    const { actorId } = getActor(request);
    const timestamp = nowIso();
    const pendingDeletionAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const settings = await getAccountSettings(actorId);
    await saveAccountSettings({ ...settings, pendingDeletionAt, updatedAt: timestamp });
    await appendAudit({ actorId, action: 'account.deletion.request', target: { type: 'account_settings', id: actorId } });
    return { pendingDeletionAt };
  });

  app.delete('/account/request-deletion', async (request) => {
    const { actorId } = getActor(request);
    const timestamp = nowIso();
    const settings = await getAccountSettings(actorId);
    await saveAccountSettings({ ...settings, pendingDeletionAt: null, updatedAt: timestamp });
    await appendAudit({ actorId, action: 'account.deletion.cancel', target: { type: 'account_settings', id: actorId } });
    return getAccountSettings(actorId);
  });
}
