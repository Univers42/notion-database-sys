/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   index.ts                                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/06 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/10 00:36:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// The component is unusable without its Tailwind utility layer; importing it
// here guarantees every consumer gets the styles (a consumer that forgot the
// css import rendered the whole system transparent/unstyled).
import '../index.css';

// crypto.randomUUID is secure-context-only; over plain HTTP (LAN dev) every
// id-minting path (new view, widget, page) throws. RANDOMNESS COMES FIRST:
// several call sites slice() a short prefix, and a timestamp prefix made
// rapid successive ids collide (three dashboard widgets, one id).
if (globalThis.crypto && !globalThis.crypto.randomUUID) {
  globalThis.crypto.randomUUID = (() =>
    `${Math.random().toString(16).slice(2, 10)}-${Math.random().toString(16).slice(2, 6)}-${Date.now().toString(36)}`) as Crypto['randomUUID'];
}

export { ObjectDatabase } from '../object_database';
export { AdapterError } from './types';
export type {
  ChangeEvent,
  DocFilter,
  NotionState,
  ObjectDatabaseAdapter,
  ObjectDatabaseInstance,
  ObjectDatabaseProps,
  ObjectDatabaseSubItemRow,
  ObjectDatabaseSubItemsController,
  ObjectDatabaseTemplateSummary,
  ObjectDatabaseTemplatesController,
  Page,
  PageQuery,
  PropertyType,
  SchemaProperty,
} from './types';
export { HttpAdapter, InMemoryAdapter, RemoteAdapter } from './adapters';
export type { CollaboratorEntry, HostAdapters } from '../hooks/useHostAdapters';
// Automation seams the HOST wires: notify events surface as app toasts, and
// webhooks route through the app's authenticated bridge (default transport
// only warns — the engine never fetches).
export { AUTOMATION_FIRED_EVENT } from '../lib/automations/automationRunner';
export { setAutomationWebhookTransport } from '../lib/automations/webhookTransport';
