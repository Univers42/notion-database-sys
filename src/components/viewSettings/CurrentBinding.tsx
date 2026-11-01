/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   CurrentBinding.tsx                                 :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/10/30 01:40:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/10/30 01:40:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// Read-only for everyone: grobase has no PATCH for a mount's binding yet (G4b), so there
// is nothing an owner could edit here; picking another source below rebinds the VIEW only.

import React, { useCallback } from 'react';
import { fetchMountDescriptor, formatMountLocation } from '../../store/live/liveMountDescriptor';
import { useMountDescriptor } from '../../hooks/useMountDescriptor';
import { cn } from '../../utils/cn';

/** Where the live mount behind this view lives: engine · host or file, TLS, credentials. */
export function CurrentBinding({ dbId }: Readonly<{ dbId: string }>) {
  const describe = useCallback(() => fetchMountDescriptor(dbId), [dbId]);
  const state = useMountDescriptor(describe);
  if (state.status === 'loading') return null;
  const descriptor = state.status === 'ready' ? state.descriptor : null;
  const view = descriptor ? formatMountLocation(descriptor) : null;
  const details = [view?.tls?.label, descriptor?.credential_mode && `credentials: ${descriptor.credential_mode}`]
    .filter(Boolean).join(' · ');

  return (
    <section aria-label="Current connection" className={cn('mx-3 mb-2 rounded-md border border-line px-2 py-1.5')}>
      {view ? (
        <>
          <p className={cn('m-0 text-sm font-medium text-ink-strong break-all')}>{view.engine} · {view.where}</p>
          {details && <p className={cn('m-0 text-xs text-ink-muted')}>{details}</p>}
        </>
      ) : (
        <p className={cn('m-0 text-xs text-ink-muted')}>Connection details unavailable</p>
      )}
    </section>
  );
}
