/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   session.ts                                         :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 15:07:39 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 22:31:03 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/** Refresh token stored in MongoDB with TTL */
export interface Session {
  _id: string;
  userId: string;
  refreshToken: string;
  userAgent?: string;
  ip?: string;
  createdAt: Date;
  /** TTL index: auto-expires after 30 days */
  expiresAt: Date;
}

/** Ephemeral cursor presence (not persisted — managed in-memory or Redis) */
export interface CursorPresence {
  userId: string;
  pageId: string;
  blockId?: string;
  cursor?: { line: number; column: number };
  color: string;
  name: string;
  lastSeen: number;
}
