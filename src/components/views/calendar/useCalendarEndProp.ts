/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useCalendarEndProp.ts                               :+:      :+:    :+:  */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── useCalendarEndProp — resolve/create the paired End Date property ───────
// Calendar copy of the timeline's find/ensure logic (useTimelineDrag L46-83),
// minus timeline name-heuristics: the start property's SCHEMA pairing
// (endPropertyId) wins, else an "End Date" date property is created and the
// pairing recorded — so the table's date cell renders the SAME interval.

import { useCallback } from 'react';
import { useStoreApi } from '../../../store/dbms/hardcoded/useDatabaseStore';
import type { SchemaProperty } from '../../../types/database';

export function useCalendarEndProp(dbId: string | undefined, startPropId: string | undefined) {
  const storeApi = useStoreApi();

  const findEndProp = useCallback((): SchemaProperty | null => {
    if (!dbId || !startPropId) return null;
    const db = storeApi.getState().databases[dbId];
    if (!db) return null;
    const paired = db.properties[startPropId]?.endPropertyId;
    if (paired && db.properties[paired]) return db.properties[paired];
    return Object.values(db.properties).find(
      p => p.name === 'End Date' && (p.type === 'date' || p.type === 'due_date'),
    ) ?? null;
  }, [dbId, startPropId, storeApi]);

  const ensureEndProp = useCallback((): SchemaProperty | null => {
    if (!dbId || !startPropId) return null;
    let endProp = findEndProp();
    if (!endProp) {
      storeApi.getState().addProperty(dbId, 'End Date', 'date');
      const updated = storeApi.getState().databases[dbId];
      endProp = updated
        ? Object.values(updated.properties).find(
            p => p.name === 'End Date' && (p.type === 'date' || p.type === 'due_date'),
          ) ?? null
        : null;
    }
    if (endProp && endProp.id !== startPropId) {
      const state = storeApi.getState();
      if (state.databases[dbId]?.properties[startPropId]?.endPropertyId !== endProp.id) {
        state.updateProperty(dbId, startPropId, { endPropertyId: endProp.id });
      }
    }
    return endProp;
  }, [dbId, findEndProp, startPropId, storeApi]);

  return { findEndProp, ensureEndProp };
}
