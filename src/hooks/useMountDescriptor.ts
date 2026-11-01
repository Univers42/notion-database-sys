/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   useMountDescriptor.ts                              :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/10/30 01:40:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/10/30 01:40:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { useEffect, useState } from 'react';
import type { MountDescriptor } from '../store/live/liveMountDescriptor';

export type DescriptorState =
  | { status: 'loading' }
  | { status: 'ready'; descriptor: MountDescriptor | null }
  | { status: 'failed' };

/** Resolves a live mount's descriptor; `describe` must be stable (memoised) or it refetches. */
export function useMountDescriptor(describe: () => Promise<MountDescriptor | null>): DescriptorState {
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
