/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   serverTypes.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/05/06 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/05/06 18:48:24 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import type { NotionState } from '@notion-db/contract-types';

/** Meta document stored in MongoDB's _meta collection. */
export interface MetaState {
  _id: 'notion-state';
  databases: NotionState['databases'];
  views: NotionState['views'];
  fieldMaps: Record<string, Record<string, string>>;
  updatedAt: string;
}

/** Standard ok response for mutation endpoints. */
export interface OkResponse {
  ok: true;
}

/** Standard error response for all endpoints. */
export interface ErrorResponse {
  error: string;
  code?: string;
}
