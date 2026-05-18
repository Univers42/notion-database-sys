/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   billing.routes.ts                                  :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/18 21:19:17 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/18 21:19:17 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { BillingStateDocument } from '../../db/collections.js';
import {
  appendAudit,
  getActor,
  looseRecordSchema,
  nowIso,
  parseBody,
  requireWorkspaceMember,
  requireWorkspaceRole,
  settingsCollection,
} from './helpers.js';

const billingPatchSchema = z.object({
  plan: z.string().trim().min(1).max(80).optional(),
  paymentMethod: looseRecordSchema.nullable().optional(),
  billedTo: looseRecordSchema.nullable().optional(),
  billingEmail: z.string().trim().toLowerCase().regex(/^\S+@\S+\.\S+$/).nullable().optional(),
  vatNumber: z.string().trim().max(80).nullable().optional(),
  upcomingInvoice: looseRecordSchema.nullable().optional(),
}).strict();

function defaultBillingState(workspaceId: string): BillingStateDocument {
  const timestamp = nowIso();
  return {
    workspaceId,
    plan: 'free',
    paymentMethod: null,
    billedTo: null,
    billingEmail: null,
    vatNumber: null,
    upcomingInvoice: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    removedAt: null,
  };
}

async function getBillingState(workspaceId: string) {
  return await settingsCollection('billing_state').findOne({ workspaceId, removedAt: null }) ?? defaultBillingState(workspaceId);
}

export async function billingRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>('/workspaces/:id/billing', async (request, reply) => {
    const { actorId } = getActor(request);
    if (!await requireWorkspaceMember(request.params.id, actorId, reply)) return undefined;
    return getBillingState(request.params.id);
  });

  app.patch<{ Params: { id: string } }>('/workspaces/:id/billing', async (request, reply) => {
    const body = parseBody(billingPatchSchema, request.body, reply);
    if (!body) return undefined;
    const { actorId } = getActor(request);
    if (!await requireWorkspaceRole(request.params.id, actorId, ['owner', 'admin'], reply)) return undefined;
    const current = await getBillingState(request.params.id);
    const state: BillingStateDocument = { ...current, ...body, updatedAt: nowIso() };
    await settingsCollection('billing_state').updateOne(
      { workspaceId: request.params.id },
      { $set: state },
      { upsert: true },
    );
    await appendAudit({ actorId, workspaceId: request.params.id, action: 'billing.update', target: { type: 'billing_state', id: request.params.id }, metadata: body });
    return state;
  });

  app.get<{ Params: { id: string } }>('/workspaces/:id/billing/invoices', async (request, reply) => {
    const { actorId } = getActor(request);
    if (!await requireWorkspaceMember(request.params.id, actorId, reply)) return undefined;
    return settingsCollection('billing_invoices').find({ workspaceId: request.params.id, removedAt: null }).sort({ createdAt: -1 }).toArray();
  });
}
