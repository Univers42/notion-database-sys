/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ViewSlideStage.tsx                                 :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/07/08 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/10/27 00:30:00 by dlesieur         ###   ########.fr       */
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
 *
 * `flow` is for embeds that size to their content (an inline database in a
 * page): the incoming pane stays in flow at its natural height and the stage
 * height animates from the outgoing pane's to it, so the page below glides
 * instead of jumping when the slide ends.
 *
 * A pane that is still loading (a lazy chunk behind Suspense) is not at its
 * real height yet. Its fallback wraps itself in {@link PaneLoading}; while the
 * incoming pane has one mounted, the stage keeps the outgoing height and does
 * not settle, so a flow embed never shrinks the page to a "Loading…" line —
 * which used to clamp the page scroll to the top on a cold dashboard switch.
 */

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { cn } from '../utils/cn';

const SLIDE_MS = 300;
const EASE = 'cubic-bezier(0.22, 0.61, 0.36, 1)'; // decelerate — content settling in

// Caveat: a chunk that never resolves would hold the slide forever, so the
// hold gives up after this long and settles on the placeholder's height.
const LOADING_HOLD_MS = 3000;

type Slot = 0 | 1;

/** Registers a loading pane with its slot; returns the unregister. */
const PaneLoadingContext = createContext<(() => () => void) | null>(null);

/** Wrap a Suspense fallback rendered inside a view pane: the slide stage waits
 *  for the real content before it sizes to the pane. Outside a stage it only
 *  renders its children. */
export function PaneLoading({ children }: Readonly<{ children: React.ReactNode }>) {
  const register = useContext(PaneLoadingContext);
  useEffect(() => register?.(), [register]);
  return <>{children}</>;
}

/** Pure: how long a running slide may wait before it settles anyway. */
export function settleDelay(loading: boolean): number {
  return loading ? LOADING_HOLD_MS : SLIDE_MS + 120;
}

