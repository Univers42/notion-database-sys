/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   fileWatcher.guard.ts                               :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/03 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/05 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const recentOwnWrites = new Map<string, number>();
const GUARD_TTL_MS = 2000;

/** Mark a file as "just written by us" so the watcher ignores the next event. */
export function markOwnWrite(filePath: string): void {
  recentOwnWrites.set(filePath, Date.now());
}

export function isOwnWrite(filePath: string): boolean {
  const ts = recentOwnWrites.get(filePath);
  if (!ts) return false;
  if (Date.now() - ts > GUARD_TTL_MS) {
    recentOwnWrites.delete(filePath);
    return false;
  }
  recentOwnWrites.delete(filePath);
  return true;
}
