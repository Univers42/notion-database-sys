/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   Icon.tsx                                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:37:09 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 16:37:10 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { ICON_REGISTRY } from './iconRegistry';

// ═══════════════════════════════════════════════════════════════════════════════
// Generic <Icon /> renderer — looks up from the registry by kebab-case name.
// Usage: <Icon name="airplane" className="w-5 h-5" />
// ═══════════════════════════════════════════════════════════════════════════════

interface IconProps {
  /** Registry key, e.g. "airplane", "arrow-down-line" */
  name: string;
  className?: string;
  style?: React.CSSProperties;
  /** Override fill — defaults to "currentColor" */
  fill?: string;
}

export function Icon({ name, className = 'w-5 h-5', style, fill = 'currentColor' }: IconProps) {
  const entry = ICON_REGISTRY[name];
  if (!entry) {
    // Fallback: render a placeholder square
    return (
      <svg viewBox="0 0 20 20" className={className} style={style} fill={fill} aria-hidden="true">
        <rect x="3" y="3" width="14" height="14" rx="2" opacity="0.2" />
      </svg>
    );
  }
  const viewBox = entry.viewBox || '0 0 20 20';
  return (
    <svg
      viewBox={viewBox}
      className={className}
      style={style}
      fill={fill}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: entry.d }}
    />
  );
}

export default Icon;
