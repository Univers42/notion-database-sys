/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useMonthLaneCapacity.ts                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/10/26 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/10/26 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { useLayoutEffect, useState } from 'react';
import { lanesThatFit } from './calendarConfig';
import { MAX_VISIBLE_LANES } from './model/calendarTypes';

/** Month rows stretch to fill the pane; this turns the height each row really
 *  gets into how many event lanes it shows, so a tall pane lists events
 *  instead of an empty band under "+N more". */
export function useMonthLaneCapacity(rowsRef: React.RefObject<HTMLDivElement | null>, weekCount: number): number {
  const [lanes, setLanes] = useState(MAX_VISIBLE_LANES);
  useLayoutEffect(() => {
    const el = rowsRef.current;
    if (!el || weekCount === 0) return;
    // -1: each row's bottom border sits inside its share of the height.
    const measure = () => setLanes(lanesThatFit(el.clientHeight / weekCount - 1, MAX_VISIBLE_LANES));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [rowsRef, weekCount]);
  return lanes;
}
