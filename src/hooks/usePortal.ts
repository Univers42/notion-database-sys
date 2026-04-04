/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   usePortal.ts                                       :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/03 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/03 16:15:45 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { useEffect } from 'react';

interface UsePortalOptions {
  onClose: () => void;
  /** If true, pressing Escape closes the portal */
  closeOnEscape?: boolean;
}

/**
 * Attaches Escape-key close behaviour for portal-based panels.
 * Pair with the <PortalBackdrop> component for the invisible click-catcher.
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
