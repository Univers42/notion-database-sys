/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   colors.ts                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:39:54 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/01 16:39:55 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ═══════════════════════════════════════════════════════════════════════════════
// Random-color helpers shared by Select / MultiSelect editors
// ═══════════════════════════════════════════════════════════════════════════════

/** Tag-color palette used when creating new select options. */
export const TAG_COLORS = [
  'bg-danger-surface-muted text-danger-text-tag',
  'bg-accent-muted text-accent-text-bold',
  'bg-success-surface-muted text-success-text-tag',
  'bg-warning-surface-muted text-warning-text-tag',
  'bg-purple-surface-muted text-purple-text-tag',
  'bg-pink-surface-muted text-pink-text-tag',
  'bg-cyan-surface-muted text-cyan-text-tag',
  'bg-orange-surface-muted text-orange-text-tag',
] as const;

/** Pick a random color from the palette. */
export function randomTagColor(): string {
  return TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];
}
