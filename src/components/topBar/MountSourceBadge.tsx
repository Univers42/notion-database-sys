/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   MountSourceBadge.tsx                               :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/10/29 21:45:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/10/29 21:45:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, { useContext, useEffect, useRef, useState } from 'react';
import { Database, Lock, LockOpen, ShieldAlert, ShieldCheck } from 'lucide-react';
import { AdapterContext } from '../../component/adapterContext';
import { DbSourceDropdown } from '../DbSourceDropdown';
import { AnchoredPopover } from './AnchoredPopover';
import {
  formatMountLocation, type MountDescriptor, type TlsTone,
} from '../../store/live/liveMountDescriptor';
import { cn } from '../../utils/cn';

type LocationDescribingAdapter = { describeLocation?: () => Promise<MountDescriptor | null> };

const TLS_ICON: Record<TlsTone, { Icon: typeof Lock; className: string }> = {
  secure: { Icon: ShieldCheck, className: 'text-success-text' },
  warning: { Icon: ShieldAlert, className: 'text-warning-text' },
  plain: { Icon: LockOpen, className: 'text-ink-muted' },
  neutral: { Icon: Lock, className: 'text-ink-muted' },
};

/** A live mount names where its data lives; the playground keeps its source switcher. */
export function DataSourceIndicator() {
  const adapter = useContext(AdapterContext) as LocationDescribingAdapter | null;
  const describe = adapter?.describeLocation;
  return describe ? <MountSourceBadge describe={describe} /> : <DbSourceDropdown />;
}

type DescriptorState = { status: 'loading' } | { status: 'ready'; descriptor: MountDescriptor | null } | { status: 'failed' };

function useDescriptor(describe: () => Promise<MountDescriptor | null>): DescriptorState {
  const [state, setState] = useState<DescriptorState>({ status: 'loading' });
  useEffect(() => {
    let live = true;
    describe().then(
      (descriptor) => { if (live) setState({ status: 'ready', descriptor }); },
      () => { if (live) setState({ status: 'failed' }); },
    );
    return () => { live = false; };
  }, [describe]);
  return state;
}

function MountSourceBadge({ describe }: Readonly<{ describe: () => Promise<MountDescriptor | null> }>) {
  const state = useDescriptor(describe);
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const descriptor = state.status === 'ready' ? state.descriptor : null;
  const view = descriptor ? formatMountLocation(descriptor) : null;
  const label = view ? `${view.engine} · ${view.where}` : pendingLabel(state);
  const tls = view?.tls ? TLS_ICON[view.tls.tone] : null;

  return (
    <>
      <button ref={buttonRef} type="button" onClick={() => setOpen(!open)} disabled={!descriptor}
        aria-haspopup="dialog" aria-expanded={open}
        aria-label={`Data source: ${label}${view?.tls ? `, ${view.tls.label}` : ''}`}
        title={view ? `${label}${view.tls ? ` — ${view.tls.label}` : ''}` : label}
        className={cn(`flex items-center gap-1.5 px-2 py-1 rounded-md max-w-[16rem] text-xs font-medium text-ink-muted
          hover:bg-hover-surface transition-colors motion-reduce:transition-none
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-default
          ${open ? 'bg-surface-tertiary' : ''}`)}>
        <Database aria-hidden className={cn('w-3.5 h-3.5 shrink-0')} />
        <span className={cn('truncate')}>{label}</span>
        {tls && view?.tls && <tls.Icon aria-hidden className={cn('w-3.5 h-3.5 shrink-0', tls.className)} />}
      </button>
      {open && descriptor && view && (
        <AnchoredPopover anchorRef={buttonRef} label="Data source" width={288} onClose={() => setOpen(false)}>
          <DescriptorDetails descriptor={descriptor} engine={view.engine} where={view.where} tls={view.tls?.label} />
        </AnchoredPopover>
      )}
    </>
  );
}

function pendingLabel(state: DescriptorState): string {
  if (state.status === 'loading') return 'Locating…';
  return state.status === 'failed' ? 'Location unavailable' : 'Live database';
}

function DescriptorDetails({ descriptor, engine, where, tls }: Readonly<{
  descriptor: MountDescriptor; engine: string; where: string; tls?: string;
}>) {
  const rows: Array<[string, string | undefined]> = [
    ['Engine', engine],
    ['Location', where],
    ['Database', descriptor.database || undefined],
    ['TLS', tls ?? (descriptor.tls === 'n/a' ? 'Not applicable (local file)' : 'Unknown')],
    ['Credentials', descriptor.credential_mode],
    ['Isolation', descriptor.isolation],
    ['Last healthy', descriptor.last_healthy_at ? new Date(descriptor.last_healthy_at).toLocaleString() : 'Not yet checked'],
  ];
  return (
    <div className={cn('p-3')}>
      <h2 className={cn('mb-2 text-sm font-semibold text-ink-strong truncate')}>{descriptor.name ?? 'Data source'}</h2>
      <dl className={cn('grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs')}>
        {rows.filter(([, value]) => value).map(([term, value]) => (
          <React.Fragment key={term}>
            <dt className={cn('text-ink-muted')}>{term}</dt>
            <dd className={cn('m-0 text-ink-body break-all')}>{value}</dd>
          </React.Fragment>
        ))}
      </dl>
    </div>
  );
}
