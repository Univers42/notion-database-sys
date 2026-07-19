/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ViewSlideStage.tsx                                 :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/07/08 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * Slides the database body horizontally when the active view changes (switching
 * a tab in the header) so you SEE the outgoing and incoming views interpolate
 * across each other, in the direction the view sits in the tab bar.
 *
 * Two absolute "slots" ping-pong: the incoming view mounts once into the idle
 * slot and slides in; the outgoing stays in place and slides out — never
 * remounted, so its scroll position doesn't jump. When the slide ends the
 * incoming slot simply becomes active (no re-mount, no flash) and the outgoing
 * unmounts. Pure transform/opacity + one CSS transition — no animation library.
 * Falls back to an instant swap under prefers-reduced-motion or a hidden tab.
 */

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '../utils/cn';

const SLIDE_MS = 300;
const EASE = 'cubic-bezier(0.22, 0.61, 0.36, 1)'; // decelerate — content settling in

type Slot = 0 | 1;

interface SlideState {
  slots: [string, string]; // the viewId parked in each slot ('' = empty)
  keys: [number, number];  // remount key per slot (bumped only on (re)assignment)
  active: Slot;            // the slot currently showing
  incoming: Slot | null;   // the slot sliding in, or null when idle
  dir: 1 | -1;             // +1 = new view enters from the right, -1 = from the left
  run: boolean;            // false = pinned at the start offset, true = animating to rest
  lockH: number;           // stage pixel height pinned for the slide (0 = unmeasured)
}

/** Pure: a slot's translateX (% of its own width). Off-screen = ±100. Exported
 *  for unit tests — the whole direction/interpolation contract lives here. */
export function slideOffset(slot: Slot, s: Pick<SlideState, 'active' | 'incoming' | 'dir' | 'run'>): number {
  const enterFrom = s.dir === 1 ? 100 : -100;
  const exitTo = s.dir === 1 ? -100 : 100;
  if (s.incoming === null) return slot === s.active ? 0 : enterFrom;
  if (slot === s.incoming) return s.run ? 0 : enterFrom;
  if (slot === s.active) return s.run ? exitTo : 0;
  return enterFrom;
}

function prefersReducedMotion(): boolean {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch { return false; }
}

export interface ViewSlideStageProps {
  /** The view id to display (the resolved active view). */
  viewId: string;
  /** Index of {@link viewId} among its database's views (the tab order) — its
   *  change sign is the slide direction. */
  orderIndex: number;
  /** Renders a view's body, scoped to the given view id. */
  renderPane: (viewId: string) => React.ReactNode;
}

/** Full-page database body with an animated horizontal view transition. */
export function ViewSlideStage({ viewId, orderIndex, renderPane }: Readonly<ViewSlideStageProps>) {
  const [st, setSt] = useState<SlideState>(() => ({
    slots: [viewId, ''], keys: [0, 0], active: 0, incoming: null, dir: 1, run: false, lockH: 0,
  }));
  const lastIndex = useRef(orderIndex);
  const keySeq = useRef(0);
  const stageRef = useRef<HTMLDivElement | null>(null);

  // A new target view id → start a slide (or an instant swap when motion is off).
  // Measure the stage BEFORE the slots go absolute: absolute slots have no
  // intrinsic height, so the slide runs inside a height pinned to the outgoing
  // pane's real height instead of collapsing an auto-height host to zero.
  useEffect(() => {
    const measured = stageRef.current?.offsetHeight ?? 0;
    setSt(prev => {
      if (viewId === prev.slots[prev.active]) return prev; // already showing it
      const dir: 1 | -1 = orderIndex >= lastIndex.current ? 1 : -1;
      lastIndex.current = orderIndex;
      const slots: [string, string] = [prev.slots[0], prev.slots[1]];
      const keys: [number, number] = [prev.keys[0], prev.keys[1]];
      if (prefersReducedMotion() || (typeof document !== 'undefined' && document.hidden)) {
        slots[prev.active] = viewId;
        keys[prev.active] = ++keySeq.current;
        return { ...prev, slots, keys, incoming: null, dir, run: false };
      }
      const inc: Slot = prev.active === 0 ? 1 : 0;
      slots[inc] = viewId;
      keys[inc] = ++keySeq.current;
      return { slots, keys, active: prev.active, incoming: inc, dir, run: false, lockH: measured };
    });
  }, [viewId, orderIndex]);

  // One frame after the incoming slot paints at its start offset, arm the
  // transition and move both slots to rest so the browser animates the change.
  useEffect(() => {
    if (st.incoming === null || st.run) return;
    const raf = requestAnimationFrame(() =>
      setSt(s => (s.incoming === null || s.run ? s : { ...s, run: true })));
    return () => cancelAnimationFrame(raf);
  }, [st.incoming, st.run]);

  const commit = () =>
    setSt(s => (s.incoming === null ? s : { ...s, active: s.incoming, incoming: null }));

  // Safety net: settle even if the transitionend event is missed (interrupted, etc.).
  useEffect(() => {
    if (st.incoming === null || !st.run) return;
    const t = setTimeout(commit, SLIDE_MS + 120);
    return () => clearTimeout(t);
  }, [st.incoming, st.run]);

  const transitioning = st.incoming !== null;

  const renderSlot = (slot: Slot): React.ReactNode => {
    const id = st.slots[slot];
    if (!id || (slot !== st.active && slot !== st.incoming)) return null;
    if (!transitioning) {
      // Idle: keep the pane IN FLOW. Absolute slots contribute no intrinsic
      // height, so an auto-height host (a database block in the page flow)
      // would collapse the whole body to 0 px — the table renders headers and
      // nothing else. Normal flow lets the pane size the stage again.
      return (
        <div key={st.keys[slot]} className={cn('flex-1 flex flex-col min-h-0')}>
          {renderPane(id)}
        </div>
      );
    }
    const live = slot === st.active || slot === st.incoming;
    return (
      <div key={st.keys[slot]} className={cn('absolute inset-0 flex flex-col min-h-0')}
        style={{
          transform: `translate3d(${slideOffset(slot, st)}%, 0, 0)`,
          transition: st.run && transitioning ? `transform ${SLIDE_MS}ms ${EASE}` : 'none',
          pointerEvents: live ? undefined : 'none',
        }}
        onTransitionEnd={slot === st.incoming
          ? (e => { if (e.target === e.currentTarget && e.propertyName === 'transform') commit(); })
          : undefined}>
        {renderPane(id)}
      </div>
    );
  };

  return (
    <div ref={stageRef}
      className={cn('relative flex-1 flex flex-col min-h-0', transitioning && 'overflow-hidden')}
      style={transitioning && st.lockH > 0 ? { height: st.lockH, flex: 'none' } : undefined}>
      {renderSlot(0)}
      {renderSlot(1)}
    </div>
  );
}
