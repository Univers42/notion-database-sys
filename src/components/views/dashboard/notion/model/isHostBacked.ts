/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   isHostBacked.ts                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/10/27 00:00:00 by dlesieur          #+#    #+#             */
/*   Updated: 2026/10/27 00:00:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

// ─── isHostBacked — a widget that renders the dashboard's own records ───────
// A converted legacy widget keeps the host dashboard's viewId as its backing
// view, so it is "host-backed": it must never embed that view in itself.

import type { DashboardViewWidget } from '../../../../../types/database';

export function isHostBacked(
  widget: Readonly<{ viewId: string } & Partial<DashboardViewWidget>>,
  hostViewId: string,
): boolean {
  return Boolean(widget) && widget.viewId === hostViewId;
}
