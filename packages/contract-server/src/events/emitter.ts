/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   emitter.ts                                         :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/06 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 19:24:16 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { EventEmitter } from 'node:events';
import type { ChangeEvent } from '@notion-db/contract-types';
import { appendReplayEvent, type ReplayEntry } from './buffer';

/**
 * Single in-process emitter for ChangeEvents. Mutation routes publish to it;
 * the SSE endpoint subscribes to it. One instance per service process.
 */
export const changeEmitter = new EventEmitter();
changeEmitter.setMaxListeners(0);

/** Publishes a ChangeEvent to every connected SSE client. */
export function emitChange(event: ChangeEvent): ReplayEntry {
  const entry = appendReplayEvent(event);
  changeEmitter.emit('change', entry);
  return entry;
}
