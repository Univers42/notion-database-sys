/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   SlashMenuIconsExtended.tsx                         :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/02 14:58:52 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 11:45:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React from 'react';
import { cn } from '../../../utils/cn';

export function IconFile() {
  return (
    <svg viewBox="0 0 20 20" className={cn("w-5 h-5")} fill="currentColor">
    </svg>
  );
}

export function IconBookmark() {
  return (
    <svg viewBox="0 0 20 20" className={cn("w-5 h-5")} fill="currentColor">
      <path d="M4.125 4c0-1.174.951-2.125 2.125-2.125h7.5c1.174 0 2.125.951 2.125 2.125v12.502a1.125 1.125 0 0 1-1.799.9L10 14.356l-4.076 3.048a1.125 1.125 0 0 1-1.799-.901zm2.125-.875A.875.875 0 0 0 5.375 4v12.252l3.951-2.954c.4-.298.948-.298 1.348 0l3.951 2.954V4a.875.875 0 0 0-.875-.875z" />
    </svg>
  );
}

export function IconBoard() {
  return (
    <svg viewBox="0 0 20 20" className={cn("w-5 h-5")} fill="currentColor">
      <path d="M2.375 6.25c0-1.174.951-2.125 2.125-2.125h11c1.174 0 2.125.951 2.125 2.125v7.5a2.125 2.125 0 0 1-2.125 2.125h-11a2.125 2.125 0 0 1-2.125-2.125zm10.584 8.375H15.5a.875.875 0 0 0 .875-.875v-7.5a.875.875 0 0 0-.875-.875h-2.541zm-1.25-9.25H8.292v9.25h3.417zm-7.209 0a.875.875 0 0 0-.875.875v7.5c0 .483.392.875.875.875h2.542v-9.25z" />
    </svg>
  );
}

export function IconGallery() {
  return (
    <svg viewBox="0 0 20 20" className={cn("w-5 h-5")} fill="currentColor">
      <path d="M4 3.375c-.897 0-1.625.728-1.625 1.625v2.5c0 .897.728 1.625 1.625 1.625h3.5c.897 0 1.625-.728 1.625-1.625V5c0-.897-.728-1.625-1.625-1.625zM3.625 5c0-.207.168-.375.375-.375h3.5c.207 0 .375.168.375.375v2.5a.375.375 0 0 1-.375.375H4a.375.375 0 0 1-.375-.375zM4 10.875c-.897 0-1.625.727-1.625 1.625V15c0 .898.728 1.625 1.625 1.625h3.5c.897 0 1.625-.727 1.625-1.625v-2.5c0-.898-.728-1.625-1.625-1.625zM3.625 12.5c0-.207.168-.375.375-.375h3.5c.207 0 .375.168.375.375V15a.375.375 0 0 1-.375.375H4A.375.375 0 0 1 3.625 15zm7.25-7.5c0-.897.727-1.625 1.625-1.625H16c.898 0 1.625.728 1.625 1.625v2.5c0 .897-.727 1.625-1.625 1.625h-3.5A1.625 1.625 0 0 1 10.875 7.5zm1.625-.375a.375.375 0 0 0-.375.375v2.5c0 .207.168.375.375.375H16a.375.375 0 0 0 .375-.375V5A.375.375 0 0 0 16 4.625zm0 6.25c-.898 0-1.625.727-1.625 1.625V15c0 .898.727 1.625 1.625 1.625H16c.898 0 1.625-.727 1.625-1.625v-2.5c0-.898-.727-1.625-1.625-1.625zm-.375 1.625c0-.207.168-.375.375-.375H16c.207 0 .375.168.375.375V15a.375.375 0 0 1-.375.375h-3.5a.375.375 0 0 1-.375-.375z" />
    </svg>
  );
}

export function IconList() {
  return (
    <svg viewBox="0 0 20 20" className={cn("w-5 h-5")} fill="currentColor">
      <path d="M7 4.375a.625.625 0 1 0 0 1.25h10.1a.625.625 0 1 0 0-1.25zm0 5a.625.625 0 1 0 0 1.25h10.1a.625.625 0 1 0 0-1.25zM6.375 15c0-.345.28-.625.625-.625h10.1a.625.625 0 1 1 0 1.25H7A.625.625 0 0 1 6.375 15M2.9 9.375a.625.625 0 1 0 0 1.25h1.5a.625.625 0 1 0 0-1.25zM2.275 5c0-.345.28-.625.625-.625h1.5a.625.625 0 1 1 0 1.25H2.9A.625.625 0 0 1 2.275 5m.625 9.375a.625.625 0 1 0 0 1.25h1.5a.625.625 0 1 0 0-1.25z" />
    </svg>
  );
}

