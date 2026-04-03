/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   usePortal.ts                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/03 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 13:16:06 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { useEffect } from 'react';

interface UsePortalOptions {
  onClose: () => void;
  /** If true, pressing Escape closes the portal */
  closeOnEscape?: boolean;
}

/**
 * Attaches Escape-key close behavior for portal-based panels.
 *
 * Registers a `keydown` listener on `document` that calls `onClose`
 * on Escape. The listener is removed on unmount or when `closeOnEscape`
 * is set to false. Pair with `<PortalBackdrop>` for click-outside dismissal.
 *
 * @param onClose       - Called when the user presses Escape.
 * @param closeOnEscape - Set false to disable Escape handling. Default true.
 */
export function usePortalClose({ onClose, closeOnEscape = true }: UsePortalOptions) {
  useEffect(() => {
    if (!closeOnEscape) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose, closeOnEscape]);
}
