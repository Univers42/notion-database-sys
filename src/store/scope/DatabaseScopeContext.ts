/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   DatabaseScopeContext.ts                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:42:29 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 16:42:30 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── DatabaseScopeContext — React context for scoped view IDs ────────────────

import { createContext } from 'react';

/**
 * When a `viewId` is provided, all children that call `useActiveViewId()`
 * will receive this override instead of the global `activeViewId`.
 */
const DatabaseScopeCtx = createContext<string | null>(null);

export const DatabaseScopeProvider = DatabaseScopeCtx.Provider;
export { DatabaseScopeCtx };
