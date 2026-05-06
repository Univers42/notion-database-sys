/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   emitter.ts                                         :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/06 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 18:48:28 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { EventEmitter } from 'node:events';
import type { ChangeEvent } from '@notion-db/contract-types';

/**
 * Single in-process emitter for ChangeEvents. Mutation routes publish to it;
 * the SSE endpoint subscribes to it. One instance per service process.
 */
export const changeEmitter = new EventEmitter();
changeEmitter.setMaxListeners(0);

/** Publishes a ChangeEvent to every connected SSE client. */
export function emitChange(event: ChangeEvent): void {
  changeEmitter.emit('change', event);
}
