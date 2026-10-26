/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   Icon.tsx                                           :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:37:09 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 14:52:49 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { ICON_REGISTRY } from './iconRegistry';

interface IconProps {
  /** Registry key, e.g. "airplane", "arrow-down-line" */
  name: string;
  className?: string;
  style?: React.CSSProperties;
  /** Override fill — defaults to "currentColor" */
  fill?: string;
}

// React compares dangerouslySetInnerHTML by object identity, so a fresh
// `{ __html }` per render re-parsed every icon on every re-render (50 table
// grips per cell edit, 23 ms of innerHTML on a 5k-row view). One frozen object
// per registry entry keeps re-renders free.
const HTML_BY_NAME = new Map<string, { __html: string }>();
function iconHtml(name: string, d: string): { __html: string } {
  let html = HTML_BY_NAME.get(name);
  if (!html) {
    html = Object.freeze({ __html: d });
    HTML_BY_NAME.set(name, html);
  }
  return html;
}

/** Renders an SVG icon from the registry by kebab-case name. */
export function Icon({ name, className = 'w-5 h-5', style, fill = 'currentColor' }: Readonly<IconProps>) {
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
      dangerouslySetInnerHTML={iconHtml(name, entry.d)}
    />
  );
}

export default Icon;
