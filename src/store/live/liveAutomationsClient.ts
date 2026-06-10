/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   liveAutomationsClient.ts                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 12:00:00 by dlesieur          #+#    #+#             */
/*                                                +#+#+#+#+#+   +#+           */
/* ************************************************************************** */

/**
 * Client for the server-backed automation rules of a live mount
 * (`GET|PUT /query/v1/:dbId/automations` — query-router, AuthGuard).
 * Server-side rules fire for EVERY client writing to the mount, not only
 * this session — that asymmetry vs local-database automations is the whole
 * point of the endpoint.
 */

import type { AutomationRule } from '@notion-db/contract-types';
import { requestLive } from './liveMountClient';

/** Rules stored for the mount (server truth, no client cache — the panel
 *  reads on open and writes on save). */
export async function getLiveAutomations(dbId: string): Promise<AutomationRule[]> {
  const response = await requestLive<{ rules: AutomationRule[] }>(
    `/query/v1/${encodeURIComponent(dbId)}/automations`,
    { method: 'GET' },
  );
  return response.rules ?? [];
}

/** Replace-all save (PUT semantics — the body is the full rule set). */
export async function putLiveAutomations(dbId: string, rules: AutomationRule[]): Promise<AutomationRule[]> {
  const response = await requestLive<{ rules: AutomationRule[] }>(
    `/query/v1/${encodeURIComponent(dbId)}/automations`,
    { method: 'PUT', body: JSON.stringify({ rules }) },
  );
  return response.rules ?? rules;
}