export interface SlideState {
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

/** Pure: the stage state once the target view becomes `viewId`. Retargeting
 *  mid-slide back to the outgoing view cancels the slide; before, it was a
 *  no-op (the outgoing view still "showed"), so the slide landed on the view
 *  the user had just left while the tab bar and store said otherwise. */
export function retargetSlide(
  prev: SlideState, viewId: string, dir: 1 | -1, instant: boolean, nextKey: () => number, measured: number,
): SlideState {
  if (viewId === prev.slots[prev.active]) {
    return prev.incoming === null ? prev : { ...prev, incoming: null, run: false };
  }
  if (prev.incoming !== null && viewId === prev.slots[prev.incoming]) return prev;
  const slots: [string, string] = [prev.slots[0], prev.slots[1]];
  const keys: [number, number] = [prev.keys[0], prev.keys[1]];
  if (instant) {
    slots[prev.active] = viewId;
    keys[prev.active] = nextKey();
    return { ...prev, slots, keys, incoming: null, dir, run: false };
  }
  const inc: Slot = prev.active === 0 ? 1 : 0;
  slots[inc] = viewId;
  keys[inc] = nextKey();
  return { slots, keys, active: prev.active, incoming: inc, dir, run: false, lockH: measured };
}

/** Pure: the stage's inline style. A full-page stage pins the outgoing height
 *  for the slide; a flow stage animates from it to the incoming pane's height
 *  (`toH`, 0 until measured). Idle stages take no style: they size normally. */
export function stageStyle(
  s: Pick<SlideState, 'incoming' | 'run' | 'lockH'>, flow: boolean, toH: number,
): React.CSSProperties | undefined {
  if (s.incoming === null || s.lockH <= 0) return undefined;
  if (!flow) return { height: s.lockH, flex: 'none' };
  if (!s.run || toH <= 0) return { height: s.lockH, flex: 'none' };
  return { height: toH, flex: 'none', transition: `height ${SLIDE_MS}ms ${EASE}` };
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
  /** The host sizes to its content (an inline embed), not to a fixed height. */
  flow?: boolean;
}

/** Database body with an animated horizontal view transition. */
export function ViewSlideStage({ viewId, orderIndex, renderPane, flow = false }: Readonly<ViewSlideStageProps>) {
  const [st, setSt] = useState<SlideState>(() => ({
    slots: [viewId, ''], keys: [0, 0], active: 0, incoming: null, dir: 1, run: false, lockH: 0,
  }));
  const lastIndex = useRef(orderIndex);
  const keySeq = useRef(0);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const incomingRef = useRef<HTMLDivElement | null>(null);
  const [toH, setToH] = useState(0);
  // Mounted PaneLoading count per slot key (keys are never reused).
  const [loadingByKey, setLoadingByKey] = useState<Record<number, number>>({});
  const registers = useRef(new Map<number, () => () => void>());
  const registerFor = (key: number) => {
    let fn = registers.current.get(key);
    if (!fn) {
      for (const k of registers.current.keys()) if (!st.keys.includes(k)) registers.current.delete(k);
      const bump = (d: number) => setLoadingByKey(m => ({ ...m, [key]: (m[key] ?? 0) + d }));
      fn = () => { bump(1); return () => bump(-1); };
      registers.current.set(key, fn);
    }
    return fn;
  };
  const incomingLoading = st.incoming !== null && (loadingByKey[st.keys[st.incoming]] ?? 0) > 0;

  // A new target view id → start a slide (or an instant swap when motion is off).
  // Measure the stage BEFORE the slots go absolute: absolute slots have no
  // intrinsic height, so the slide runs inside a height pinned to the outgoing
  // pane's real height instead of collapsing an auto-height host to zero.
  useEffect(() => {
    const measured = stageRef.current?.offsetHeight ?? 0;
    setSt(prev => {
      const dir: 1 | -1 = orderIndex >= lastIndex.current ? 1 : -1;
      lastIndex.current = orderIndex;
      const instant = prefersReducedMotion() || (typeof document !== 'undefined' && document.hidden);
      return retargetSlide(prev, viewId, dir, instant, () => ++keySeq.current, measured);
    });
  }, [viewId, orderIndex]);

  // One frame after the incoming slot paints at its start offset, arm the
  // transition and move both slots to rest so the browser animates the change.
  useEffect(() => {
    if (st.incoming === null || st.run) return;
    const raf = requestAnimationFrame(() => {
      setToH(0);
      setSt(s => (s.incoming === null || s.run ? s : { ...s, run: true }));
    });
    return () => cancelAnimationFrame(raf);
  }, [st.incoming, st.run, flow]);

  // A flow stage grows/shrinks to the incoming pane once it holds real content.
  useEffect(() => {
    if (!flow || st.incoming === null || !st.run || incomingLoading) return;
    setToH(incomingRef.current?.offsetHeight ?? 0);
  }, [flow, st.incoming, st.run, incomingLoading]);

  const commit = () =>
    setSt(s => (s.incoming === null ? s : { ...s, active: s.incoming, incoming: null }));

  // Safety net: settle even if the transitionend event is missed (interrupted,
  // or ignored while the incoming pane was loading).
  useEffect(() => {
    if (st.incoming === null || !st.run) return;
    const t = setTimeout(commit, settleDelay(incomingLoading));
    return () => clearTimeout(t);
  }, [st.incoming, st.run, incomingLoading]);

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
          <PaneLoadingContext.Provider value={registerFor(st.keys[slot])}>
            {renderPane(id)}
          </PaneLoadingContext.Provider>
        </div>
      );
    }
    const live = slot === st.active || slot === st.incoming;
    const inFlow = flow && slot === st.incoming;
    let place = 'absolute inset-0 min-h-0';
    if (inFlow) place = 'relative flex-none';
    else if (flow) place = 'absolute inset-x-0 top-0';
    return (
      <div key={st.keys[slot]} ref={inFlow ? incomingRef : undefined}
        className={cn('flex flex-col', place)}
        style={{
          transform: `translate3d(${slideOffset(slot, st)}%, 0, 0)`,
          transition: st.run && transitioning ? `transform ${SLIDE_MS}ms ${EASE}` : 'none',
          pointerEvents: live ? undefined : 'none',
        }}
        onTransitionEnd={slot === st.incoming
          ? (e => {
            if (e.target === e.currentTarget && e.propertyName === 'transform' && !incomingLoading) commit();
          })
          : undefined}>
        <PaneLoadingContext.Provider value={registerFor(st.keys[slot])}>
          {renderPane(id)}
        </PaneLoadingContext.Provider>
      </div>
    );
  };

  return (
    <div ref={stageRef}
      className={cn('relative flex-1 flex flex-col min-h-0', transitioning && 'overflow-hidden')}
      style={stageStyle(st, flow, toH)}>
      {renderSlot(0)}
      {renderSlot(1)}
    </div>
  );
}
