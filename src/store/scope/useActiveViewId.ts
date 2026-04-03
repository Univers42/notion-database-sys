/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useActiveViewId.ts                                 :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:42:34 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 13:43:26 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { useContext } from 'react';
import { DatabaseScopeCtx } from './DatabaseScopeContext';
import { useDatabaseStore } from '../dbms/hardcoded/useDatabaseStore';

/**
 * Returns the effective activeViewId — scoped override if inside a
 * `<DatabaseScopeProvider>`, otherwise the global store value.
 */
export function useActiveViewId(): string | null {
  const scopedViewId = useContext(DatabaseScopeCtx);
  const globalViewId = useDatabaseStore(s => s.activeViewId);
  return scopedViewId ?? globalViewId;
}
