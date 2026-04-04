/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   pgLoader.ts                                        :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/04 22:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 23:14:06 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// Loads pages from a live PostgreSQL database for the DBMS middleware.
// Returns null if the database is unreachable.

type FieldMaps = Record<string, Record<string, string>>;

/** Fetch all pages from PostgreSQL tables, keyed by page ID. */
export async function pgLoadPages(
  _fieldMaps: FieldMaps,
): Promise<Record<string, Record<string, unknown>> | null> {
  // Stub — live PostgreSQL loading not yet implemented.
  // Returns null so the middleware falls back to seed state.
  return null;
}
