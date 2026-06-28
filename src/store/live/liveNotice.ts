/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   liveNotice.ts                                       :+:      :+:    :+:   */
/*                                                     +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>           +#+  +:+       +#+        */
/*                                                 +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/27 12:00:00 by dlesieur           #+#    #+#             */
/*   Updated: 2026/06/27 12:00:00 by dlesieur          ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

/**
 * Decoupling seam for surfacing live-write outcomes to the host app. The dbms
 * host has NO toast system (see liveConflict), so a rejected cell write only
 * reaches console.warn and the UI silently reverts — which makes a failing save
 * indistinguishable from a no-op to the user. The app registers a sink once via
 * setLiveWriteNotifier; the write pipeline calls emitLiveWriteNotice on every
 * conflict reconcile so the app can show a toast. The dependency points one way
 * (app → seam); this vendored tree never imports the app, mirroring the
 * globalThis.__playgroundUserStore seam already used for the same purpose.
 */

export interface LiveWriteNotice {
  /** The table whose cell write was reconciled (for the message). */
  table: string;
  /** A user-facing explanation (already formatted by liveConflict). */
  message: string;
  /** 'corrected' = server row re-applied; 'deleted' = row gone; 'unknown' = refetch failed. */
  resolution: 'corrected' | 'deleted' | 'unknown';
}

let noticeSink: ((notice: LiveWriteNotice) => void) | null = null;

/** Register (or clear with null) the app-side sink that surfaces write notices. */
export function setLiveWriteNotifier(sink: ((notice: LiveWriteNotice) => void) | null): void {
  noticeSink = sink;
}

/** Deliver a write notice to the registered sink; a no-op when none is set. */
export function emitLiveWriteNotice(notice: LiveWriteNotice): void {
  noticeSink?.(notice);
}
