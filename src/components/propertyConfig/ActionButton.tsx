/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ActionButton.tsx                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/02 14:36:43 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/02 14:36:44 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { cn } from '../../utils/cn';

function getButtonStyle(disabled?: boolean, danger?: boolean): string {
  if (disabled) return 'text-ink-disabled cursor-not-allowed';
  if (danger) return 'text-danger-text hover:bg-hover-danger';
  return 'text-ink-body hover:bg-hover-surface';
}

function getIconColor(disabled?: boolean, danger?: boolean): string {
  if (disabled) return 'text-ink-disabled';
  if (danger) return 'text-danger-text-soft';
  return 'text-ink-muted';
}

export function ActionButton({ icon, label, onClick, disabled, danger }: Readonly<{
  icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; danger?: boolean;
}>) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors ${getButtonStyle(disabled, danger)}`)}>
      <span className={cn(getIconColor(disabled, danger))}>{icon}</span>
      {label}
    </button>
  );
}