export function IconH5() {
  return (
    <svg viewBox="0 0 20 20" className={cn("w-5 h-5")} fill="currentColor">
      <text x="13" y="15" fontSize="10" fontWeight="bold" textAnchor="middle">H5</text>
      <path d="M2.877 4.2c.346 0 .625.28.625.625V9.15h5.4V4.825a.625.625 0 0 1 1.25 0v10.35a.625.625 0 0 1-1.25 0V10.4h-5.4v4.775a.625.625 0 0 1-1.25 0V4.825c0-.345.28-.625.625-.625" />
    </svg>
  );
}

export function IconH6() {
  return (
    <svg viewBox="0 0 20 20" className={cn("w-5 h-5")} fill="currentColor">
      <text x="13" y="15" fontSize="10" fontWeight="bold" textAnchor="middle">H6</text>
      <path d="M2.877 4.2c.346 0 .625.28.625.625V9.15h5.4V4.825a.625.625 0 0 1 1.25 0v10.35a.625.625 0 0 1-1.25 0V10.4h-5.4v4.775a.625.625 0 0 1-1.25 0V4.825c0-.345.28-.625.625-.625" />
    </svg>
  );
}

export function IconColumns() {
  return (
    <svg viewBox="0 0 20 20" className={cn("w-5 h-5")} fill="currentColor">
      <rect x="2" y="4" width="7" height="12" rx="1" opacity="0.6" />
      <rect x="11" y="4" width="7" height="12" rx="1" opacity="0.6" />
    </svg>
  );
}

export function IconTOC() {
  return (
    <svg viewBox="0 0 20 20" className={cn("w-5 h-5")} fill="currentColor">
      <path d="M3 5h14v1.25H3zm2 3.5h12v1.25H5zm2 3.5h10v1.25H7zm-4 3.5h14v1.25H3z" />
    </svg>
  );
}

export function IconEquation() {
  return (
    <svg viewBox="0 0 20 20" className={cn("w-5 h-5")} fill="currentColor">
      <text x="10" y="14" fontSize="12" fontStyle="italic" textAnchor="middle" fontFamily="serif">∑</text>
    </svg>
  );
}

export function IconSpacer() {
  return (
    <svg viewBox="0 0 20 20" className={cn("w-5 h-5")} fill="currentColor">
      <path d="M3 6h14v1H3zm0 7h14v1H3z" opacity="0.4" />
      <path d="M10 8v4M8 9.5l2-2 2 2M8 10.5l2 2 2-2" stroke="currentColor" fill="none" strokeWidth="1" />
    </svg>
  );
}

export function IconEmbed() {
  return (
    <svg viewBox="0 0 20 20" className={cn("w-5 h-5")} fill="currentColor">
      <path d="M4.5 3.375A2.125 2.125 0 0 0 2.375 5.5v9c0 1.174.951 2.125 2.125 2.125h11a2.125 2.125 0 0 0 2.125-2.125v-9A2.125 2.125 0 0 0 15.5 3.375zM3.625 5.5c0-.483.392-.875.875-.875h11c.483 0 .875.392.875.875v9a.875.875 0 0 1-.875.875h-11a.875.875 0 0 1-.875-.875zm4.216 2.342a.625.625 0 0 1 0 .884L6.183 10.384l1.658 1.658a.625.625 0 1 1-.884.884l-2.1-2.1a.625.625 0 0 1 0-.884l2.1-2.1a.625.625 0 0 1 .884 0m4.318 0a.625.625 0 0 1 .884 0l2.1 2.1a.625.625 0 0 1 0 .884l-2.1 2.1a.625.625 0 1 1-.884-.884l1.658-1.658-1.658-1.658a.625.625 0 0 1 0-.884" />
    </svg>
  );
}

export function IconBreadcrumb() {
  return (
    <svg viewBox="0 0 20 20" className={cn("w-5 h-5")} fill="currentColor">
      <path d="M3 9.375h3.5l1.5 1.25-1.5 1.25H3zm5 0h3.5l1.5 1.25-1.5 1.25H8zm5-1h3.5l1.5 2.25-1.5 2.25H13z" opacity="0.6" />
    </svg>
  );
}
