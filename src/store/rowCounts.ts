/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   rowCounts.ts                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/10/27 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/10/27 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { Page } from '../types/database';

// Counted once per pages object: the toolbar reads the count on every store
// change, and scanning the account each time cost 1.35 ms on 8,646 rows.
// The stores replace `pages` on every row change, so identity is the version.
const countsByPages = new WeakMap<Record<string, Page>, Map<string, number>>();

export function rowCountOf(pages: Record<string, Page>, databaseId: string): number {
  let counts = countsByPages.get(pages);
  if (!counts) {
    counts = new Map();
    for (const pageId in pages) {
      const owner = pages[pageId].databaseId;
      counts.set(owner, (counts.get(owner) ?? 0) + 1);
    }
    countsByPages.set(pages, counts);
  }
  return counts.get(databaseId) ?? 0;
}
