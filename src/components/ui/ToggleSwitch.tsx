/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   ToggleSwitch.tsx                                   :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/03 12:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/03 17:11:28 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { cn } from '../../utils/cn';

export type ToggleSwitchSlots = {
  root?: string;
  track?: string;
  thumb?: string;
  labelWrap?: string;
  label?: string;
};

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  /** Size variant. 'sm' = 14x26px (Notion style), 'md' = 18x32px (default) */
  size?: 'sm' | 'md';
  disabled?: boolean;
  slots?: Partial<ToggleSwitchSlots>;
}

export function ToggleSwitch({
  checked,
  onChange,
  label,
  size = 'sm',
  disabled = false,
  slots = {},
}: Readonly<ToggleSwitchProps>) {
  const trackW = size === 'sm' ? 26 : 32;
  const trackH = size === 'sm' ? 14 : 18;
  const thumbW = size === 'sm' ? 14 : 14;
  const thumbOffset = size === 'sm' ? 12 : 14;

  const track = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={e => { e.stopPropagation(); if (!disabled) onChange(!checked); }}
      className={cn('relative shrink-0 transition-colors cursor-pointer', disabled && 'opacity-50 cursor-not-allowed', slots.root)}
    >
      <div
        className={cn('flex shrink-0 rounded-full p-[2px] transition-colors duration-200', checked ? 'bg-accent' : 'bg-surface-strong', slots.track)}
        style={{ width: trackW, height: trackH, boxSizing: 'content-box' }}
      >
        <div
          className={cn('rounded-full bg-surface-primary shadow-sm transition-transform duration-200', slots.thumb)}
          style={{
            width: thumbW,
            height: thumbW,
            transform: checked ? `translateX(${thumbOffset}px)` : 'translateX(0)',
          }}
        />
      </div>
    </button>
  );

  if (!label) return track;

  return (
    <button
      type="button"
      onClick={() => { if (!disabled) onChange(!checked); }}
      disabled={disabled}
      className={cn('w-full flex items-center justify-between text-sm text-ink-body py-1 px-1 rounded-lg hover:bg-hover-surface transition-colors', slots.labelWrap)}
    >
      <span className={cn('flex-1 text-left truncate', slots.label)}>{label}</span>
      <div className={cn("shrink-0 ml-2")}>{track}</div>
    </button>
  );
}
