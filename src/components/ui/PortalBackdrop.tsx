/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   PortalBackdrop.tsx                                 :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/03 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/03 16:15:45 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { Z } from '../../utils/geometry';

interface PortalBackdropProps {
  onClose: () => void;
  zIndex?: number;
}

/**
 * Invisible fullscreen button that closes a portal on click.
 * Place this BEFORE the panel in the portal so the panel renders on top.
 */
export function PortalBackdrop({ onClose, zIndex = Z.CELL_BACKDROP }: Readonly<PortalBackdropProps>) {
  return (
    <button
      type="button"
      className="fixed inset-0 appearance-none border-0 bg-transparent p-0 cursor-default"
      style={{ zIndex }}
      onClick={e => { e.stopPropagation(); onClose(); }}
      tabIndex={-1}
      aria-label="Close"
    />
  );
}
