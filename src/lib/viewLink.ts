/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   viewLink.ts                                        :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/06/10 12:00:00 by dlesieur          #+#    #+#             */
/*                                                +#+#+#+#+#+   +#+           */
/* ************************************************************************** */

/**
 * "Copy link to view": the current URL with `view=<viewId>` — surfaces that
 * accept the param (the app's ?home=database Home) activate that view on
 * load; on other surfaces the link still lands on the same page. Pure
 * string-in/string-out core so it stays testable without a window.
 */

export function viewLinkFromHref(href: string, viewId: string): string {
  const url = new URL(href);
  url.searchParams.set('view', viewId);
  return url.toString();
}

/** The shareable link for a view + clipboard write. Resolves false when the
 *  clipboard is unavailable (caller keeps the row's idle label). */
export async function copyViewLink(viewId: string): Promise<boolean> {
  if (globalThis.window === undefined) return false;
  const link = viewLinkFromHref(globalThis.location.href, viewId);
  try {
    await globalThis.navigator.clipboard.writeText(link);
    return true;
  } catch {
    return false;
  }
}
