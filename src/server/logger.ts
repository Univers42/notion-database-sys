/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   logger.ts                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 22:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 23:14:06 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// Server-side logger for the DBMS middleware

const PREFIX = '[dbms]';

/** Initialize the logger with the active source label. */
export function initLogger(source: string): void {
  console.log(`${PREFIX} Logger initialized for source: ${source}`);
}

/** Log a lifecycle event (source switch, init, shutdown). */
export function logLifecycle(message: string): void {
  console.log(`${PREFIX} ${message}`);
}
