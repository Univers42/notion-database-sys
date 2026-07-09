/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   webhookTransport.ts                                 :+:      :+:    :+:  */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 18:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 18:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── Automation webhook transport — host-registered, engine-agnostic ────────
// The engine never talks to the network itself: the HOST registers a transport
// (the app proxies through its bridge's SSRF-guarded POST /api/automations/
// webhook). Module singleton — the store runner has no React context. Without
// a registered transport (offline builds, tests) dispatch degrades to a warn.

export type AutomationWebhookTransport = (url: string, payload: unknown) => Promise<void>;

let transport: AutomationWebhookTransport | null = null;

/** Host seam: install the function that actually delivers webhooks. */
export function setAutomationWebhookTransport(fn: AutomationWebhookTransport | null): void {
  transport = fn;
}

/** Fire-and-forget webhook delivery; failures never break the mutation path. */
export function dispatchAutomationWebhook(url: string, payload: unknown): void {
  if (!transport) {
    console.warn('[automations] webhook skipped — no transport registered:', url);
    return;
  }
  void transport(url, payload).catch(err =>
    console.warn('[automations] webhook delivery failed:', url, err));
}
