/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   fileWatcher.types.ts                               :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/03 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/05 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

export type DbSourceType = 'json' | 'csv' | 'mongodb' | 'postgresql';

export interface PageLike {
  id: string;
  databaseId: string;
  properties: Record<string, unknown>;
  [key: string]: unknown;
}

export interface NotionState {
  databases: Record<string, unknown>;
  pages: Record<string, PageLike>;
  views: Record<string, unknown>;
}

/** Changeset: pageId → { propId → newValue } */
export type Changeset = Record<string, Record<string, unknown>>;
